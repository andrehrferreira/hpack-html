## 1. Encoder Implementation
- [ ] 1.1 Implement header field serializer (field type byte + VarInt length + UTF-8 value)
- [ ] 1.2 Implement custom field serializer (field type + name length + name + VarInt value length + value)
- [ ] 1.3 Implement header section assembly (header length VarInt + field count VarInt + serialized fields)
- [ ] 1.4 Implement packet assembly (magic + version + flags + header section + body section)
- [ ] 1.5 Implement body section assembly (uncompressed length VarInt + compressed data + optional CRC32)
- [ ] 1.6 Implement flags byte encoding from options (minified, checksum, compression algorithm)

## 2. Decoder Implementation
- [ ] 2.1 Implement magic bytes validation (reject non-matching sequences)
- [ ] 2.2 Implement version byte check (reject unsupported versions)
- [ ] 2.3 Implement flags byte parsing (extract minified, checksum, compression algorithm)
- [ ] 2.4 Implement header section parser (read header length, field count, deserialize fields)
- [ ] 2.5 Implement known field type deserialization (URL, ETag, Signature, etc.)
- [ ] 2.6 Implement custom field deserialization (0x10-0xFF with name + value)
- [ ] 2.7 Implement unknown field skip (forward compatibility: skip fields with unknown type IDs)
- [ ] 2.8 Implement body extraction (read uncompressed length, extract compressed data, extract optional CRC32)
- [ ] 2.9 Implement `readHeaders()` that skips body decompression using header length to jump ahead

## 3. Testing
- [ ] 3.1 Encoder unit tests: single field, multiple fields, all field types, custom fields
- [ ] 3.2 Encoder unit tests: all flag combinations, empty body, large body
- [ ] 3.3 Decoder unit tests: valid packets, invalid magic, wrong version, truncated data
- [ ] 3.4 Decoder unit tests: unknown field types are skipped without error
- [ ] 3.5 Round-trip tests: encode -> decode -> verify all fields match for every field type combination
- [ ] 3.6 Create golden file fixtures (.hpack files with known content) for cross-SDK validation
- [ ] 3.7 `readHeaders()` tests: verify body is not parsed, headers match full decode
- [ ] 3.8 Verify 100% code coverage on encoder and decoder

## 4. Finalization
- [ ] 4.1 Export encoder and decoder from `packages/core/` public API
- [ ] 4.2 Run type-check, lint, all tests passing
