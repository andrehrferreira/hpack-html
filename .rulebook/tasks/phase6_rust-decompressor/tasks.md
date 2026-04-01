## 1. Project Setup
- [x] 1.1 Create `packages/hpack-html-rs/Cargo.toml` with `flate2` (rust_backend) and `crc32fast`
- [x] 1.2 Create module structure: `lib.rs`, `varint.rs`, `decoder.rs`, `error.rs`
- [x] 1.3 Define public API: `unpack()`, `unpack_with_options()`, `read_headers()`

## 2. VarInt Implementation
- [x] 2.1 Implement `decode_varint(data: &[u8], offset: usize) -> Result<(u64, usize), Error>`
- [x] 2.2 Handle overflow protection (max 7 bytes)
- [x] 2.3 Handle truncated input

## 3. Packet Decoder
- [x] 3.1 Magic bytes validation
- [x] 3.2 Version byte check
- [x] 3.3 Flags byte parsing (minified, checksum, compression)
- [x] 3.4 Header section parsing (header length, field count, field deserialization)
- [x] 3.5 Known field types (URL, ETag, Signature, ContentType, Timestamp, Encoding)
- [x] 3.6 Custom field parsing (0x10-0xFF with name + value)
- [x] 3.7 Body extraction (uncompressed length, compressed data, optional CRC32)
- [x] 3.8 `read_headers()` via headers_only option

## 4. Decompression
- [x] 4.1 Raw DEFLATE decompression via `flate2::read::DeflateDecoder`
- [x] 4.2 Gzip decompression via `flate2::read::GzDecoder`
- [x] 4.3 CRC32 verification via `crc32fast`

## 5. Error Types
- [x] 5.1 `InvalidMagic`, `UnsupportedVersion`, `TruncatedPacket`, `DecompressionFailed`, `ChecksumMismatch`, `InvalidUtf8`
- [x] 5.2 `Display` and `Error` trait implementations

## 6. Testing
- [x] 6.1 VarInt unit tests (8 tests)
- [x] 6.2 Cross-SDK integration tests: decode JS-generated .hpack fixtures (10 tests)
- [x] 6.3 Test vectors: minimal, empty, unicode, no-checksum
- [x] 6.4 Error tests: invalid magic, bad version, truncated, corrupted CRC32, skip verify
- [x] 6.5 Doc-test compilation (1 test)

## 7. Quality
- [x] 7.1 `cargo test` — 19 tests passing
- [x] 7.2 `cargo clippy` — 0 warnings
- [x] 7.3 `cargo fmt` — formatted
- [x] 7.4 Pure Rust, no C dependencies (flate2 rust_backend)
