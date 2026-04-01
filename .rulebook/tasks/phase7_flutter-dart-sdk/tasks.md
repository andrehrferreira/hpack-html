## 1. Project Setup
- [x] 1.1 Create `packages/hpack-html-dart/pubspec.yaml` with zero native dependencies
- [x] 1.2 Create Dart module structure under `lib/src/` and `lib/hpack_html.dart`

## 2. Core Primitives (Port from TypeScript)
- [x] 2.1 Implement `lib/src/format.dart`: magic bytes, version, flag constants, field type constants
- [x] 2.2 Implement `lib/src/varint.dart`: VarInt encode/decode
- [x] 2.3 Implement `lib/src/crc32.dart`: CRC32 lookup table + computation (IEEE 802.3)
- [x] 2.4 Implement `lib/src/types.dart`: PackOptions, UnpackResult, UnpackOptions, HeaderField, enums

## 3. Encoder/Decoder
- [x] 3.1 Implement `lib/src/encoder.dart`: header field serialization, packet assembly
- [x] 3.2 Implement `lib/src/decoder.dart`: magic validation, header parsing, body extraction
- [x] 3.3 Implement custom field support (0x10-0xFF)
- [x] 3.4 Implement error types: InvalidMagicError, UnsupportedVersionError, TruncatedPacketError, ChecksumMismatchError, DecompressionError

## 4. HTML Minifier
- [x] 4.1 Implement `lib/src/minifier.dart`: whitespace collapsing, comment removal, boolean attrs, attr sorting, optional closing tags, optional quote removal
- [x] 4.2 Implement raw content zone detection (script, style, pre, code, textarea)

## 5. Compression Engine
- [x] 5.1 Implement `lib/src/compress.dart`: DEFLATE compression via `dart:io` `ZLibCodec`
- [x] 5.2 Implement decompression: `decompressDeflate` and `decompressGzip`
- [x] 5.3 Implement compression level mapping: fast=1, default=6, max=9

## 6. Public API
- [x] 6.1 Implement `pack(String html, PackOptions options) -> Future<Uint8List>`
- [x] 6.2 Implement `unpack(Uint8List data, [UnpackOptions?]) -> Future<UnpackResult>`
- [x] 6.3 Implement `readHeaders(Uint8List data) -> Future<UnpackResult>`
- [x] 6.4 Export all public types and error classes from `lib/hpack_html.dart`

## 7. Testing
- [x] 7.1 VarInt tests: encode/decode roundtrip, edge cases, errors
- [x] 7.2 CRC32 tests: empty, RFC 3720 check value, "hello"
- [x] 7.3 Minifier tests: whitespace, comments, conditional comments, script preservation, optional tags
- [x] 7.4 Pack/unpack roundtrip: simple HTML, all metadata, empty, Unicode, minification, no checksum, headersOnly, readHeaders
- [x] 7.5 Error tests: invalid magic, bad version, truncated, corrupted CRC32, missing URL

## 8. Package Files
- [x] 8.1 README.md with install, usage, API, platform support
- [x] 8.2 LICENSE (Apache-2.0)
- [x] 8.3 pubspec.yaml with metadata

## Note
- Dart SDK not installed on dev machine — code written and structured but not runtime-tested
- Tests require `dart test` to execute (26 test cases written)
