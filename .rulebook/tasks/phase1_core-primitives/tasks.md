## 1. Project Setup
- [x] 1.1 Initialize monorepo root (package.json, tsconfig.json, workspaces)
- [x] 1.2 Configure Vitest for testing
- [x] 1.3 Configure tsup for bundling
- [x] 1.4 Create `packages/core/` package structure with package.json

## 2. VarInt Implementation
- [x] 2.1 Implement `encodeVarInt(value: number): Uint8Array`
- [x] 2.2 Implement `decodeVarInt(data: Uint8Array, offset: number): { value: number, bytesRead: number }`
- [x] 2.3 Handle edge cases: 0, 127, 128, 16384, max safe integer
- [x] 2.4 Add overflow protection (reject values > 2^49 - 1)

## 3. CRC32 Implementation
- [x] 3.1 Implement CRC32 lookup table generation (IEEE 802.3 polynomial)
- [x] 3.2 Implement `crc32(data: Uint8Array): number`
- [x] 3.3 Validate against RFC 3720 known test vectors

## 4. Format Constants
- [x] 4.1 Define magic bytes constant: `0x89 0x48 0x50 0x4B`
- [x] 4.2 Define version constant: `0x01`
- [x] 4.3 Define flag bit masks (minified, checksum, compression algorithm)
- [x] 4.4 Define field type constants (URL=0x01, ETag=0x02, Signature=0x03, ContentType=0x04, Timestamp=0x05, Encoding=0x06)
- [x] 4.5 Define custom field range (0x10-0xFF)

## 5. Shared Types
- [x] 5.1 Define `PackOptions` interface
- [x] 5.2 Define `UnpackResult` interface
- [x] 5.3 Define `CompressionAlgorithm` type (deflate, gzip)
- [x] 5.4 Define `HeaderField` interface with all known field types
- [x] 5.5 Define flags helper functions (encodeFlags/decodeFlags)

## 6. Testing
- [x] 6.1 VarInt unit tests: encode/decode roundtrip for all edge values <!-- 39 tests -->
- [x] 6.2 CRC32 unit tests: known test vectors from RFC 3720 <!-- 9 tests -->
- [x] 6.3 Format constants unit tests: validate magic bytes, flag bit operations <!-- 21 tests -->
- [x] 6.4 Types compilation test: verify all types export correctly
- [x] 6.5 Verify 100% code coverage on all core modules <!-- 100% stmts, branches, funcs, lines -->

## 7. Package Finalization
- [x] 7.1 Configure package exports (ESM + CJS + DTS)
- [x] 7.2 Verify zero external dependencies
- [x] 7.3 Run type-check, lint, and all tests passing <!-- 69 tests, 100% coverage -->
