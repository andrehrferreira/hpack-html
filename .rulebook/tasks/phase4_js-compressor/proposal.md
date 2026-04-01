# Proposal: JavaScript Compressor

## Why
This is the primary client-side package that Chrome extensions, browser apps, and Flutter JS bridges will use to compress HTML before sending to the server. It combines the minifier (Phase 3), compression engine, and packet encoder (Phase 2) into a single `pack()` API. Must be pure JavaScript, no WASM, under 15KB gzipped.

## What Changes
- New `packages/compressor/` package
- Compression engine with dual-path: native `CompressionStream` (0KB, 95% browser support) with fflate fallback (8KB)
- `pack()` function: minify -> compress -> encode .hpack packet
- Compression level presets: fast (level 1), default (level 6), max (level 9)
- Input validation for required fields (url) and options
- ESM, CJS, and UMD bundle outputs

## Impact
- Affected specs: SDK Design (docs/04-sdk-design.md), Compression Strategy (docs/03-compression-strategy.md)
- Affected code: `packages/compressor/`
- Breaking change: NO (greenfield)
- User benefit: One-line API to compress HTML with metadata, works in any JS environment
