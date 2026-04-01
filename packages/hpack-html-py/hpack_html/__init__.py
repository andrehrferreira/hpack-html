"""hpack-html: High-performance .hpack HTML packet decompressor for Python."""

from .decoder import (
    unpack,
    unpack_headers,
    UnpackResult,
    UnpackOptions,
    InvalidMagicError,
    UnsupportedVersionError,
    TruncatedPacketError,
    ChecksumMismatchError,
    DecompressionError,
)
from .encoder import pack, PackOptions

__all__ = [
    "unpack",
    "unpack_headers",
    "pack",
    "UnpackResult",
    "UnpackOptions",
    "PackOptions",
    "InvalidMagicError",
    "UnsupportedVersionError",
    "TruncatedPacketError",
    "ChecksumMismatchError",
    "DecompressionError",
]
