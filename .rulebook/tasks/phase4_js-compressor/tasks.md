## 1. Compression Engine
- [x] 1.1 Implement `CompressionStream` feature detection
- [x] 1.2 Implement native gzip compression wrapper using `CompressionStream` API
- [x] 1.3 Implement fflate raw deflate fallback
- [x] 1.4 Implement compression level presets: fast=1, default=6, max=9
- [x] 1.5 Implement unified `compress()` that selects engine automatically

## 2. Pack Function
- [x] 2.1 Implement input validation: require `url` string
- [x] 2.2 Implement `pack()` pipeline: validate -> minify -> compress -> encode packet
- [x] 2.3 Set default options: `minify=true`, `checksum=true`, `level='default'`, `timestamp=Date.now()`
- [x] 2.4 Wire flags byte: minified, checksum, compression algorithm bits
- [x] 2.5 Compute CRC32 of uncompressed HTML when checksum=true
- [x] 2.6 Assemble final packet via encoder from `@hpack-html/core`

## 3. Package Setup
- [x] 3.1 Create `packages/compressor/package.json` with deps on core + fflate
- [x] 3.2 Configure tsup for ESM + CJS + DTS output
- [x] 3.3 Set target: ES2020

## 4. Testing
- [x] 4.1 Integration tests: pack produces valid .hpack starting with magic bytes
- [x] 4.2 Integration tests: all metadata fields roundtrip (url, etag, signature, custom, timestamp)
- [x] 4.3 Integration tests: minify=true removes comments and collapses whitespace
- [x] 4.4 Integration tests: minify=false preserves original HTML
- [x] 4.5 Integration tests: CRC32 checksum present/absent based on option
- [x] 4.6 Integration tests: compression level presets (fast < max in size)
- [x] 4.7 Integration tests: empty HTML, large HTML, Unicode content
- [x] 4.8 Error test: missing url throws
- [x] 4.9 All 15 pack tests passing <!-- total: 156 tests across all packages -->
