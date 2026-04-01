## 1. Project Setup
- [ ] 1.1 Create `packages/decompressor-rust/Cargo.toml` with `flate2` (miniz_oxide backend) and `crc32fast` deps
- [ ] 1.2 Create module structure: `lib.rs`, `varint.rs`, `decoder.rs`, `decompress.rs`, `error.rs`
- [ ] 1.3 Define public API: `unpack()`, `unpack_with_options()`, `read_headers()`

## 2. VarInt Implementation
- [ ] 2.1 Implement `decode_varint(data: &[u8], offset: usize) -> Result<(u64, usize), Error>`
- [ ] 2.2 Handle overflow protection (reject > 7 bytes / > 2^49-1)
- [ ] 2.3 Handle truncated input (not enough bytes for continuation)

## 3. Packet Decoder
- [ ] 3.1 Implement magic bytes validation (`0x89 0x48 0x50 0x4B`)
- [ ] 3.2 Implement version byte check (reject != 0x01)
- [ ] 3.3 Implement flags byte parsing (minified, checksum, compression algorithm)
- [ ] 3.4 Implement header section parsing (header length, field count, field deserialization)
- [ ] 3.5 Implement known field types (URL, ETag, Signature, ContentType, Timestamp, Encoding)
- [ ] 3.6 Implement custom field parsing (0x10-0xFF with name + value)
- [ ] 3.7 Implement unknown field skip (forward compatibility)
- [ ] 3.8 Implement body extraction (uncompressed length, compressed data, optional CRC32)
- [ ] 3.9 Implement `read_headers()` that skips body using header length offset

## 4. Decompression
- [ ] 4.1 Implement raw DEFLATE decompression via `flate2::Decompress`
- [ ] 4.2 Implement gzip decompression via `flate2::read::GzDecoder`
- [ ] 4.3 Use uncompressed length from packet to pre-allocate output buffer
- [ ] 4.4 Implement CRC32 verification via `crc32fast` (compare with packet checksum)

## 5. Error Types
- [ ] 5.1 Define `Error` enum: `InvalidMagic`, `UnsupportedVersion`, `TruncatedPacket`, `InvalidHeader`, `DecompressionFailed`, `ChecksumMismatch`, `InvalidUtf8`
- [ ] 5.2 Implement `std::fmt::Display` and `std::error::Error` for all variants
- [ ] 5.3 Include context in errors (expected vs actual values)

## 6. Testing
- [ ] 6.1 VarInt unit tests: same test vectors as TypeScript (0, 127, 128, 300, 16384, max)
- [ ] 6.2 Decoder unit tests: valid packets, invalid magic, wrong version, truncated data
- [ ] 6.3 Decoder unit tests: all field types, custom fields, unknown fields skipped
- [ ] 6.4 Decompression unit tests: raw deflate, gzip, pre-allocated buffer correctness
- [ ] 6.5 CRC32 tests: valid checksum passes, corrupted body fails
- [ ] 6.6 Golden file tests: decode same .hpack fixtures as TypeScript SDK, verify byte-identical HTML output
- [ ] 6.7 `read_headers()` tests: returns metadata only, body not parsed
- [ ] 6.8 Benchmark: verify <1ms decompression for 100KB HTML

## 7. Finalization
- [ ] 7.1 Run `cargo test` all passing
- [ ] 7.2 Run `cargo clippy` zero warnings
- [ ] 7.3 Run `cargo fmt` formatted
- [ ] 7.4 Verify no C dependencies (pure Rust compilation)
