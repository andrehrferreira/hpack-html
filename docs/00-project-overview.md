# hpack-html: Project Overview

## Problem Statement

We collect millions of HTML pages via crawlers deployed across multiple platforms (Chrome extension, mobile apps, desktop apps, etc.). These raw HTML pages need to be transmitted to a central server as efficiently as possible, minimizing bandwidth consumption while preserving the full original content (lossless).

Each packed HTML must carry metadata: the source URL, an identifier (e.g. ETag), and a request signature so the server can identify and validate the origin of each packet.

## Goals

1. **Minimal byte size** -- compress HTML pages to the smallest possible representation
2. **Lossless** -- zero data loss; the original HTML must be perfectly reconstructable
3. **Cross-platform compressor** -- pure JavaScript (no native modules, no Node.js APIs) so it runs in:
   - Browser (Chrome extension content scripts, service workers)
   - Flutter (via JS interop or embedded JS engine)
   - Any JS runtime (Deno, Bun, etc.)
4. **Cross-platform decompressor** -- SDKs for:
   - TypeScript (Node.js, Deno, Bun, browser)
   - Rust (server-side, high throughput)
5. **Structured packet format** -- binary format with header (URL, ETag, signature) + compressed body
6. **Fast compression** -- suitable for real-time use (compress on capture, send immediately)

## Non-Goals

- Lossy compression (e.g., removing scripts, images, or non-visible content)
- Serving compressed HTML to end users (this is an ingestion/storage format)
- Streaming decompression (packets are small enough to decompress in memory)

## Target Metrics

| Metric | Target |
|--------|--------|
| Compression ratio (vs raw HTML) | 75-85% reduction |
| Compression speed (browser) | < 50ms for a typical 200KB HTML page |
| Decompression speed (Rust) | < 5ms for a typical 200KB HTML page |
| JS bundle size (compressor) | < 15KB gzipped |
| Header overhead per packet | < 512 bytes for typical metadata |
