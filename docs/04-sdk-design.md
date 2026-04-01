# SDK Design

## JavaScript Compressor API

### Installation

```bash
npm install @hpack-html/compressor
```

### Basic Usage

```typescript
import { pack } from '@hpack-html/compressor';

const html = '<html>...</html>';

const packed: Uint8Array = await pack(html, {
  url: 'https://example.com/page',
  etag: '"abc123"',
  signature: 'req-sig-xyz',
});

// Send packed bytes to server
await fetch('/ingest', { method: 'POST', body: packed });
```

### Full API

```typescript
// --- Compressor ---

interface PackOptions {
  // Required
  url: string;

  // Optional metadata
  etag?: string;
  signature?: string;
  contentType?: string;
  timestamp?: number;          // Unix epoch ms, defaults to Date.now()
  encoding?: string;           // Original page encoding, defaults to 'utf-8'
  custom?: Record<string, string>; // Arbitrary key-value metadata

  // Compression options
  level?: 'fast' | 'default' | 'max';  // Compression level preset
  minify?: boolean;            // Enable HTML minification (default: true)
  checksum?: boolean;          // Include CRC32 checksum (default: true)
}

// Main entry point
async function pack(html: string, options: PackOptions): Promise<Uint8Array>;

// Streaming variant for large HTML (future)
// function packStream(html: ReadableStream, options: PackOptions): ReadableStream;
```

### Bundle Targets

```
@hpack-html/compressor
  dist/
    index.esm.js         # ES Module (tree-shakeable)
    index.cjs.js          # CommonJS
    index.browser.js      # UMD for <script> tags
```

Target: ES2020 (covers all target environments).

## TypeScript Decompressor API

### Installation

```bash
npm install @hpack-html/decompressor
```

### Basic Usage

```typescript
import { unpack } from '@hpack-html/decompressor';

const packed: Uint8Array = /* received from network */;

const result = await unpack(packed);

console.log(result.url);       // 'https://example.com/page'
console.log(result.etag);      // '"abc123"'
console.log(result.signature); // 'req-sig-xyz'
console.log(result.html);      // '<html>...</html>'
```

### Full API

```typescript
// --- Decompressor ---

interface UnpackResult {
  // Metadata
  url: string;
  etag?: string;
  signature?: string;
  contentType?: string;
  timestamp?: number;
  encoding?: string;
  custom?: Record<string, string>;

  // Content
  html: string;

  // Packet info
  version: number;
  minified: boolean;
  compressionAlgorithm: 'deflate' | 'gzip';
  checksumValid?: boolean;     // undefined if no checksum in packet
}

interface UnpackOptions {
  verifyChecksum?: boolean;    // Verify CRC32 if present (default: true)
  headersOnly?: boolean;       // Parse only headers, skip decompression (default: false)
}

async function unpack(data: Uint8Array, options?: UnpackOptions): Promise<UnpackResult>;

// Utility: read only headers without decompressing body
async function readHeaders(data: Uint8Array): Promise<Omit<UnpackResult, 'html'>>;
```

## Flutter/Dart Compressor SDK

### Installation

```yaml
# pubspec.yaml
dependencies:
  hpack_html: ^0.1.0
```

### Basic Usage

```dart
import 'package:hpack_html/hpack_html.dart';

final html = '<html>...</html>';

final packed = await HpackHtml.pack(html, PackOptions(
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

### Full API

```dart
/// Compression options
class PackOptions {
  /// Required: source page URL
  final String url;

  /// Optional metadata
  final String? etag;
  final String? signature;
  final String? contentType;
  final int? timestamp;           // Unix epoch ms, defaults to DateTime.now()
  final String? encoding;         // Original page encoding, defaults to 'utf-8'
  final Map<String, String>? custom; // Arbitrary key-value metadata

  /// Compression options
  final CompressionLevel level;   // fast, default_, max
  final bool minify;              // Enable HTML minification (default: true)
  final bool checksum;            // Include CRC32 checksum (default: true)

  const PackOptions({
    required this.url,
    this.etag,
    this.signature,
    this.contentType,
    this.timestamp,
    this.encoding,
    this.custom,
    this.level = CompressionLevel.default_,
    this.minify = true,
    this.checksum = true,
  });
}

enum CompressionLevel { fast, default_, max }

/// Unpack result
class UnpackResult {
  final String url;
  final String? etag;
  final String? signature;
  final String? contentType;
  final int? timestamp;
  final String? encoding;
  final Map<String, String>? custom;
  final String html;
  final int version;
  final bool minified;
  final String compressionAlgorithm; // 'deflate' | 'gzip'
  final bool? checksumValid;
}

/// Main API
class HpackHtml {
  /// Compress HTML into .hpack binary format
  static Future<Uint8List> pack(String html, PackOptions options);

  /// Decompress .hpack binary back to HTML + metadata
  static Future<UnpackResult> unpack(Uint8List data, {
    bool verifyChecksum = true,
    bool headersOnly = false,
  });

  /// Read only headers without decompressing body
  static Future<UnpackResult> readHeaders(Uint8List data);
}
```

### Implementation Strategy

The Dart SDK implements the `.hpack` format natively in pure Dart:

- **Compression**: Uses `dart:io` `ZLibCodec` / `GZipCodec` (available in Flutter) for DEFLATE/gzip
- **VarInt / CRC32 / Encoder / Decoder**: Pure Dart implementation (no FFI, no native plugins)
- **HTML Minifier**: Same logic as the JS minifier, ported to Dart
- **Zero native dependencies**: Works on Android, iOS, Web, Desktop without platform channels

```
hpack_html (Dart package)
  lib/
    src/
      format.dart        # Magic bytes, version, field type constants
      varint.dart         # VarInt encode/decode
      crc32.dart          # CRC32 computation
      minifier.dart       # HTML minifier
      encoder.dart        # Packet encoder
      decoder.dart        # Packet decoder
      compress.dart       # Compression wrapper (ZLibCodec)
    hpack_html.dart       # Public API (pack, unpack, readHeaders)
```

### Platform Support

| Platform | Compression Engine | Notes |
|----------|-------------------|-------|
| Android | `dart:io` ZLibCodec | Native zlib via Dart VM |
| iOS | `dart:io` ZLibCodec | Native zlib via Dart VM |
| Flutter Web | `fflate` via JS interop or pure Dart zlib | Falls back to pure Dart |
| Desktop (macOS/Windows/Linux) | `dart:io` ZLibCodec | Native zlib via Dart VM |

## Rust Decompressor API

### Cargo.toml

```toml
[dependencies]
hpack-html = "0.1"
```

### Basic Usage

```rust
use hpack_html::unpack;

fn main() -> Result<(), hpack_html::Error> {
    let packed: &[u8] = /* received from network */;

    let result = unpack(packed)?;

    println!("URL: {}", result.url);
    println!("HTML length: {}", result.html.len());

    Ok(())
}
```

### Full API

```rust
pub struct UnpackResult {
    pub url: String,
    pub etag: Option<String>,
    pub signature: Option<String>,
    pub content_type: Option<String>,
    pub timestamp: Option<u64>,
    pub encoding: Option<String>,
    pub custom: HashMap<String, String>,
    pub html: String,
    pub version: u8,
    pub minified: bool,
    pub compression: CompressionAlgorithm,
    pub checksum_valid: Option<bool>,
}

pub enum CompressionAlgorithm {
    Deflate,
    Gzip,
}

pub struct UnpackOptions {
    pub verify_checksum: bool,
    pub headers_only: bool,
}

pub fn unpack(data: &[u8]) -> Result<UnpackResult, Error>;
pub fn unpack_with_options(data: &[u8], options: &UnpackOptions) -> Result<UnpackResult, Error>;
pub fn read_headers(data: &[u8]) -> Result<UnpackHeaders, Error>;
```

### Rust Crate Dependencies

```toml
[dependencies]
flate2 = "1"         # DEFLATE/gzip decompression (pure Rust via miniz_oxide)
crc32fast = "1"      # CRC32 checksum verification
```

No C dependencies. Compiles on any target Rust supports.

## Cross-SDK Compatibility Guarantee

All four SDKs (JS compressor, Dart/Flutter compressor, TS decompressor, Rust decompressor) MUST:

1. Agree on the binary format spec (version 1)
2. Pass the same set of test vectors (golden files)
3. Handle all field types defined in the format
4. Reject invalid magic bytes, unknown versions
5. Verify CRC32 checksums identically

Test vectors will be stored in `packages/test-vectors/` as `.hpack` files with corresponding `.json` metadata files describing expected parse results.
