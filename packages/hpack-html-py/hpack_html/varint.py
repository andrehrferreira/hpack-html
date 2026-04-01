"""Protobuf-style variable-length integer encoding/decoding."""

MAX_VARINT_BYTES = 7


def encode_varint(value: int) -> bytes:
    """Encode an unsigned integer as a VarInt byte sequence."""
    if value < 0:
        raise ValueError(f"VarInt value must be non-negative, got {value}")
    if value == 0:
        return b"\x00"

    result = bytearray()
    remaining = value
    while remaining > 0:
        byte = remaining & 0x7F
        remaining >>= 7
        if remaining > 0:
            byte |= 0x80
        result.append(byte)
    return bytes(result)


def decode_varint(data: bytes | bytearray | memoryview, offset: int) -> tuple[int, int]:
    """Decode a VarInt from data at offset. Returns (value, bytes_read)."""
    if offset < 0 or offset >= len(data):
        raise ValueError(f"VarInt offset out of bounds: {offset} (data length: {len(data)})")

    value = 0
    shift = 0
    bytes_read = 0

    while True:
        pos = offset + bytes_read
        if pos >= len(data):
            raise ValueError(f"VarInt truncated at offset {offset} (read {bytes_read} bytes)")

        byte = data[pos]
        bytes_read += 1
        value |= (byte & 0x7F) << shift
        shift += 7

        if byte & 0x80 == 0:
            break
        if bytes_read >= MAX_VARINT_BYTES:
            raise ValueError(f"VarInt exceeds maximum of {MAX_VARINT_BYTES} bytes")

    return value, bytes_read
