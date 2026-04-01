# Research Notes

## Compression Algorithm Benchmarks (1MB HTML)

| Algorithm | Library | Ratio | Compress | Decompress | JS Size | WASM |
|-----------|---------|-------|----------|------------|---------|------|
| DEFLATE | fflate | 79% | 40ms | 10ms | 8KB | No |
| Gzip | CompressionStream | 79% | 20ms | 5ms | 0KB | No |
| Brotli | brotli-wasm | 84% | 1200ms | 10ms | 138KB | Yes |
| Zstandard | zstd-wasm | 79% | 10ms | 5ms | 139KB | Yes |
| LZMA | lzma-js | 85% | 5000ms | 500ms | 25KB | No |
| LZ4 | lz4-wasm | 55% | 5ms | 3ms | 14KB | Varies |

## Why We Rejected Each Alternative

### Brotli
- +5% better ratio but 138KB WASM bundle
- Chrome extension CSP may block WASM execution
- Compression at high quality is 30x slower than DEFLATE
- Would require loading WASM asynchronously, complicating initialization
- For 200KB HTML: saves ~10KB vs DEFLATE, but costs 138KB in bundle

### Zstandard
- Same ratio as DEFLATE (~79%) with faster compression
- 139KB WASM bundle -- same CSP/bundle issues as Brotli
- Browser CompressionStream may add zstd support in future (reserved in our format)
- Not worth the WASM overhead for equivalent ratios

### LZMA
- Best ratio (~85%) but compression is 125x slower than DEFLATE
- 5 seconds for 1MB HTML is unacceptable for real-time capture
- Decompression is also slow (500ms vs 10ms)
- Only viable for offline batch processing

### LZ4
- Very fast but poor ratio (55% vs 79%)
- For a 200KB HTML: 90KB output vs 42KB with DEFLATE
- Speed is not our bottleneck; bandwidth is

### lz-string
- Designed for localStorage, not network transport
- Inferior ratios to DEFLATE-based algorithms
- Outputs UTF-16 strings, not compact binary

## HTML Minification Impact

Minification before compression consistently improves final compressed size by 3-6%:

| Stage | Size (200KB raw HTML) |
|-------|----------------------|
| Raw HTML | 200KB |
| After minification | ~170KB (-15%) |
| After DEFLATE (raw only) | ~42KB (-79%) |
| After minification + DEFLATE | ~38KB (-81%) |

The improvement comes from minification reducing entropy: whitespace and comments are low-entropy content that compression handles, but their removal also allows compression to find longer matches in the remaining content.

## Browser CompressionStream Support

- Available since 2023 in all major browsers
- Chrome 80+, Firefox 113+, Safari 16.4+, Edge 80+
- ~95% global user coverage
- Supports: `"gzip"`, `"deflate"`, `"deflate-raw"`
- Does NOT support: Brotli, Zstd, custom dictionaries, compression levels
- 2x faster than fflate (native implementation)

## Rust Ecosystem for Decompression

| Crate | Algorithm | Backend | Status |
|-------|-----------|---------|--------|
| `flate2` | DEFLATE/gzip | miniz_oxide (pure Rust) or zlib-ng | Very mature, rust-lang org |
| `brotli` | Brotli | Pure Rust | Mature (Dropbox) |
| `zstd` | Zstandard | FFI to C libzstd | Very mature |
| `lz4_flex` | LZ4 | Pure Rust | Mature, 2+ GB/s |
| `crc32fast` | CRC32 | Pure Rust + SIMD | Very mature |

`flate2` with `miniz_oxide` backend is our choice: pure Rust, no C deps, no_std possible, battle-tested.

## Key Sources

- fflate benchmarks: github.com/101arrowz/fflate
- WASM compression benchmarks: nickb.dev/blog/wasm-compression-benchmarks
- Brotli vs Gzip: debugbear.com/blog/http-compression-gzip-brotli
- Dictionary compression: httptoolkit.com/blog/dictionary-compression-performance-zstd-brotli
- CompressionStream MDN: developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API
- Rust compression comparison: git.sr.ht/~quf/rust-compression-comparison
