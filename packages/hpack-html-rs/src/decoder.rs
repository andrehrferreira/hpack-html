use crate::varint::decode_varint;
use crate::Error;
use std::collections::HashMap;

// Format constants (must match TypeScript)
const MAGIC: [u8; 4] = [0x89, 0x48, 0x50, 0x4B];
const VERSION: u8 = 0x01;
const FLAG_MINIFIED: u8 = 1 << 0;
const FLAG_CHECKSUM: u8 = 1 << 1;
const FLAG_COMPRESSION_MASK: u8 = 0b00001100;
const FLAG_COMPRESSION_SHIFT: u8 = 2;
const CRC32_SIZE: usize = 4;
const MIN_PACKET_SIZE: usize = 7; // magic(4) + version(1) + flags(1) + headerLen(1)
const FIELD_CUSTOM_START: u8 = 0x10;

// Known field type IDs
const FIELD_URL: u8 = 0x01;
const FIELD_ETAG: u8 = 0x02;
const FIELD_SIGNATURE: u8 = 0x03;
const FIELD_CONTENT_TYPE: u8 = 0x04;
const FIELD_TIMESTAMP: u8 = 0x05;
const FIELD_ENCODING: u8 = 0x06;

/// Compression algorithm.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompressionAlgorithm {
    Deflate,
    Gzip,
}

/// Result of unpacking an .hpack packet.
#[derive(Debug)]
pub struct UnpackResult {
    pub url: String,
    pub etag: Option<String>,
    pub signature: Option<String>,
    pub content_type: Option<String>,
    pub timestamp: Option<u64>,
    pub encoding: Option<String>,
    pub custom: HashMap<String, String>,
    pub html: String,
    pub version: u8,
    pub minified: bool,
    pub compression: CompressionAlgorithm,
    pub checksum_valid: Option<bool>,
}

/// Options for unpacking.
pub struct UnpackOptions {
    pub verify_checksum: bool,
    pub headers_only: bool,
}

impl Default for UnpackOptions {
    fn default() -> Self {
        Self {
            verify_checksum: true,
            headers_only: false,
        }
    }
}

/// Internal decoded header field.
struct HeaderField {
    field_type: u8,
    name: Option<String>,
    value: String,
}

/// Decode the packet header and body structure.
#[allow(clippy::type_complexity)]
fn decode_packet(
    data: &[u8],
) -> Result<
    (
        u8,                   // version
        bool,                 // minified
        bool,                 // has_checksum
        CompressionAlgorithm, // compression
        Vec<HeaderField>,     // fields
        &[u8],                // compressed_body
        usize,                // uncompressed_length
        Option<u32>,          // crc32
    ),
    Error,
> {
    if data.len() < MIN_PACKET_SIZE {
        return Err(Error::TruncatedPacket(format!(
            "Packet too small: {} bytes (minimum: {})",
            data.len(),
            MIN_PACKET_SIZE
        )));
    }

    let mut offset = 0;

    // Magic
    if data[0..4] != MAGIC {
        return Err(Error::InvalidMagic);
    }
    offset += 4;

    // Version
    let version = data[offset];
    if version != VERSION {
        return Err(Error::UnsupportedVersion(version));
    }
    offset += 1;

    // Flags
    let flags_byte = data[offset];
    offset += 1;
    let minified = flags_byte & FLAG_MINIFIED != 0;
    let has_checksum = flags_byte & FLAG_CHECKSUM != 0;
    let compression_id = (flags_byte & FLAG_COMPRESSION_MASK) >> FLAG_COMPRESSION_SHIFT;
    let compression = match compression_id {
        1 => CompressionAlgorithm::Gzip,
        _ => CompressionAlgorithm::Deflate,
    };

    // Header length
    let (header_len, n) = decode_varint(data, offset)?;
    offset += n;
    let header_len = header_len as usize;
    let header_end = offset + header_len;

    if header_end > data.len() {
        return Err(Error::TruncatedPacket(
            "Header section extends beyond packet".into(),
        ));
    }

    // Field count
    let (field_count, n) = decode_varint(data, offset)?;
    offset += n;

    // Fields
    let mut fields = Vec::with_capacity(field_count as usize);
    for i in 0..field_count as usize {
        if offset >= header_end {
            return Err(Error::TruncatedPacket(format!(
                "Header field {} extends beyond header section",
                i
            )));
        }

        let field_type = data[offset];
        offset += 1;

        if field_type >= FIELD_CUSTOM_START {
            // Custom field
            if offset >= header_end {
                return Err(Error::TruncatedPacket(format!(
                    "Custom field {} name length missing",
                    i
                )));
            }
            let name_len = data[offset] as usize;
            offset += 1;

            if offset + name_len > header_end {
                return Err(Error::TruncatedPacket(format!(
                    "Custom field {} name truncated",
                    i
                )));
            }
            let name = String::from_utf8_lossy(&data[offset..offset + name_len]).into_owned();
            offset += name_len;

            let (value_len, n) = decode_varint(data, offset)?;
            offset += n;
            let value_len = value_len as usize;

            if offset + value_len > header_end {
                return Err(Error::TruncatedPacket(format!(
                    "Custom field {} value truncated",
                    i
                )));
            }
            let value = String::from_utf8_lossy(&data[offset..offset + value_len]).into_owned();
            offset += value_len;

            fields.push(HeaderField {
                field_type,
                name: Some(name),
                value,
            });
        } else {
            // Known field
            let (value_len, n) = decode_varint(data, offset)?;
            offset += n;
            let value_len = value_len as usize;

            if offset + value_len > header_end {
                return Err(Error::TruncatedPacket(format!(
                    "Field {} (type 0x{:02X}) value truncated",
                    i, field_type
                )));
            }
            let value = String::from_utf8_lossy(&data[offset..offset + value_len]).into_owned();
            offset += value_len;

            fields.push(HeaderField {
                field_type,
                name: None,
                value,
            });
        }
    }

    // Skip remaining header bytes
    offset = header_end;

    // Body section
    if offset >= data.len() {
        return Err(Error::TruncatedPacket("Body section missing".into()));
    }

    let (uncompressed_len, n) = decode_varint(data, offset)?;
    offset += n;

    let crc_size = if has_checksum { CRC32_SIZE } else { 0 };
    let compressed_body_end = data.len() - crc_size;

    if offset > compressed_body_end {
        return Err(Error::TruncatedPacket("Compressed body truncated".into()));
    }

    let compressed_body = &data[offset..compressed_body_end];

    let crc32 = if has_checksum {
        let crc_offset = compressed_body_end;
        if crc_offset + CRC32_SIZE > data.len() {
            return Err(Error::TruncatedPacket("CRC32 checksum truncated".into()));
        }
        Some(
            data[crc_offset] as u32
                | (data[crc_offset + 1] as u32) << 8
                | (data[crc_offset + 2] as u32) << 16
                | (data[crc_offset + 3] as u32) << 24,
        )
    } else {
        None
    };

    Ok((
        version,
        minified,
        has_checksum,
        compression,
        fields,
        compressed_body,
        uncompressed_len as usize,
        crc32,
    ))
}

/// Extract metadata from header fields.
#[allow(clippy::type_complexity)]
fn extract_fields(
    fields: &[HeaderField],
) -> (
    String,
    Option<String>,
    Option<String>,
    Option<String>,
    Option<u64>,
    Option<String>,
    HashMap<String, String>,
) {
    let mut url = String::new();
    let mut etag = None;
    let mut signature = None;
    let mut content_type = None;
    let mut timestamp = None;
    let mut encoding = None;
    let mut custom = HashMap::new();

    for field in fields {
        match field.field_type {
            FIELD_URL => url = field.value.clone(),
            FIELD_ETAG => etag = Some(field.value.clone()),
            FIELD_SIGNATURE => signature = Some(field.value.clone()),
            FIELD_CONTENT_TYPE => content_type = Some(field.value.clone()),
            FIELD_TIMESTAMP => timestamp = field.value.parse().ok(),
            FIELD_ENCODING => encoding = Some(field.value.clone()),
            t if t >= FIELD_CUSTOM_START => {
                if let Some(name) = &field.name {
                    custom.insert(name.clone(), field.value.clone());
                }
            }
            _ => {} // skip unknown known-range fields
        }
    }

    (
        url,
        etag,
        signature,
        content_type,
        timestamp,
        encoding,
        custom,
    )
}

/// Unpack an .hpack binary packet.
pub fn unpack(data: &[u8]) -> Result<UnpackResult, Error> {
    unpack_with_options(data, &UnpackOptions::default())
}

/// Unpack with options.
pub fn unpack_with_options(data: &[u8], options: &UnpackOptions) -> Result<UnpackResult, Error> {
    let (
        version,
        minified,
        _has_checksum,
        compression,
        fields,
        compressed_body,
        _uncompressed_len,
        crc32_value,
    ) = decode_packet(data)?;

    let (url, etag, signature, content_type, timestamp, encoding, custom) = extract_fields(&fields);

    if options.headers_only {
        return Ok(UnpackResult {
            url,
            etag,
            signature,
            content_type,
            timestamp,
            encoding,
            custom,
            html: String::new(),
            version,
            minified,
            compression,
            checksum_valid: None,
        });
    }

    // Decompress
    let decompressed = decompress(compressed_body, compression)?;

    // CRC32 verification
    let checksum_valid = if let Some(expected) = crc32_value {
        let actual = crc32fast::hash(&decompressed);
        if options.verify_checksum && actual != expected {
            return Err(Error::ChecksumMismatch { expected, actual });
        }
        Some(actual == expected)
    } else {
        None
    };

    let html = String::from_utf8(decompressed).map_err(Error::InvalidUtf8)?;

    Ok(UnpackResult {
        url,
        etag,
        signature,
        content_type,
        timestamp,
        encoding,
        custom,
        html,
        version,
        minified,
        compression,
        checksum_valid,
    })
}

/// Read only headers without decompressing the body.
pub fn read_headers(data: &[u8]) -> Result<UnpackResult, Error> {
    unpack_with_options(
        data,
        &UnpackOptions {
            verify_checksum: false,
            headers_only: true,
        },
    )
}

/// Decompress data based on the algorithm.
fn decompress(data: &[u8], algorithm: CompressionAlgorithm) -> Result<Vec<u8>, Error> {
    use std::io::Read;

    match algorithm {
        CompressionAlgorithm::Gzip => {
            let mut decoder = flate2::read::GzDecoder::new(data);
            let mut buf = Vec::new();
            decoder
                .read_to_end(&mut buf)
                .map_err(|e| Error::DecompressionFailed(e.to_string()))?;
            Ok(buf)
        }
        CompressionAlgorithm::Deflate => {
            let mut decoder = flate2::read::DeflateDecoder::new(data);
            let mut buf = Vec::new();
            decoder
                .read_to_end(&mut buf)
                .map_err(|e| Error::DecompressionFailed(e.to_string()))?;
            Ok(buf)
        }
    }
}
