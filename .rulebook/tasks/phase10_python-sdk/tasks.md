## 1. Project Setup
- [ ] 1.1 Create `packages/hpack-html-py/` with `pyproject.toml` (hatch/setuptools)
- [ ] 1.2 Configure package metadata: name=`hpack-html`, version, author, license Apache-2.0
- [ ] 1.3 Set Python >=3.10, zero external dependencies
- [ ] 1.4 Create module structure: `hpack_html/__init__.py`, submodules

## 2. Core Primitives
- [ ] 2.1 Implement `hpack_html/varint.py`: `decode_varint(data, offset) -> (value, bytes_read)`
- [ ] 2.2 Implement `hpack_html/crc32.py`: wrapper around `zlib.crc32()` (stdlib)
- [ ] 2.3 Implement `hpack_html/format.py`: magic bytes, version, flags, field type constants

## 3. Packet Decoder
- [ ] 3.1 Implement `hpack_html/decoder.py`: magic validation, version check, flags parsing
- [ ] 3.2 Implement header section parsing (header length, field count, known + custom fields)
- [ ] 3.3 Implement body extraction (uncompressed length, compressed data, optional CRC32)
- [ ] 3.4 Implement error classes: `InvalidMagicError`, `UnsupportedVersionError`, `TruncatedPacketError`, `ChecksumMismatchError`, `DecompressionError`

## 4. Decompression
- [ ] 4.1 Implement raw DEFLATE decompression via `zlib.decompress(data, -15)` (raw deflate wbits)
- [ ] 4.2 Implement gzip decompression via `gzip.decompress()` or `zlib.decompress(data, 31)`
- [ ] 4.3 Implement CRC32 verification

## 5. Public API
- [ ] 5.1 Implement `unpack(data: bytes, verify_checksum=True, headers_only=False) -> UnpackResult`
- [ ] 5.2 Implement `unpack_headers(data: bytes) -> UnpackResult` (no decompression)
- [ ] 5.3 Define `UnpackResult` as TypedDict or dataclass (url, etag, signature, html, etc.)
- [ ] 5.4 Export from `hpack_html/__init__.py`

## 6. Optional: Pack Function
- [ ] 6.1 Implement `pack(html: str, url: str, **kwargs) -> bytes` for server-side re-packing
- [ ] 6.2 Implement VarInt encode, packet encoder, flags encoding
- [ ] 6.3 Compression via `zlib.compress()` (raw deflate)
- [ ] 6.4 No HTML minifier (use JS compressor for that)

## 7. Testing
- [ ] 7.1 VarInt unit tests (same test vectors as TS/Rust)
- [ ] 7.2 CRC32 unit tests (RFC 3720 check value)
- [ ] 7.3 Decoder unit tests (valid packets, errors)
- [ ] 7.4 Cross-SDK validation: decode all 14 canonical .hpack vectors, verify SHA256
- [ ] 7.5 Pack/unpack roundtrip tests (if pack is implemented)
- [ ] 7.6 Verify 95%+ coverage with pytest-cov

## 8. Package Files
- [ ] 8.1 README.md with install, usage, API reference
- [ ] 8.2 LICENSE (Apache-2.0)
- [ ] 8.3 Add Python job to `.github/workflows/ci.yml`
- [ ] 8.4 Add PyPI publish step to `.github/workflows/publish.yml`
