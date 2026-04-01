# hpack-html

[![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/rust-1.75%2B-orange.svg)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/bundle-~8KB%20gzip-brightgreen.svg)](https://github.com/nicollasbolado/hpack-html)
[![Pure JS](https://img.shields.io/badge/runtime-pure%20JS-yellow.svg)](https://github.com/nicollasbolado/hpack-html)

A high-performance, lossless HTML compression library designed for large-scale web crawling. Packs HTML pages into a compact binary format (`.hpack`) with structured metadata headers, achieving **78-82% compression ratios** with sub-5ms compression times.

## ✨ Key Features

- **📦 Compact Binary Format**: Custom `.hpack` format with magic bytes, versioned headers, and CRC32 integrity verification
- **⚡ Pure JavaScript Compressor**: Zero WASM dependencies — runs in browsers, Chrome extensions, Flutter, and any JS runtime
- **🔒 Lossless Compression**: Zero data loss — original HTML is perfectly reconstructable byte-for-byte
- **🏷️ Structured Metadata**: URL, ETag, request signature, timestamps, encoding, and custom key-value fields packed into the binary header
- **📐 HTML Minification**: Built-in lightweight minifier (whitespace, comments, attribute sorting) adds 3-6% extra compression
- **🌐 Browser-Native Fast Path**: Uses `CompressionStream` API when available (0KB overhead, 2x faster)
- **🦀 Rust Decompressor**: High-throughput server-side decompression with `flate2` (pure Rust, no C deps)
- **📘 TypeScript Decompressor**: Full-featured decompressor for Node.js, Deno, Bun, and browser environments
- **🔑 Request Signatures**: Attach opaque signatures so the server can identify and validate packet origin
- **🪶 Tiny Bundle**: Compressor is ~8KB gzipped — negligible impact on extension or app bundle size

## 📊 Benchmark Results

Real-world benchmark on an **Americanas.com.br product page** (101.65 KB of HTML):

### All Algorithms Compared

| # | Algorithm | Compressed | Reduction | Compress | Decompress | Type | Bundle Size |
|---|-----------|-----------|-----------|----------|------------|------|-------------|
| 1 | Brotli (native, Q11) | 17.82 KB | 82.46% | 83.53ms | 0.26ms | Native C | N/A |
| 2 | Brotli (WASM, Q11) | 17.87 KB | 82.42% | 434.05ms | 1.16ms | WASM | 138KB |
| 3 | LZMA (level 1) | 18.87 KB | 81.43% | 415.20ms | 1998.29ms | Pure JS | ~25KB |
| 4 | Zstandard (level 19) | 19.61 KB | 80.70% | 43.31ms | 0.57ms | WASM | ~139KB |
| 5 | Brotli (WASM, Q6) | 19.69 KB | 80.63% | 19.62ms | 1.19ms | WASM | 138KB |
| 6 | Zstandard (level 6) | 20.44 KB | 79.89% | 3.76ms | 1.22ms | WASM | ~139KB |
| 7 | **Pako DEFLATE (L9)** | **20.95 KB** | **79.39%** | **4.32ms** | **0.68ms** | **Pure JS** | **45KB** |
| 8 | **fflate DEFLATE (L9)** | **21.78 KB** | **78.57%** | **4.88ms** | **2.09ms** | **Pure JS** | **8KB** |
| 9 | fflate DEFLATE (L6) | 21.81 KB | 78.54% | 5.26ms | 2.04ms | Pure JS | 8KB |
| 10 | Zstandard (level 1) | 23.06 KB | 77.32% | 4.85ms | 2.18ms | WASM | ~139KB |
| 11 | fflate DEFLATE (L1) | 23.40 KB | 76.98% | 9.41ms | 4.54ms | Pure JS | 8KB |
| 12 | LZ4 | 31.25 KB | 69.25% | 3.20ms | 1.19ms | Pure JS | ~14KB |
| 13 | LZ-String (UTF16) | 45.58 KB | 55.16% | 16.03ms | 6.27ms | Pure JS | <1KB |
| 14 | LZ-String (Base64) | 56.97 KB | 43.95% | 15.18ms | 6.58ms | Pure JS | <1KB |

### Why fflate DEFLATE?

| Criteria | fflate | Brotli WASM | Zstd WASM | LZMA | Pako |
|----------|--------|-------------|-----------|------|------|
| Compression ratio | 78.57% | 82.42% | 79.89% | 81.43% | 79.39% |
| Compress speed | **4.88ms** | 434.05ms | 3.76ms | 415.20ms | 4.32ms |
| Bundle size | **8KB** | 138KB | 139KB | 25KB | 45KB |
| WASM required | **No** | Yes | Yes | No | No |
| Chrome ext CSP safe | **Yes** | No | No | Yes | Yes |
| Rust decompressor | **flate2 (mature)** | brotli | zstd | lzma-rs | flate2 |

**fflate delivers 78.57% compression in 4.88ms with only 8KB bundle and zero WASM.** The 4% gap to Brotli costs 138KB of WASM and 88x slower compression — not worth it for real-time crawl ingestion.

## 🚀 Quick Start

### Compressor (JavaScript / Browser / Flutter)

```bash
npm install @hpack-html/compressor
```

```typescript
import { pack } from '@hpack-html/compressor';

const html = '<html>...</html>';

const packed = await pack(html, {
  url: 'https://example.com/page',
  etag: '"abc123"',
  signature: 'req-sig-xyz',
});

// Send packed bytes to server (~80% smaller)
await fetch('/ingest', { method: 'POST', body: packed });
```

### Decompressor (TypeScript)

```bash
npm install @hpack-html/decompressor
```

```typescript
import { unpack } from '@hpack-html/decompressor';

const result = await unpack(packed);

console.log(result.url);       // 'https://example.com/page'
console.log(result.etag);      // '"abc123"'
console.log(result.signature); // 'req-sig-xyz'
console.log(result.html);      // '<html>...</html>'
```

### Flutter/Dart SDK

```yaml
# pubspec.yaml
dependencies:
  hpack_html: ^0.1.0
```

```dart
import 'package:hpack_html/hpack_html.dart';

// Compress
final packed = await HpackHtml.pack(html, PackOptions(
  url: 'https://example.com/page',
  etag: '"abc123"',
  signature: 'req-sig-xyz',
));

// Decompress
final result = await HpackHtml.unpack(packed);
print(result.url);   // 'https://example.com/page'
print(result.html);  // '<html>...</html>'
```

### Decompressor (Rust)

```toml
[dependencies]
hpack-html = "0.1"
```

```rust
use hpack_html::unpack;

let packed: &[u8] = /* received from network */;
let result = unpack(packed)?;

println!("URL: {}", result.url);
println!("HTML: {} bytes", result.html.len());
```

## 📐 Binary Format (`.hpack`)

```
┌──────────────┬──────────┬─────────┬────────────────┬──────────────────┐
│ Magic (4B)   │ Ver (1B) │ Flags   │ Header Section │ Body Section     │
│ 0x89 H P K  │ 0x01     │ (1B)    │ (variable)     │ (variable)       │
└──────────────┴──────────┴─────────┴────────────────┴──────────────────┘
```

| Component | Size | Description |
|-----------|------|-------------|
| Magic bytes | 4 bytes | `0x89 0x48 0x50 0x4B` ("HPK" with non-ASCII prefix) |
| Version | 1 byte | Format version (currently `0x01`) |
| Flags | 1 byte | Minified, checksum, compression algorithm |
| Header section | Variable | VarInt-encoded fields (URL, ETag, signature, custom) |
| Body section | Variable | Uncompressed length (VarInt) + compressed HTML + optional CRC32 |

**Header fields:**

| Type ID | Field | Required |
|---------|-------|----------|
| `0x01` | URL | Yes |
| `0x02` | ETag | No |
| `0x03` | Signature | No |
| `0x04` | Content-Type | No |
| `0x05` | Timestamp | No |
| `0x06` | Encoding | No |
| `0x10`-`0xFF` | Custom fields | No |

**Overhead:** ~231 bytes for typical metadata (URL + ETag + Signature + Timestamp). Full format specification in [docs/02-binary-format.md](docs/02-binary-format.md).

## 📦 Package Structure

```
hpack-html/
  packages/
    core/                  # Shared types, constants, VarInt, CRC32
    compressor/            # JS compressor (browser-safe, pure JS)
    decompressor-ts/       # TypeScript decompressor
    decompressor-rust/     # Rust decompressor crate
    flutter/               # Dart/Flutter SDK (pack + unpack)
    test-vectors/          # Cross-SDK golden test files
```

## ⚡ Performance Targets

| Metric | Target |
|--------|--------|
| Compression ratio | 78-82% reduction |
| Compress speed (browser) | < 10ms for 100KB HTML |
| Decompress speed (Rust) | < 1ms for 100KB HTML |
| JS bundle (compressor) | < 15KB gzipped |
| Header overhead | < 512 bytes |

## 🔄 Compression Pipeline

```
Raw HTML (100KB)
  → Minify (whitespace, comments, attr sorting)  →  ~85KB (-15%)
  → DEFLATE level 6 (via fflate or CompressionStream)  →  ~21KB (-78%)
  → Encode .hpack (magic + headers + body + CRC32)  →  ~21.2KB
```

**Compression engine selection:**
1. `CompressionStream` API (native, 0KB, ~95% browser support) — preferred
2. `fflate` (pure JS, 8KB fallback) — when native unavailable

## 🔀 Feature Comparison

| Feature | hpack-html | gzip (raw) | Brotli | LZ-String |
|---------|------------|------------|--------|-----------|
| Compression ratio | ~79% | ~79% | ~82% | ~55% |
| Structured metadata | ✅ URL, ETag, sig | ❌ | ❌ | ❌ |
| Pure JS (no WASM) | ✅ | ✅ | ❌ | ✅ |
| HTML minification | ✅ Built-in | ❌ | ❌ | ❌ |
| CRC32 integrity | ✅ | ✅ (gzip) | ❌ | ❌ |
| Binary format | ✅ Compact | ✅ | ✅ | ❌ (string) |
| Rust decompressor | ✅ flate2 | ✅ flate2 | ✅ brotli | ❌ |
| TypeScript SDK | ✅ | Manual | Manual | ✅ |
| Bundle size | 8KB | 0-8KB | 138KB | <1KB |
| Chrome ext safe | ✅ | ✅ | ❌ (WASM) | ✅ |

## 🛠️ Development

```bash
# Install dependencies
bun install

# Run benchmark
cd benchmark && bun run fetch-html.ts && bun run index.ts

# Type check
bun run type-check

# Run tests
bun test

# Build
bun run build
```

## 📚 Documentation

- [Project Overview](docs/00-project-overview.md) — Problem statement, goals, and target metrics
- [Architecture](docs/01-architecture.md) — Component design and package structure
- [Binary Format Spec](docs/02-binary-format.md) — Full `.hpack` format specification
- [Compression Strategy](docs/03-compression-strategy.md) — Algorithm research and selection rationale
- [SDK Design](docs/04-sdk-design.md) — API design for all three SDKs
- [Implementation Plan](docs/05-implementation-plan.md) — Phased implementation roadmap
- [Research Notes](docs/06-research-notes.md) — Benchmarks, comparisons, and sources
- [Roadmap](docs/07-roadmap.md) — Detailed implementation roadmap with milestones and parallelism

## 📄 License

MIT License — See [LICENSE](./LICENSE) for details.
