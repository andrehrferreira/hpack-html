# Proposal: Packet Encoder/Decoder

## Why
The .hpack binary format needs encoder and decoder logic to serialize metadata headers and body into a compact binary packet, and to parse that packet back. This is the bridge between the raw compression layer and the structured packet format. Both the JS compressor and all decompressor SDKs depend on this logic being correct and well-tested.

## What Changes
- New encoder module in `packages/core/src/encoder.ts`: serializes header fields + body into .hpack binary
- New decoder module in `packages/core/src/decoder.ts`: parses .hpack binary back into structured data
- `readHeaders()` utility for headers-only parsing (skip body decompression)
- Golden file fixtures (pre-built .hpack files) for cross-SDK testing
- Round-trip tests proving encode(decode(x)) === x

## Impact
- Affected specs: Binary format spec (docs/02-binary-format.md)
- Affected code: `packages/core/src/encoder.ts`, `packages/core/src/decoder.ts`
- Breaking change: NO (greenfield)
- User benefit: Enables structured metadata (URL, ETag, signature) to travel alongside compressed HTML
