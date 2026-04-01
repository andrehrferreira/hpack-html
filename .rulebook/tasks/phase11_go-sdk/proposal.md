# Proposal: Go SDK

## Why
Go is widely used for high-throughput HTTP servers, microservices, and data pipelines. A native Go SDK enables server-side .hpack decompression in Go-based ingestion services without CGo or FFI. Go's `compress/flate` and `compress/gzip` stdlib packages provide zero-dependency decompression, and Go's strong concurrency model makes it ideal for processing millions of .hpack packets in parallel.

## What Changes
- New `packages/hpack-html-go/` Go module (`github.com/andrehrferreira/hpack-html/packages/hpack-html-go`)
- Pure Go implementations: VarInt decode, CRC32 (via `hash/crc32` stdlib), format constants, packet decoder
- DEFLATE/gzip decompression via `compress/flate` and `compress/gzip` (stdlib, zero deps)
- `Unpack()`, `UnpackHeaders()` functions
- Optional `Pack()` for server-side packing
- Cross-SDK validation: same 14 test vectors, SHA256 byte-exact match

## Impact
- Affected specs: SDK Design (docs/04-sdk-design.md)
- Affected code: `packages/hpack-html-go/`
- Breaking change: NO (new package)
- User benefit: Go servers can unpack .hpack packets natively with zero external dependencies
