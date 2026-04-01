"""Format constants for the .hpack binary format."""

MAGIC = b"\x89\x48\x50\x4B"
MAGIC_SIZE = 4
VERSION = 0x01

FLAG_MINIFIED = 1 << 0
FLAG_CHECKSUM = 1 << 1
FLAG_COMPRESSION_MASK = 0x0C
FLAG_COMPRESSION_SHIFT = 2

COMPRESSION_DEFLATE = 0
COMPRESSION_GZIP = 1

FIELD_URL = 0x01
FIELD_ETAG = 0x02
FIELD_SIGNATURE = 0x03
FIELD_CONTENT_TYPE = 0x04
FIELD_TIMESTAMP = 0x05
FIELD_ENCODING = 0x06
FIELD_CUSTOM_START = 0x10

CRC32_SIZE = 4
MIN_PACKET_SIZE = MAGIC_SIZE + 1 + 1 + 1  # magic + version + flags + header_len


def encode_flags(minified: bool, checksum: bool, compression: int) -> int:
    flags = 0
    if minified:
        flags |= FLAG_MINIFIED
    if checksum:
        flags |= FLAG_CHECKSUM
    flags |= (compression & 0x03) << FLAG_COMPRESSION_SHIFT
    return flags


def decode_flags(flags: int) -> tuple[bool, bool, int]:
    """Returns (minified, checksum, compression)."""
    return (
        bool(flags & FLAG_MINIFIED),
        bool(flags & FLAG_CHECKSUM),
        (flags & FLAG_COMPRESSION_MASK) >> FLAG_COMPRESSION_SHIFT,
    )
