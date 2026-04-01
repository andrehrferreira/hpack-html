"""Tests for hpack-html Python SDK."""

import hashlib
import json
import os
from pathlib import Path

import pytest

from hpack_html import (
    unpack, unpack_headers, pack, PackOptions, UnpackOptions,
    InvalidMagicError, UnsupportedVersionError, TruncatedPacketError,
    ChecksumMismatchError, DecompressionError,
)
from hpack_html.varint import encode_varint, decode_varint

FIXTURES_DIR = Path(__file__).parent.parent.parent / "test-vectors" / "fixtures"


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# VarInt
# ---------------------------------------------------------------------------

class TestVarInt:
    def test_roundtrip_values(self):
        for value in [0, 1, 127, 128, 300, 16384, 65535, 1048576]:
            encoded = encode_varint(value)
            decoded, n = decode_varint(encoded, 0)
            assert decoded == value
            assert n == len(encoded)

    def test_negative_raises(self):
        with pytest.raises(ValueError):
            encode_varint(-1)

    def test_truncated_raises(self):
        with pytest.raises(ValueError):
            decode_varint(bytes([0x80]), 0)

    def test_out_of_bounds(self):
        with pytest.raises(ValueError):
            decode_varint(b"", 0)


# ---------------------------------------------------------------------------
# Pack/Unpack roundtrip
# ---------------------------------------------------------------------------

class TestRoundtrip:
    def test_simple(self):
        html = "<h1>Hello World</h1>"
        packed = pack(html, PackOptions(url="https://example.com", checksum=True))
        result = unpack(packed)
        assert result.url == "https://example.com"
        assert result.html == html
        assert result.checksum_valid is True

    def test_all_metadata(self):
        packed = pack("<p>test</p>", PackOptions(
            url="https://example.com/page",
            etag='"abc123"',
            signature="sig-xyz",
            content_type="text/html",
            timestamp=1711929600000,
            encoding="utf-8",
            custom={"crawlerId": "bot-42"},
            checksum=True,
        ))
        result = unpack(packed)
        assert result.url == "https://example.com/page"
        assert result.etag == '"abc123"'
        assert result.signature == "sig-xyz"
        assert result.content_type == "text/html"
        assert result.timestamp == 1711929600000
        assert result.encoding == "utf-8"
        assert result.custom == {"crawlerId": "bot-42"}

    def test_empty_html(self):
        packed = pack("", PackOptions(url="https://example.com", checksum=True))
        result = unpack(packed)
        assert result.html == ""

    def test_unicode(self):
        html = "<p>日本語 🌍 مرحبا</p>"
        packed = pack(html, PackOptions(url="https://example.com/日本語", checksum=True))
        result = unpack(packed)
        assert result.html == html
        assert result.url == "https://example.com/日本語"

    def test_no_checksum(self):
        packed = pack("<p>test</p>", PackOptions(url="https://example.com", checksum=False))
        result = unpack(packed)
        assert result.checksum_valid is None

    def test_headers_only(self):
        packed = pack("<p>big</p>", PackOptions(url="https://example.com"))
        result = unpack(packed, UnpackOptions(headers_only=True))
        assert result.url == "https://example.com"
        assert result.html == ""

    def test_unpack_headers(self):
        packed = pack("<p>x</p>", PackOptions(url="https://example.com", etag='"e"'))
        result = unpack_headers(packed)
        assert result.url == "https://example.com"
        assert result.etag == '"e"'
        assert result.html == ""


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

class TestErrors:
    def test_invalid_magic(self):
        packed = bytearray(pack("<p>test</p>", PackOptions(url="https://example.com")))
        packed[0] = 0x00
        with pytest.raises(InvalidMagicError):
            unpack(bytes(packed))

    def test_bad_version(self):
        packed = bytearray(pack("<p>test</p>", PackOptions(url="https://example.com")))
        packed[4] = 0x99
        with pytest.raises(UnsupportedVersionError):
            unpack(bytes(packed))

    def test_truncated(self):
        with pytest.raises(TruncatedPacketError):
            unpack(b"\x89\x48\x50")

    def test_corrupted_crc32(self):
        packed = bytearray(pack("<p>test</p>", PackOptions(url="https://example.com", checksum=True)))
        packed[-1] ^= 0xFF
        packed[-2] ^= 0xFF
        with pytest.raises(ChecksumMismatchError):
            unpack(bytes(packed))

    def test_missing_url(self):
        with pytest.raises(ValueError):
            pack("<p>test</p>", PackOptions(url=""))


# ---------------------------------------------------------------------------
# Cross-SDK validation (canonical test vectors)
# ---------------------------------------------------------------------------

class TestCrossSDK:
    @pytest.fixture(params=sorted(FIXTURES_DIR.glob("*.hpack")) if FIXTURES_DIR.exists() else [])
    def vector(self, request):
        hpack_path = request.param
        json_path = hpack_path.with_suffix(".json")
        if not json_path.exists():
            pytest.skip(f"No .json for {hpack_path.name}")
        return hpack_path, json_path

    def test_vector(self, vector):
        hpack_path, json_path = vector
        name = hpack_path.stem

        data = hpack_path.read_bytes()
        expected = json.loads(json_path.read_text(encoding="utf-8"))

        result = unpack(data)

        assert result.url == expected["url"], f"{name}: url"
        assert result.etag == expected.get("etag"), f"{name}: etag"
        assert result.signature == expected.get("signature"), f"{name}: signature"
        assert result.content_type == expected.get("contentType"), f"{name}: contentType"
        assert result.timestamp == expected.get("timestamp"), f"{name}: timestamp"
        assert result.encoding == expected.get("encoding"), f"{name}: encoding"
        assert result.minified == expected["minified"], f"{name}: minified"

        expected_checksum = expected.get("checksumValid")
        assert result.checksum_valid == expected_checksum, f"{name}: checksumValid"

        html_hash = sha256_hex(result.html)
        assert html_hash == expected["htmlSha256"], f"{name}: HTML SHA256 mismatch"

        if expected.get("custom"):
            for key, val in expected["custom"].items():
                assert result.custom is not None and result.custom.get(key) == val, f"{name}: custom.{key}"
