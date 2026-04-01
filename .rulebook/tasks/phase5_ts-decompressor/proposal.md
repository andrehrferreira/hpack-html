# Proposal: TypeScript Decompressor

## Why
The server-side TypeScript SDK is needed to unpack .hpack packets received from crawlers. It must decompress the HTML body, parse all metadata headers, and verify CRC32 integrity. This SDK runs on Node.js, Deno, Bun, and optionally in the browser for debugging/preview use cases.

## What Changes
- New `packages/decompressor-ts/` package
- Decompression engine: native `DecompressionStream` with fflate fallback
- `unpack()` function: decode packet -> decompress -> verify checksum -> return structured result
- `readHeaders()` function: parse headers without decompressing body (fast metadata inspection)
- CRC32 verification with clear error on mismatch
- Comprehensive error types for all failure modes

## Impact
- Affected specs: SDK Design (docs/04-sdk-design.md)
- Affected code: `packages/decompressor-ts/`
- Breaking change: NO (greenfield)
- User benefit: Server can unpack crawled HTML with full metadata and integrity verification
