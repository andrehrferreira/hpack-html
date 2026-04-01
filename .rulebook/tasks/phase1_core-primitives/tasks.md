## 1. Project Setup
- [ ] 1.1 Initialize monorepo root (package.json, tsconfig.json, workspaces)
- [ ] 1.2 Configure Vitest for testing
- [ ] 1.3 Configure tsup for bundling
- [ ] 1.4 Create `packages/core/` package structure with package.json

## 2. VarInt Implementation
- [ ] 2.1 Implement `encodeVarInt(value: number): Uint8Array`
- [ ] 2.2 Implement `decodeVarInt(data: Uint8Array, offset: number): { value: number, bytesRead: number }`
- [ ] 2.3 Handle edge cases: 0, 127, 128, 16384, max safe integer
- [ ] 2.4 Add overflow protection (reject values > 2^49 - 1)

## 3. CRC32 Implementation
- [ ] 3.1 Implement CRC32 lookup table generation (IEEE 802.3 polynomial)
- [ ] 3.2 Implement `crc32(data: Uint8Array): number`
- [ ] 3.3 Validate against RFC 3720 known test vectors

## 4. Format Constants
- [ ] 4.1 Define magic bytes constant: `0x89 0x48 0x50 0x4B`
- [ ] 4.2 Define version constant: `0x01`
- [ ] 4.3 Define flag bit masks (minified, checksum, compression algorithm)
- [ ] 4.4 Define field type constants (URL=0x01, ETag=0x02, Signature=0x03, ContentType=0x04, Timestamp=0x05, Encoding=0x06)
- [ ] 4.5 Define custom field range (0x10-0xFF)

## 5. Shared Types
- [ ] 5.1 Define `PackOptions` interface
- [ ] 5.2 Define `UnpackResult` interface
- [ ] 5.3 Define `CompressionAlgorithm` enum (Deflate, Gzip)
- [ ] 5.4 Define `FieldType` enum with all known field types
- [ ] 5.5 Define `HpackFlags` type with helper functions (encode/decode flags byte)

## 6. Testing
- [ ] 6.1 VarInt unit tests: encode/decode roundtrip for all edge values
- [ ] 6.2 CRC32 unit tests: known test vectors from RFC 3720
- [ ] 6.3 Format constants unit tests: validate magic bytes, flag bit operations
- [ ] 6.4 Types compilation test: verify all types export correctly
- [ ] 6.5 Verify 100% code coverage on all core modules

## 7. Package Finalization
- [ ] 7.1 Configure package exports (ESM + CJS)
- [ ] 7.2 Verify zero external dependencies
- [ ] 7.3 Run type-check, lint, and all tests passing
