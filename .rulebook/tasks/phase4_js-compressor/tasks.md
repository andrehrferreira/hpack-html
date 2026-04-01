## 1. Compression Engine
- [ ] 1.1 Implement `CompressionStream` feature detection (check `typeof CompressionStream !== 'undefined'`)
- [ ] 1.2 Implement native gzip compression wrapper using `CompressionStream` API
- [ ] 1.3 Implement fflate raw deflate fallback with dynamic import (lazy-load to avoid bundle cost when native is available)
- [ ] 1.4 Implement compression level presets: fast=1, default=6, max=9
- [ ] 1.5 Implement unified `compress(data: Uint8Array, level: CompressionLevel): Promise<Uint8Array>` that selects engine automatically

## 2. Pack Function
- [ ] 2.1 Implement input validation: require `url` string, validate options types
- [ ] 2.2 Implement `pack()` pipeline: validate -> minify (if enabled) -> compress -> encode packet
- [ ] 2.3 Set default options: `minify=true`, `checksum=true`, `level='default'`, `timestamp=Date.now()`
- [ ] 2.4 Wire flags byte: set minified bit, checksum bit, compression algorithm bits
- [ ] 2.5 Compute CRC32 of uncompressed HTML (after minification) when checksum=true
- [ ] 2.6 Assemble final packet via encoder from `@hpack-html/core`

## 3. Package Setup
- [ ] 3.1 Create `packages/compressor/package.json` with dependency on `@hpack-html/core` and `fflate`
- [ ] 3.2 Configure tsup for triple output: ESM (`index.esm.js`), CJS (`index.cjs.js`), UMD (`index.browser.js`)
- [ ] 3.3 Configure tree-shaking so fflate is only included when CompressionStream is unavailable
- [ ] 3.4 Set target: ES2020

## 4. Testing
- [ ] 4.1 Unit tests: compress with native CompressionStream (mock if needed)
- [ ] 4.2 Unit tests: compress with fflate fallback
- [ ] 4.3 Unit tests: all compression level presets produce valid output
- [ ] 4.4 Unit tests: input validation rejects missing url, invalid options
- [ ] 4.5 Integration tests: pack real HTML (benchmark/sample.html), verify output starts with magic bytes
- [ ] 4.6 Integration tests: pack -> decode headers -> verify all metadata matches input
- [ ] 4.7 Integration tests: pack with all options (url, etag, signature, custom fields, timestamp)
- [ ] 4.8 Integration tests: pack with minify=false produces unminified compressed HTML
- [ ] 4.9 Benchmark: verify <10ms for 100KB HTML
- [ ] 4.10 Verify 95%+ code coverage

## 5. Bundle Verification
- [ ] 5.1 Build package and measure gzipped bundle size
- [ ] 5.2 Verify total bundle <15KB gzipped (core + compressor + fflate)
- [ ] 5.3 Verify ESM, CJS, and UMD outputs all work
- [ ] 5.4 Run type-check, lint, all tests passing
