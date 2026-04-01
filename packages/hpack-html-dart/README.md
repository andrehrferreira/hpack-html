# hpack_html

[![pub](https://img.shields.io/pub/v/hpack_html.svg)](https://pub.dev/packages/hpack_html)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

Dart/Flutter SDK for the `.hpack` binary HTML compression format. Pack and unpack HTML pages with structured metadata (URL, ETag, signature, custom fields).

Zero native dependencies. Works on Android, iOS, macOS, Windows, Linux.

## Install

```yaml
# pubspec.yaml
dependencies:
  hpack_html: ^0.1.0
```

## Usage

### Pack (compress)

```dart
import 'package:hpack_html/hpack_html.dart';

final html = '<html>...</html>';

final packed = await pack(html, PackOptions(
  url: 'https://example.com/page',
  etag: '"abc123"',
  signature: 'req-sig-xyz',
));

// Send packed bytes to server (~80% smaller)
final response = await http.post(
  Uri.parse('https://api.example.com/ingest'),
  body: packed,
);
```

### Unpack (decompress)

```dart
final result = await unpack(packedBytes);

print(result.url);             // 'https://example.com/page'
print(result.etag);            // '"abc123"'
print(result.signature);       // 'req-sig-xyz'
print(result.html);            // '<html>...</html>'
print(result.checksumValid);   // true
```

### Read headers only (no decompression)

```dart
final headers = await readHeaders(packedBytes);
print(headers.url);  // fast metadata inspection
```

## API

### `pack(html, options) -> Future<Uint8List>`

- `options.url` — source URL (**required**)
- `options.etag` — HTTP ETag
- `options.signature` — request signature
- `options.contentType`, `options.timestamp`, `options.encoding`
- `options.custom` — `Map<String, String>` arbitrary metadata
- `options.level` — `CompressionLevel.fast`, `.defaultLevel`, `.max`
- `options.minify` — minify HTML before compression (default: `true`)
- `options.checksum` — include CRC32 (default: `true`)

### `unpack(data, [options]) -> Future<UnpackResult>`

- `options.verifyChecksum` — verify CRC32 (default: `true`)
- `options.headersOnly` — skip decompression (default: `false`)

### `readHeaders(data) -> Future<UnpackResult>`

Parse metadata without decompressing the body.

## Cross-SDK Compatibility

Packets created by this Dart SDK can be unpacked by:
- [`hpack-html`](https://www.npmjs.com/package/hpack-html) (TypeScript)
- [`hpack-html`](https://crates.io/crates/hpack-html) (Rust)

And vice versa — all SDKs produce identical `.hpack` binary format.

## Platform Support

| Platform | Compression Engine |
|----------|-------------------|
| Android | `dart:io` ZLibCodec |
| iOS | `dart:io` ZLibCodec |
| macOS / Windows / Linux | `dart:io` ZLibCodec |
| Flutter Web | Not supported (`dart:io` unavailable) |

## License

Apache License 2.0 — See [LICENSE](./LICENSE) for details.
