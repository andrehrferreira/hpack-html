# Proposal: Test Vectors & Cross-SDK Validation

## Why
Four independent SDK implementations (JS, TS, Rust, Dart) must produce and consume identical .hpack packets. A single bit difference in VarInt encoding, CRC32 computation, or header serialization would cause cross-SDK incompatibility. Shared golden test vectors are the only reliable way to guarantee interoperability. This phase creates the canonical test suite that all SDKs must pass.

## What Changes
- New `packages/test-vectors/` directory with pre-built .hpack files and expected-output JSON files
- 12+ test vectors covering: minimal HTML, typical pages, large pages, all field types, custom fields, with/without checksum, with/without minification, all compression levels, Unicode-heavy content, edge cases
- Cross-SDK validation scripts that run each test vector through all 4 SDKs
- CI integration to block releases if any SDK fails a test vector

## Impact
- Affected specs: All SDK specs
- Affected code: `packages/test-vectors/`, CI configuration
- Breaking change: NO
- User benefit: Guarantee that HTML packed by any SDK can be unpacked by any other SDK
