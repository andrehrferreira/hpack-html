# Proposal: Core Primitives

## Why
All SDKs (JS compressor, TS decompressor, Rust decompressor, Flutter/Dart) share the same binary format (.hpack). The core primitives (VarInt encoding, CRC32, magic bytes, field type constants, shared types) must be implemented first as the foundation for every other phase. Without these, no packet can be encoded or decoded.

## What Changes
- New `packages/core/` package with zero external dependencies
- VarInt encode/decode functions (protobuf-style variable-length integers)
- CRC32 computation (pure JS, IEEE 802.3 / ISO 3309 standard)
- Format constants: magic bytes (`0x89 0x48 0x50 0x4B`), version byte, flag bit definitions
- Field type constants and registry (URL=0x01, ETag=0x02, Signature=0x03, etc.)
- Shared TypeScript types (PackOptions, UnpackResult, CompressionAlgorithm, etc.)
- Monorepo initialization (TypeScript, Vitest, tsup bundler)

## Impact
- Affected specs: Binary format spec (docs/02-binary-format.md)
- Affected code: `packages/core/` (new package)
- Breaking change: NO (greenfield)
- User benefit: Foundation that enables all compression/decompression functionality
