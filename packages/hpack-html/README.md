# hpack-html

[![npm](https://img.shields.io/npm/v/hpack-html.svg)](https://www.npmjs.com/package/hpack-html)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

Core library + decompressor for the `.hpack` binary HTML compression format. Decodes packets produced by [`hpack-html-js`](https://www.npmjs.com/package/hpack-html-js), decompresses the HTML body, verifies CRC32 integrity, and extracts structured metadata.

## Install

```bash
npm install hpack-html
```

## Usage

```typescript
import { unpack, readHeaders } from 'hpack-html';

// Unpack a full packet (decompress + verify checksum)
const result = await unpack(packedBytes);

console.log(result.url);             // 'https://example.com/page'
console.log(result.etag);            // '"abc123"'
console.log(result.signature);       // 'req-sig-xyz'
console.log(result.html);            // '<html>...</html>'
console.log(result.checksumValid);   // true

// Read only headers (no decompression, fast)
const headers = await readHeaders(packedBytes);
console.log(headers.url);
```

## API

### `unpack(data, options?)`

Decompress and decode an `.hpack` packet.

- `data: Uint8Array` — raw `.hpack` bytes
- `options.verifyChecksum?: boolean` — verify CRC32 (default: `true`)
- `options.headersOnly?: boolean` — skip decompression (default: `false`)
- Returns `Promise<UnpackResult>`

### `readHeaders(data)`

Parse metadata without decompressing the body.

- `data: Uint8Array` — raw `.hpack` bytes
- Returns headers only (html is empty string)

### `UnpackResult`

```typescript
interface UnpackResult {
  url: string;
  etag?: string;
  signature?: string;
  contentType?: string;
  timestamp?: number;
  encoding?: string;
  custom?: Record<string, string>;
  html: string;
  version: number;
  minified: boolean;
  compressionAlgorithm: 'deflate' | 'gzip';
  checksumValid?: boolean;
}
```

### Error Types

- `InvalidMagicError` — not an `.hpack` packet
- `UnsupportedVersionError` — unknown format version
- `TruncatedPacketError` — data is incomplete
- `ChecksumMismatchError` — CRC32 does not match
- `DecompressionError` — DEFLATE/gzip decompression failed

## Also Exports (Core Primitives)

This package also exports the low-level building blocks used by the format:

- `encodeVarInt` / `decodeVarInt` — variable-length integer encoding
- `crc32` — CRC32 checksum (IEEE 802.3)
- `encodePacket` / `decodePacket` — binary packet encoder/decoder
- `encodeFlags` / `decodeFlags` — flags byte helpers
- Format constants (`MAGIC`, `VERSION`, `FIELD_URL`, etc.)
- TypeScript types (`PackOptions`, `UnpackResult`, `HeaderField`, etc.)

## Real-World Results

| Page | Raw | Packed | Reduction |
|------|-----|--------|-----------|
| Americanas.com.br | 101.6 KB | 22.0 KB | 78.4% |
| Wikipedia | 489.8 KB | 89.7 KB | 81.7% |
| Hacker News | 33.7 KB | 5.8 KB | 82.7% |

Lossless roundtrip verified byte-by-byte on all pages.

## License

Apache License 2.0 — See [LICENSE](./LICENSE) for details.
