## 1. Project Setup
- [ ] 1.1 Create `packages/flutter/pubspec.yaml` with zero native dependencies
- [ ] 1.2 Create Dart module structure under `lib/src/` and `lib/hpack_html.dart`
- [ ] 1.3 Configure `dart analyze` and `dart test`

## 2. Core Primitives (Port from TypeScript)
- [ ] 2.1 Implement `lib/src/format.dart`: magic bytes, version, flag constants, field type constants
- [ ] 2.2 Implement `lib/src/varint.dart`: VarInt encode/decode (same logic as JS)
- [ ] 2.3 Implement `lib/src/crc32.dart`: CRC32 lookup table + computation (IEEE 802.3)

## 3. Encoder/Decoder (Port from TypeScript)
- [ ] 3.1 Implement `lib/src/encoder.dart`: header field serialization, packet assembly
- [ ] 3.2 Implement `lib/src/decoder.dart`: magic validation, header parsing, body extraction
- [ ] 3.3 Implement custom field support (0x10-0xFF)
- [ ] 3.4 Implement `readHeaders()` that skips body

## 4. HTML Minifier (Port from TypeScript)
- [ ] 4.1 Implement `lib/src/minifier.dart`: whitespace collapsing, comment removal, boolean attrs, attr sorting, optional closing tags, optional quote removal
- [ ] 4.2 Implement raw content zone detection (script, style, pre, code, textarea)
- [ ] 4.3 Handle malformed HTML without crashing

## 5. Compression Engine
- [ ] 5.1 Implement `lib/src/compress.dart`: DEFLATE/gzip compression via `dart:io` `ZLibCodec`/`GZipCodec`
- [ ] 5.2 Implement compression level mapping: fast=1, default=6, max=9
- [ ] 5.3 Implement decompression via `ZLibDecoder`/`GZipDecoder`
- [ ] 5.4 Handle Flutter Web where `dart:io` is unavailable (conditional import or pure Dart zlib)

## 6. Public API
- [ ] 6.1 Implement `HpackHtml.pack(String html, PackOptions options) -> Future<Uint8List>`
- [ ] 6.2 Implement `HpackHtml.unpack(Uint8List data, {bool verifyChecksum, bool headersOnly}) -> Future<UnpackResult>`
- [ ] 6.3 Implement `HpackHtml.readHeaders(Uint8List data) -> Future<UnpackResult>`
- [ ] 6.4 Define `PackOptions`, `UnpackResult`, `CompressionLevel` classes
- [ ] 6.5 Export public API from `lib/hpack_html.dart`

## 7. Testing
- [ ] 7.1 VarInt unit tests: same test vectors as JS/Rust
- [ ] 7.2 CRC32 unit tests: RFC 3720 known vectors
- [ ] 7.3 Encoder/decoder roundtrip tests: all field types
- [ ] 7.4 Minifier unit tests: same test cases as JS minifier
- [ ] 7.5 Compression roundtrip tests: compress -> decompress -> verify byte-identical
- [ ] 7.6 Full pack/unpack roundtrip tests: pack HTML, unpack, verify HTML + metadata match
- [ ] 7.7 Golden file tests: decode same .hpack fixtures as JS/TS/Rust SDKs
- [ ] 7.8 Cross-SDK test: pack in Dart, unpack in TypeScript (and vice versa)
- [ ] 7.9 Verify 95%+ code coverage

## 8. Platform Validation
- [ ] 8.1 Test on Android (dart:io ZLibCodec available)
- [ ] 8.2 Test on iOS (dart:io ZLibCodec available)
- [ ] 8.3 Test on Flutter Web (dart:io NOT available, needs fallback)
- [ ] 8.4 Test on Desktop (macOS/Windows/Linux)

## 9. Finalization
- [ ] 9.1 Run `dart analyze` zero issues
- [ ] 9.2 Run `dart format` formatted
- [ ] 9.3 Run `dart test` all passing
- [ ] 9.4 Verify zero native dependencies in pubspec.yaml
