//! Protobuf-style variable-length integer decoding.
//! Maximum supported value: 2^49 - 1 (7 bytes).

/// Maximum number of bytes in a VarInt.
const MAX_VARINT_BYTES: usize = 7;

/// Decode a VarInt from a byte slice at the given offset.
/// Returns `(value, bytes_read)` or an error.
pub fn decode_varint(data: &[u8], offset: usize) -> Result<(u64, usize), crate::Error> {
    if offset >= data.len() {
        return Err(crate::Error::TruncatedPacket(format!(
            "VarInt offset out of bounds: {} (data length: {})",
            offset,
            data.len()
        )));
    }

    let mut value: u64 = 0;
    let mut shift: u32 = 0;
    let mut bytes_read: usize = 0;

    loop {
        let pos = offset + bytes_read;
        if pos >= data.len() {
            return Err(crate::Error::TruncatedPacket(format!(
                "VarInt truncated at offset {} (read {} bytes)",
                offset, bytes_read
            )));
        }

        let byte = data[pos];
        bytes_read += 1;

        value |= ((byte & 0x7F) as u64) << shift;
        shift += 7;

        if byte & 0x80 == 0 {
            break;
        }

        if bytes_read >= MAX_VARINT_BYTES {
            return Err(crate::Error::TruncatedPacket(format!(
                "VarInt exceeds maximum of {} bytes at offset {}",
                MAX_VARINT_BYTES, offset
            )));
        }
    }

    Ok((value, bytes_read))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_zero() {
        let (val, n) = decode_varint(&[0x00], 0).unwrap();
        assert_eq!(val, 0);
        assert_eq!(n, 1);
    }

    #[test]
    fn decode_127() {
        let (val, n) = decode_varint(&[0x7F], 0).unwrap();
        assert_eq!(val, 127);
        assert_eq!(n, 1);
    }

    #[test]
    fn decode_128() {
        let (val, n) = decode_varint(&[0x80, 0x01], 0).unwrap();
        assert_eq!(val, 128);
        assert_eq!(n, 2);
    }

    #[test]
    fn decode_300() {
        let (val, n) = decode_varint(&[0xAC, 0x02], 0).unwrap();
        assert_eq!(val, 300);
        assert_eq!(n, 2);
    }

    #[test]
    fn decode_16384() {
        let (val, n) = decode_varint(&[0x80, 0x80, 0x01], 0).unwrap();
        assert_eq!(val, 16384);
        assert_eq!(n, 3);
    }

    #[test]
    fn decode_with_offset() {
        let data = [0xFF, 0xFF, 0xFF, 0xAC, 0x02, 0xFF];
        let (val, n) = decode_varint(&data, 3).unwrap();
        assert_eq!(val, 300);
        assert_eq!(n, 2);
    }

    #[test]
    fn error_on_empty() {
        assert!(decode_varint(&[], 0).is_err());
    }

    #[test]
    fn error_on_truncated() {
        assert!(decode_varint(&[0x80], 0).is_err());
    }
}
