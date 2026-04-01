# Proposal: Python SDK

## Why
Many crawler pipelines and data processing servers run Python. A native Python SDK allows server-side decompression of .hpack packets without shelling out to Node.js or Rust. Python is also used in ML/AI pipelines that consume crawled HTML for training data, making native .hpack support valuable for the ecosystem.

## What Changes
- New `packages/hpack-html-py/` Python package (`hpack-html`)
- Pure Python implementations: VarInt decode, CRC32 (via `zlib.crc32`), format constants, packet decoder
- DEFLATE/gzip decompression via `zlib` (stdlib, zero deps)
- `unpack()`, `unpack_headers()` functions
- Optional `pack()` for server-side re-packing (minifier NOT included — use JS for that)
- Type hints throughout (Python 3.10+ with `TypedDict`)
- Cross-SDK validation: same 14 test vectors, SHA256 byte-exact match

## Impact
- Affected specs: SDK Design (docs/04-sdk-design.md)
- Affected code: `packages/hpack-html-py/`
- Breaking change: NO (new package)
- User benefit: Python servers can unpack .hpack packets natively with zero external dependencies
