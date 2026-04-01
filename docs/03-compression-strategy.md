# Compression Strategy

## Research Summary

We evaluated six compression algorithms for browser-side HTML compression. Below are benchmarks on a ~1MB HTML file:

| Algorithm | Ratio (reduction) | Compress Time | Decompress Time | JS Bundle Size | WASM Required |
|-----------|-------------------|---------------|-----------------|----------------|---------------|
| DEFLATE (fflate) | ~79% | ~40ms | ~10ms | 8KB | No |
| Gzip (native CompressionStream) | ~79% | ~20ms | ~5ms | 0KB | No |
| Brotli (brotli-wasm) | ~84% | ~1200ms | ~10ms | 138KB | Yes |
| Zstandard (zstd-wasm) | ~79% | ~10ms | ~5ms | 139KB | Yes |
| LZMA (lzma-js) | ~85% | ~5000ms | ~500ms | 25KB | No |
| LZ4 | ~55% | ~5ms | ~3ms | 14KB | Varies |

## Chosen Approach: DEFLATE via fflate + CompressionStream

### Why DEFLATE?

1. **Universal compatibility**: DEFLATE/gzip is supported by every language, every platform, every runtime. No risk of "we need to add support for X".

2. **No WASM dependency**: Critical constraint. Chrome extensions have strict CSP that can block WASM. Flutter JS bridges may not support WASM. Pure JS means it works everywhere without configuration.

3. **8KB bundle**: fflate is 8KB gzipped (3KB for inflate-only). Compared to brotli-wasm at 138KB, this is 17x smaller. For a Chrome extension that must be lightweight, this matters.

4. **Good enough ratio**: 79% reduction is only 5 percentage points behind Brotli (84%). For a 200KB HTML page, that's the difference between 42KB and 32KB -- 10KB saved at the cost of 138KB larger bundle + WASM complexity.

5. **Battle-tested Rust decompressor**: `flate2` is the de-facto standard in Rust, maintained by the rust-lang organization.

### Browser-Native Fast Path

When `CompressionStream` is available (95%+ of modern browsers), we use it instead of fflate:
- **Zero bundle cost** for the compression path
- **~2x faster** than fflate (native C implementation)
- Same DEFLATE/gzip output format

```
Compression path selection:
  1. If CompressionStream available -> use native gzip (0KB, fastest)
  2. Else -> use fflate raw deflate (8KB, fast)
```

The format flags byte records which compression was used so the decompressor knows how to handle it.

### Compression Levels

| Level | Use Case | fflate Level | Expected Ratio |
|-------|----------|-------------|----------------|
| Fast | Bulk capture, real-time | 1 | ~70% |
| Default | Normal operation | 6 | ~79% |
| Max | Archival, batch processing | 9 | ~81% |

The API exposes these as named presets, not raw numbers.

## HTML Minification (Preprocessing)

Minification before compression improves ratios by 3-6 percentage points. Our custom minifier targets only high-value, safe transformations:

### Transformations

| Transformation | Savings | Risk |
|---------------|---------|------|
| Collapse whitespace | 5-15% | Very low (only between tags / redundant spaces) |
| Remove comments | 1-10% | Low (preserve conditional comments) |
| Sort attributes | 0-3% | None (order is not semantically significant in HTML) |
| Collapse boolean attrs | 0-1% | Very low |
| Remove optional closing tags | 1-3% | Low |
| Remove optional attribute quotes | 0-2% | Low (only when attribute value has no special chars) |

### What We Do NOT Do

- **No inline JS/CSS minification**: Too complex, too risky on arbitrary crawled HTML, adds 50KB+ of dependencies (terser, csso)
- **No tag tokenization**: Marginal gain (~2%) for high complexity, and DEFLATE already captures token repetition
- **No custom dictionaries**: Requires both sides to agree on dictionary version, adds protocol complexity. Future enhancement if needed.

### Combined Pipeline

```
Raw HTML (200KB)
  -> Minify (~170KB, -15%)
  -> DEFLATE level 6 (~38KB, -78% of minified)
  -> Total: ~81% reduction from raw
```

## Future Enhancements (Not in v1)

1. **Shared dictionary support**: Pre-built HTML/CSS/JS dictionaries could push ratios to 90%+. Requires versioned dictionary distribution and format flag support (already reserved in flags byte).

2. **Brotli option**: When WASM is acceptable (e.g., Node.js server-side batch compression), Brotli could be offered as an alternative compression backend. Format already reserves flag bits for this.

3. **Zstandard option**: If browser CompressionStream adds zstd support (currently "green-lit" by standards bodies), we could use it as another native fast path.

4. **Delta compression**: For pages crawled repeatedly, store only the diff from the previous version. Requires server-side state management.
