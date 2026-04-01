## 1. Decompression Engine
- [ ] 1.1 Implement `DecompressionStream` feature detection
- [ ] 1.2 Implement native gzip decompression wrapper using `DecompressionStream` API
- [ ] 1.3 Implement fflate inflate/gunzip fallback
- [ ] 1.4 Implement unified `decompress(data: Uint8Array, algorithm: CompressionAlgorithm): Promise<Uint8Array>`

## 2. Unpack Function
- [ ] 2.1 Implement `unpack()`: decode packet via decoder -> decompress body -> decode UTF-8 -> return UnpackResult
- [ ] 2.2 Implement CRC32 verification: compute CRC32 of decompressed HTML, compare with packet checksum
- [ ] 2.3 Implement `checksumValid` field: true if matches, false if mismatch, undefined if no checksum in packet
- [ ] 2.4 Implement `verifyChecksum` option: when false, skip CRC32 check for speed
- [ ] 2.5 Implement `readHeaders()`: use decoder's readHeaders to parse only metadata, skip body entirely
- [ ] 2.6 Implement `headersOnly` option on `unpack()`: returns result with empty html string

## 3. Error Handling
- [ ] 3.1 Define error types: `InvalidMagicError`, `UnsupportedVersionError`, `ChecksumMismatchError`, `DecompressionError`, `TruncatedPacketError`
- [ ] 3.2 Each error includes descriptive message with context (expected vs actual values)
- [ ] 3.3 Truncated packet detection: verify minimum packet size, verify header length doesn't exceed data

## 4. Package Setup
- [ ] 4.1 Create `packages/decompressor-ts/package.json` with dependency on `@hpack-html/core` and `fflate`
- [ ] 4.2 Configure tsup for ESM + CJS output
- [ ] 4.3 Set target: ES2020

## 5. Testing
- [ ] 5.1 Round-trip tests: pack() -> unpack() -> verify HTML matches original (multiple HTML samples)
- [ ] 5.2 Round-trip tests: verify all metadata fields survive roundtrip (url, etag, signature, custom, timestamp)
- [ ] 5.3 CRC32 tests: valid checksum passes, corrupted body fails, no checksum returns undefined
- [ ] 5.4 Error tests: invalid magic bytes throws InvalidMagicError
- [ ] 5.5 Error tests: unsupported version throws UnsupportedVersionError
- [ ] 5.6 Error tests: truncated packet throws TruncatedPacketError
- [ ] 5.7 Error tests: corrupted compressed data throws DecompressionError
- [ ] 5.8 readHeaders() tests: returns metadata, html field is empty
- [ ] 5.9 Golden file tests: decode pre-built .hpack fixtures from Phase 2
- [ ] 5.10 Verify 95%+ code coverage

## 6. Finalization
- [ ] 6.1 Export `unpack` and `readHeaders` from package public API
- [ ] 6.2 Run type-check, lint, all tests passing
