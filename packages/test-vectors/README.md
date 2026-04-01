# Test Vectors

Canonical `.hpack` test vectors for cross-SDK validation. Every SDK must produce byte-identical results (verified via SHA256) when decoding these vectors.

## Vectors

| Vector | Description | Size |
|--------|-------------|------|
| `minimal` | `<h1>Hello World</h1>`, no minification | 77B |
| `empty` | Empty HTML body | 57B |
| `unicode` | CJK, emoji, Arabic, Cyrillic, Latin accents | 116B |
| `no-checksum` | Packet without CRC32 | 82B |
| `all-fields` | Every standard header field populated | 232B |
| `custom-fields` | Multiple custom key-value fields | 173B |
| `minified` | HTML minification enabled | 115B |
| `large-url` | URL with 2000+ characters | 2KB |
| `level-fast` | Compression level 1 | 143B |
| `level-max` | Compression level 9 | 142B |
| `special-chars` | HTML entities, special chars in URL/body | 147B |
| `nested-html` | Nested table with optional tags removed | 102B |
| `real-hackernews` | Hacker News front page (~34KB raw) | 5.8KB |
| `real-wikipedia` | Wikipedia HTML article (~490KB raw) | 89.7KB |

## Validation Scripts

```bash
# Generate vectors (from JS compressor)
bun run packages/test-vectors/generate.ts

# Validate with TypeScript decompressor
bun run packages/test-vectors/validate-ts.ts

# Validate with Python decompressor
python packages/test-vectors/validate-py.py

# Validate with Go decompressor
bash packages/test-vectors/validate-go.sh

# Validate with Rust decompressor
bash packages/test-vectors/validate-rust.sh
```

## Adding New Vectors

1. Add the vector definition in `generate.ts`
2. Run `bun run packages/test-vectors/generate.ts`
3. Run all validation scripts
4. Commit the new `.hpack` + `.json` files
