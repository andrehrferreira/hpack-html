# Proposal: Flutter/Dart SDK

## Why
The crawler runs on Flutter mobile apps (Android/iOS) and needs to pack HTML locally before sending to the server. A native Dart SDK avoids the overhead and complexity of JS interop. Dart has built-in `ZLibCodec`/`GZipCodec` in `dart:io`, so compression is available without any native plugins or FFI. The SDK must implement both pack and unpack, and produce .hpack packets byte-compatible with the JS compressor.

## What Changes
- New `packages/flutter/` Dart package (`hpack_html`)
- Pure Dart implementations: VarInt, CRC32, format constants, HTML minifier (port from JS), encoder, decoder, compression
- `HpackHtml.pack()`: minify -> compress -> encode .hpack packet
- `HpackHtml.unpack()`: decode packet -> decompress -> verify checksum -> return result
- `HpackHtml.readHeaders()`: metadata-only parsing
- Zero native dependencies, zero platform plugins
- Supports Android, iOS, Flutter Web, macOS, Windows, Linux

## Impact
- Affected specs: SDK Design (docs/04-sdk-design.md)
- Affected code: `packages/flutter/`
- Breaking change: NO (greenfield)
- User benefit: Flutter apps can pack crawled HTML natively without JS bridge overhead
