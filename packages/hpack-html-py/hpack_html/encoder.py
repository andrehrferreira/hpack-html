"""Packet encoder and pack API."""

from __future__ import annotations

import time
import zlib
from dataclasses import dataclass, field
from typing import Optional

from .format import (
    MAGIC, VERSION, COMPRESSION_DEFLATE, CRC32_SIZE,
    FIELD_URL, FIELD_ETAG, FIELD_SIGNATURE, FIELD_CONTENT_TYPE,
    FIELD_TIMESTAMP, FIELD_ENCODING, FIELD_CUSTOM_START,
    encode_flags,
)
from .varint import encode_varint


@dataclass
class PackOptions:
    url: str = ""
    etag: Optional[str] = None
    signature: Optional[str] = None
    content_type: Optional[str] = None
    timestamp: Optional[int] = None
    encoding: Optional[str] = None
    custom: Optional[dict[str, str]] = None
    level: int = 6  # 1=fast, 6=default, 9=max
    minify: bool = False  # No minifier in Python SDK
    checksum: bool = True


def _encode_known_field(field_type: int, value: str) -> bytes:
    value_bytes = value.encode("utf-8")
    return bytes([field_type]) + encode_varint(len(value_bytes)) + value_bytes


def _encode_custom_field(field_type: int, name: str, value: str) -> bytes:
    name_bytes = name.encode("utf-8")
    value_bytes = value.encode("utf-8")
    return (
        bytes([field_type, len(name_bytes)])
        + name_bytes
        + encode_varint(len(value_bytes))
        + value_bytes
    )


def pack(html: str, options: PackOptions | None = None, **kwargs: object) -> bytes:
    """Pack HTML into an .hpack binary packet.

    Can be called as:
        pack(html, PackOptions(url="..."))
        pack(html, url="...", etag="...")
    """
    if options is None:
        options = PackOptions(**kwargs)  # type: ignore[arg-type]

    if not options.url:
        raise ValueError("PackOptions.url is required")

    html_bytes = html.encode("utf-8")

    # Compress (raw deflate)
    compressed = zlib.compress(html_bytes, options.level)[2:-4]  # strip zlib header/trailer for raw deflate

    # CRC32
    crc32_value = (zlib.crc32(html_bytes) & 0xFFFFFFFF) if options.checksum else None

    # Fields
    fields_data = bytearray()
    field_count = 0

    fields_data += _encode_known_field(FIELD_URL, options.url); field_count += 1

    if options.etag is not None:
        fields_data += _encode_known_field(FIELD_ETAG, options.etag); field_count += 1
    if options.signature is not None:
        fields_data += _encode_known_field(FIELD_SIGNATURE, options.signature); field_count += 1
    if options.content_type is not None:
        fields_data += _encode_known_field(FIELD_CONTENT_TYPE, options.content_type); field_count += 1

    ts = options.timestamp if options.timestamp is not None else int(time.time() * 1000)
    fields_data += _encode_known_field(FIELD_TIMESTAMP, str(ts)); field_count += 1

    if options.encoding is not None:
        fields_data += _encode_known_field(FIELD_ENCODING, options.encoding); field_count += 1

    if options.custom:
        custom_type = FIELD_CUSTOM_START
        for name, value in options.custom.items():
            fields_data += _encode_custom_field(custom_type, name, value)
            field_count += 1
            custom_type += 1

    # Header section
    field_count_bytes = encode_varint(field_count)
    header_content = field_count_bytes + bytes(fields_data)
    header_len_bytes = encode_varint(len(header_content))

    # Flags
    flags = encode_flags(options.minify, options.checksum, COMPRESSION_DEFLATE)

    # Assemble
    packet = bytearray()
    packet += MAGIC
    packet.append(VERSION)
    packet.append(flags)
    packet += header_len_bytes
    packet += header_content
    packet += encode_varint(len(html_bytes))
    packet += compressed

    if crc32_value is not None:
        packet.append(crc32_value & 0xFF)
        packet.append((crc32_value >> 8) & 0xFF)
        packet.append((crc32_value >> 16) & 0xFF)
        packet.append((crc32_value >> 24) & 0xFF)

    return bytes(packet)
