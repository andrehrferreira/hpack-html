# Architecture

## High-Level Architecture

```
                        COMPRESSOR (JavaScript)
                        +======================+
                        |                      |
  Raw HTML  --------->  |  1. HTML Minifier    |
  + Metadata            |  2. Compression      |
  (URL, ETag,           |  3. Packet Encoder   |
   Signature)           |                      |
                        +==========+===========+
                                   |
                              .hpack binary
                                   |
                        +==========v===========+
                        |                      |
                        |  DECOMPRESSOR (SDK)   |
                        |                      |
                        |  1. Packet Decoder   |
                        |  2. Decompression    |
                        |  3. HTML Restore     |
                        |                      |
                        +======================+
                        TypeScript | Rust
```

## Components

### 1. HTML Minifier (Preprocessor)

A lightweight, custom HTML minifier that runs before compression to improve ratios. Designed to be minimal (~2-3KB) and safe for any HTML.

**Transformations (all reversible-safe, content-preserving):**
- Collapse consecutive whitespace to a single space
- Remove HTML comments (except conditional comments `<!--[if ...]>`)
- Remove unnecessary attribute quotes where safe
- Collapse boolean attributes (`checked="checked"` -> `checked`)
- Remove optional closing tags (`</li>`, `</td>`, `</tr>`, `</p>`, etc.)
- Sort attributes alphabetically (improves compression by creating repeating patterns)

**Why custom, not html-minifier-terser?**
- html-minifier-terser is ~100KB+ bundled -- too heavy for browser
- We only need the high-value transformations
- Must work on malformed/partial HTML (crawled pages are messy)

### 2. Compression Engine

**Primary algorithm: DEFLATE via fflate**
- Pure JavaScript, 8KB gzipped, no WASM dependency
- ~79% compression ratio on HTML (after minification: ~82-85%)
- Fast: suitable for real-time compression in browser
- Wide ecosystem: decompression available in every language

**Why fflate over alternatives?**

| Algorithm | Ratio | Speed | JS Size | WASM Required | Rust Decompressor |
|-----------|-------|-------|---------|---------------|-------------------|
| **fflate (DEFLATE)** | **~79%** | **Fast** | **8KB** | **No** | **flate2 (mature)** |
| Brotli | ~84% | Slow | 138KB | Yes | brotli (mature) |
| Zstandard | ~79% | Fastest | 139KB | Yes | zstd (mature) |
| LZMA | ~85% | Very slow | 25KB | No | lzma-rs (stable) |

fflate wins because:
- **No WASM** = works everywhere (Chrome extension CSP, Flutter JS bridge, older browsers)
- **8KB** = negligible bundle impact
- **~79% ratio** = within 5% of Brotli at 17x smaller bundle
- **flate2** in Rust is the most battle-tested decompression crate
- **CompressionStream fallback** = can use native browser API (0KB) when available

**Compression level strategy:**
- Default: level 6 (good balance of ratio vs speed)
- Fast mode: level 1 (for bulk/batch operations)
- Max mode: level 9 (for archival, not real-time)

### 3. Packet Format (`.hpack`)

See [02-binary-format.md](./02-binary-format.md) for the full specification.

### 4. Decompressor SDKs

#### TypeScript SDK
- Mirrors the compressor API
- Can run in Node.js, Deno, Bun, and browser
- Uses fflate for decompression (or native DecompressionStream where available)

#### Rust SDK
- Uses `flate2` crate with `miniz_oxide` backend (pure Rust, no C deps)
- Zero-copy packet header parsing where possible
- `no_std` compatible for embedded use cases

## Package Structure

```
hpack-html/
  packages/
    core/                  # Shared types, constants, format spec
      src/
        format.ts          # Magic bytes, version, field types
        types.ts           # Shared TypeScript types
    compressor/            # JavaScript compressor (browser-compatible)
      src/
        minifier.ts        # HTML minifier
        compress.ts        # Compression wrapper (fflate + CompressionStream)
        encoder.ts         # Packet encoder (metadata + compressed body)
        index.ts           # Public API
    decompressor-ts/       # TypeScript decompressor
      src/
        decompress.ts      # Decompression wrapper
        decoder.ts         # Packet decoder
        index.ts           # Public API
    decompressor-rust/     # Rust decompressor
      src/
        lib.rs             # Public API
        decoder.rs         # Packet decoder
        decompress.rs      # Decompression wrapper
      Cargo.toml
    flutter/               # Dart/Flutter SDK (compressor + decompressor)
      lib/
        src/
          format.dart      # Magic bytes, version, field type constants
          varint.dart      # VarInt encode/decode
          crc32.dart       # CRC32 computation
          minifier.dart    # HTML minifier
          encoder.dart     # Packet encoder
          decoder.dart     # Packet decoder
          compress.dart    # Compression wrapper (ZLibCodec)
        hpack_html.dart    # Public API (pack, unpack, readHeaders)
      pubspec.yaml
```

## Dependency Graph

```
core (zero dependencies)
  ^
  |--- compressor (depends on: core, fflate)
  |--- decompressor-ts (depends on: core, fflate)

flutter/hpack_html (standalone Dart package, zero native deps)
  depends on: dart:io (ZLibCodec), dart:typed_data

decompressor-rust (standalone, implements format spec from core)
  depends on: flate2, miniz_oxide
```
