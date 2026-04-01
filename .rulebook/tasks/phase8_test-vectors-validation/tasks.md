## 1. Generate Test Vectors
- [ ] 1.1 Create `packages/test-vectors/` directory structure
- [ ] 1.2 Generate `minimal.hpack` — `<h1>Hi</h1>` (< 100 bytes), all defaults
- [ ] 1.3 Generate `typical.hpack` — ~50KB real-world HTML page
- [ ] 1.4 Generate `large.hpack` — ~1MB HTML page
- [ ] 1.5 Generate `all-fields.hpack` — every header field type populated (URL, ETag, Signature, ContentType, Timestamp, Encoding)
- [ ] 1.6 Generate `custom-fields.hpack` — custom 0x10-0xFF fields with arbitrary key-value pairs
- [ ] 1.7 Generate `no-checksum.hpack` — checksum=false (flags bit 1 = 0)
- [ ] 1.8 Generate `no-minify.hpack` — minify=false (flags bit 0 = 0, raw HTML)
- [ ] 1.9 Generate `level-fast.hpack` — compression level 1
- [ ] 1.10 Generate `level-max.hpack` — compression level 9
- [ ] 1.11 Generate `unicode-heavy.hpack` — CJK, Arabic, emoji, Cyrillic content
- [ ] 1.12 Generate `empty-body.hpack` — empty HTML string
- [ ] 1.13 Generate `max-url.hpack` — 2KB URL to test large header fields

## 2. Expected Output Files
- [ ] 2.1 Create corresponding `.json` file for each `.hpack` with expected decode results
- [ ] 2.2 JSON files include: url, etag, signature, custom fields, html content (or hash for large files), version, flags, checksumValid
- [ ] 2.3 Document the generation process so vectors can be regenerated if format changes

## 3. Cross-SDK Validation
- [ ] 3.1 Write TypeScript validation script: decode each .hpack via TS decompressor, compare with expected JSON
- [ ] 3.2 Write Rust validation test: decode each .hpack via Rust decompressor, compare with expected JSON
- [ ] 3.3 Write Dart validation test: decode each .hpack via Dart SDK, compare with expected JSON
- [ ] 3.4 Cross-pack validation: pack in JS -> unpack in Rust, pack in Dart -> unpack in TS
- [ ] 3.5 Verify byte-exact HTML output: SHA-256 hash of decompressed HTML must match across all SDKs

## 4. CI Integration
- [ ] 4.1 Add test vector validation to GitHub Actions CI pipeline
- [ ] 4.2 CI blocks merge if any SDK fails any test vector
- [ ] 4.3 CI runs cross-SDK validation on every PR touching core, compressor, or any decompressor

## 5. Documentation
- [ ] 5.1 Document each test vector: what it covers, why it exists, expected behavior
- [ ] 5.2 Document how to add new test vectors
- [ ] 5.3 Document how to regenerate vectors after format changes
