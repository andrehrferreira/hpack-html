# hpack-html-js

[![npm](https://img.shields.io/npm/v/hpack-html-js.svg)](https://www.npmjs.com/package/hpack-html-js)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

Pure JavaScript HTML compressor for the `.hpack` binary format. Designed for browsers, Chrome extensions, Flutter JS bridges, and any JS runtime. Zero WASM dependencies, ~8KB gzipped.

## Install

```bash
npm install hpack-html-js
```

## Usage

```typescript
import { pack } from 'hpack-html-js';

const html = '<html>...</html>';

const packed = await pack(html, {
  url: 'https://example.com/page',
  etag: '"abc123"',
  signature: 'req-sig-xyz',
});

// Send packed bytes to server (~80% smaller)
await fetch('/ingest', { method: 'POST', body: packed });
```

## API

### `pack(html, options)`

Compress HTML into a compact `.hpack` binary packet.

- `html: string` — raw HTML to compress
- `options.url: string` — source page URL (**required**)
- `options.etag?: string` — HTTP ETag
- `options.signature?: string` — request signature for server-side identification
- `options.contentType?: string` — original Content-Type
- `options.timestamp?: number` — capture time (Unix ms, defaults to `Date.now()`)
- `options.encoding?: string` — page encoding (defaults to `"utf-8"`)
- `options.custom?: Record<string, string>` — arbitrary key-value metadata
- `options.level?: 'fast' | 'default' | 'max'` — compression level (default: `"default"`)
- `options.minify?: boolean` — minify HTML before compression (default: `true`)
- `options.checksum?: boolean` — include CRC32 checksum (default: `true`)
- Returns `Promise<Uint8Array>`

### `minify(html)`

Standalone HTML minifier. Removes comments, collapses whitespace, sorts attributes, removes optional closing tags.

- `html: string` — raw HTML
- Returns `string` — minified HTML

### `compress(data, level?)`

Low-level compression. Uses native `CompressionStream` when available, falls back to `fflate`.

- `data: Uint8Array` — bytes to compress
- `level?: 'fast' | 'default' | 'max'`
- Returns `Promise<{ compressed: Uint8Array, isGzip: boolean }>`

## Compression Pipeline

```
Raw HTML (100KB)
  -> Minify (whitespace, comments, attr sorting)  ->  ~85KB
  -> DEFLATE (via fflate or native CompressionStream)  ->  ~21KB
  -> Encode .hpack (magic + headers + body + CRC32)  ->  ~21.2KB
```

## Browser Compatibility

| Environment | Compression Engine | Bundle Cost |
|-------------|-------------------|-------------|
| Modern browsers (95%+) | Native `CompressionStream` | 0KB |
| Older browsers | `fflate` fallback | 8KB |
| Chrome Extension | `fflate` (CSP-safe, no WASM) | 8KB |
| Flutter JS bridge | `fflate` | 8KB |
| Node.js / Bun / Deno | Native `CompressionStream` | 0KB |

## Decompression

To decompress `.hpack` packets, use [`hpack-html`](https://www.npmjs.com/package/hpack-html) (TypeScript) or the [`hpack-html` Rust crate](https://crates.io/crates/hpack-html).

## Real-World Results

| Page | Raw | Packed | Reduction |
|------|-----|--------|-----------|
| Americanas.com.br | 101.6 KB | 22.0 KB | 78.4% |
| Wikipedia | 489.8 KB | 89.7 KB | 81.7% |
| Hacker News | 33.7 KB | 5.8 KB | 82.7% |
| Google BR | 176.8 KB | 55.1 KB | 68.8% |
| Cloudflare Blog | 105.7 KB | 19.1 KB | 82.0% |

Lossless: `unpack(pack(html)) === html` verified byte-by-byte on all pages.

## License

Apache License 2.0 — See [LICENSE](./LICENSE) for details.
