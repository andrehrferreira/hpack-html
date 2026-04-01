## 1. Encoder Implementation
- [x] 1.1 Implement header field serializer (field type byte + VarInt length + UTF-8 value)
- [x] 1.2 Implement custom field serializer (field type + name length + name + VarInt value length + value)
- [x] 1.3 Implement header section assembly (header length VarInt + field count VarInt + serialized fields)
- [x] 1.4 Implement packet assembly (magic + version + flags + header section + body section)
- [x] 1.5 Implement body section assembly (uncompressed length VarInt + compressed data + optional CRC32)
- [x] 1.6 Implement flags byte encoding from options (minified, checksum, compression algorithm)

## 2. Decoder Implementation
- [x] 2.1 Implement magic bytes validation (reject non-matching sequences)
- [x] 2.2 Implement version byte check (reject unsupported versions)
- [x] 2.3 Implement flags byte parsing (extract minified, checksum, compression algorithm)
- [x] 2.4 Implement header section parser (read header length, field count, deserialize fields)
- [x] 2.5 Implement known field type deserialization (URL, ETag, Signature, etc.)
- [x] 2.6 Implement custom field deserialization (0x10-0xFF with name + value)
- [x] 2.7 Implement unknown field skip (forward compatibility via headerEndOffset skip)
- [x] 2.8 Implement body extraction (read uncompressed length, extract compressed data, extract optional CRC32)
- [x] 2.9 Implement `decodeHeaders()` that returns only metadata without body

## 3. Testing
- [x] 3.1 Encoder unit tests: single field, multiple fields, all field types, custom fields
- [x] 3.2 Encoder unit tests: all flag combinations, empty body, large body, Unicode
- [x] 3.3 Decoder unit tests: valid packets, invalid magic, wrong version, truncated data
- [x] 3.4 Decoder unit tests: truncated fields, custom field truncation, header overflow
- [x] 3.5 Round-trip tests: encode -> decode -> verify all fields match for every field type combination
- [x] 3.6 `decodeHeaders()` tests: verify body is not returned, headers match full decode
- [x] 3.7 Verify 99%+ coverage on encoder and decoder <!-- 99.41% stmts, 96.55% branches -->

## 4. Finalization
- [x] 4.1 Export encoder and decoder from `packages/core/` public API
- [x] 4.2 Run type-check, build, all tests passing <!-- 98 tests, ESM+CJS+DTS build OK -->
