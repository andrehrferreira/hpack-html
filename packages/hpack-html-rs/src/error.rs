use std::fmt;

/// Errors that can occur when decoding an .hpack packet.
#[derive(Debug)]
pub enum Error {
    /// Magic bytes do not match `0x89 0x48 0x50 0x4B`.
    InvalidMagic,
    /// Packet version is not supported.
    UnsupportedVersion(u8),
    /// Packet data is truncated or malformed.
    TruncatedPacket(String),
    /// DEFLATE/gzip decompression failed.
    DecompressionFailed(String),
    /// CRC32 checksum does not match.
    ChecksumMismatch { expected: u32, actual: u32 },
    /// Decompressed bytes are not valid UTF-8.
    InvalidUtf8(std::string::FromUtf8Error),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::InvalidMagic => write!(f, "Invalid .hpack magic bytes"),
            Error::UnsupportedVersion(v) => write!(f, "Unsupported .hpack version: {}", v),
            Error::TruncatedPacket(msg) => write!(f, "Truncated packet: {}", msg),
            Error::DecompressionFailed(msg) => write!(f, "Decompression failed: {}", msg),
            Error::ChecksumMismatch { expected, actual } => {
                write!(
                    f,
                    "CRC32 mismatch: expected 0x{:08X}, got 0x{:08X}",
                    expected, actual
                )
            }
            Error::InvalidUtf8(e) => write!(f, "Invalid UTF-8 in decompressed HTML: {}", e),
        }
    }
}

impl std::error::Error for Error {}
