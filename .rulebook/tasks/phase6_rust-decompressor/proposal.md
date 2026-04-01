# Proposal: Rust Decompressor

## Why
The production server that ingests millions of crawled HTML pages needs a high-throughput decompressor. Rust provides sub-millisecond decompression times via `flate2` (pure Rust, no C deps). This crate must produce byte-identical output to the TypeScript decompressor for every .hpack packet.

## What Changes
- New `packages/decompressor-rust/` Rust crate
- VarInt decoder (port from TypeScript implementation)
- Packet decoder: magic validation, version check, flags parsing, header deserialization, body extraction
- DEFLATE/gzip decompression via `flate2` with `miniz_oxide` backend
- CRC32 verification via `crc32fast`
- Public API: `unpack()`, `unpack_with_options()`, `read_headers()`
- Error types: `InvalidMagic`, `UnsupportedVersion`, `ChecksumMismatch`, `DecompressionError`

## Impact
- Affected specs: SDK Design (docs/04-sdk-design.md), Binary Format (docs/02-binary-format.md)
- Affected code: `packages/decompressor-rust/`
- Breaking change: NO (greenfield)
- User benefit: Production-grade decompression at >1 million packets/sec on a single core
