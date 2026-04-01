"""Packet decoder and unpack API."""

from __future__ import annotations

import gzip
import zlib
from dataclasses import dataclass, field
from typing import Optional

from .format import (
    MAGIC, MAGIC_SIZE, VERSION, CRC32_SIZE, MIN_PACKET_SIZE,
    FLAG_MINIFIED, FLAG_CHECKSUM, FLAG_COMPRESSION_MASK, FLAG_COMPRESSION_SHIFT,
    COMPRESSION_GZIP, FIELD_URL, FIELD_ETAG, FIELD_SIGNATURE,
    FIELD_CONTENT_TYPE, FIELD_TIMESTAMP, FIELD_ENCODING, FIELD_CUSTOM_START,
)
from .varint import decode_varint


# Errors
class InvalidMagicError(Exception):
    pass

class UnsupportedVersionError(Exception):
    def __init__(self, version: int):
        super().__init__(f"Unsupported version: {version}")
        self.version = version

class TruncatedPacketError(Exception):
    pass

class ChecksumMismatchError(Exception):
    def __init__(self, expected: int, actual: int):
        super().__init__(f"CRC32 mismatch: expected 0x{expected:08X}, got 0x{actual:08X}")
        self.expected = expected
        self.actual = actual

class DecompressionError(Exception):
    pass


@dataclass
class UnpackResult:
    url: str = ""
    etag: Optional[str] = None
    signature: Optional[str] = None
    content_type: Optional[str] = None
    timestamp: Optional[int] = None
    encoding: Optional[str] = None
    custom: Optional[dict[str, str]] = None
    html: str = ""
    version: int = 0
    minified: bool = False
    compression_algorithm: str = "deflate"
    checksum_valid: Optional[bool] = None


@dataclass
class UnpackOptions:
    verify_checksum: bool = True
    headers_only: bool = False


def _decode_packet(data: bytes | bytearray) -> dict:
    if len(data) < MIN_PACKET_SIZE:
        raise TruncatedPacketError(f"Packet too small: {len(data)} bytes")

    offset = 0

    # Magic
    if data[:MAGIC_SIZE] != MAGIC:
        raise InvalidMagicError()
    offset += MAGIC_SIZE

    # Version
    ver = data[offset]; offset += 1
    if ver != VERSION:
        raise UnsupportedVersionError(ver)

    # Flags
    flags_byte = data[offset]; offset += 1
    minified = bool(flags_byte & FLAG_MINIFIED)
    has_checksum = bool(flags_byte & FLAG_CHECKSUM)
    compression = (flags_byte & FLAG_COMPRESSION_MASK) >> FLAG_COMPRESSION_SHIFT

    # Header length
    header_len, n = decode_varint(data, offset); offset += n
    header_end = offset + header_len
    if header_end > len(data):
        raise TruncatedPacketError("Header section extends beyond packet")

    # Field count
    field_count, n = decode_varint(data, offset); offset += n

    # Fields
    fields: list[dict] = []
    for i in range(field_count):
        if offset >= header_end:
            raise TruncatedPacketError(f"Header field {i} extends beyond header")
        field_type = data[offset]; offset += 1

        if field_type >= FIELD_CUSTOM_START:
            if offset >= header_end:
                raise TruncatedPacketError(f"Custom field {i} name length missing")
            name_len = data[offset]; offset += 1
            if offset + name_len > header_end:
                raise TruncatedPacketError(f"Custom field {i} name truncated")
            name = data[offset:offset + name_len].decode("utf-8"); offset += name_len

            value_len, n = decode_varint(data, offset); offset += n
            if offset + value_len > header_end:
                raise TruncatedPacketError(f"Custom field {i} value truncated")
            value = data[offset:offset + value_len].decode("utf-8"); offset += value_len

            fields.append({"type": field_type, "name": name, "value": value})
        else:
            value_len, n = decode_varint(data, offset); offset += n
            if offset + value_len > header_end:
                raise TruncatedPacketError(f"Field {i} value truncated")
            value = data[offset:offset + value_len].decode("utf-8"); offset += value_len

            fields.append({"type": field_type, "value": value})

    offset = header_end

    # Body
    if offset >= len(data):
        raise TruncatedPacketError("Body section missing")

    uncompressed_len, n = decode_varint(data, offset); offset += n
    crc_size = CRC32_SIZE if has_checksum else 0
    body_end = len(data) - crc_size

    if offset > body_end:
        raise TruncatedPacketError("Compressed body truncated")

    compressed_body = data[offset:body_end]

    crc32_value = None
    if has_checksum:
        crc_off = body_end
        crc32_value = (
            data[crc_off]
            | (data[crc_off + 1] << 8)
            | (data[crc_off + 2] << 16)
            | (data[crc_off + 3] << 24)
        ) & 0xFFFFFFFF

    return {
        "version": ver,
        "minified": minified,
        "has_checksum": has_checksum,
        "compression": compression,
        "fields": fields,
        "compressed_body": compressed_body,
        "uncompressed_len": uncompressed_len,
        "crc32": crc32_value,
    }


def _extract_fields(fields: list[dict]) -> dict:
    result: dict = {"url": "", "etag": None, "signature": None, "content_type": None,
                    "timestamp": None, "encoding": None, "custom": None}
    for f in fields:
        ft = f["type"]
        if ft == FIELD_URL:
            result["url"] = f["value"]
        elif ft == FIELD_ETAG:
            result["etag"] = f["value"]
        elif ft == FIELD_SIGNATURE:
            result["signature"] = f["value"]
        elif ft == FIELD_CONTENT_TYPE:
            result["content_type"] = f["value"]
        elif ft == FIELD_TIMESTAMP:
            try:
                result["timestamp"] = int(f["value"])
            except ValueError:
                pass
        elif ft == FIELD_ENCODING:
            result["encoding"] = f["value"]
        elif ft >= FIELD_CUSTOM_START and "name" in f:
            if result["custom"] is None:
                result["custom"] = {}
            result["custom"][f["name"]] = f["value"]
    return result


def unpack(data: bytes | bytearray, options: UnpackOptions | None = None) -> UnpackResult:
    """Unpack an .hpack binary packet."""
    opts = options or UnpackOptions()
    packet = _decode_packet(data)
    meta = _extract_fields(packet["fields"])

    comp_algo = "gzip" if packet["compression"] == COMPRESSION_GZIP else "deflate"

    if opts.headers_only:
        return UnpackResult(
            **meta, html="", version=packet["version"],
            minified=packet["minified"], compression_algorithm=comp_algo,
        )

    # Decompress
    try:
        if packet["compression"] == COMPRESSION_GZIP:
            decompressed = gzip.decompress(packet["compressed_body"])
        else:
            decompressed = zlib.decompress(packet["compressed_body"], -15)
    except Exception as e:
        raise DecompressionError(str(e)) from e

    # CRC32
    checksum_valid = None
    if packet["has_checksum"] and packet["crc32"] is not None:
        actual = zlib.crc32(decompressed) & 0xFFFFFFFF
        if opts.verify_checksum and actual != packet["crc32"]:
            raise ChecksumMismatchError(packet["crc32"], actual)
        checksum_valid = actual == packet["crc32"]

    html = decompressed.decode("utf-8")

    return UnpackResult(
        **meta, html=html, version=packet["version"],
        minified=packet["minified"], compression_algorithm=comp_algo,
        checksum_valid=checksum_valid,
    )


def unpack_headers(data: bytes | bytearray) -> UnpackResult:
    """Read only headers without decompressing the body."""
    return unpack(data, UnpackOptions(headers_only=True))
