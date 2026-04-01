# hpack-html

[![Crates.io](https://img.shields.io/crates/v/hpack-html.svg)](https://crates.io/crates/hpack-html)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.75%2B-orange.svg)](https://www.rust-lang.org/)

High-performance `.hpack` HTML packet decompressor for Rust. Decodes binary packets produced by the [`hpack-html-js`](https://www.npmjs.com/package/hpack-html-js) JavaScript compressor, decompresses the HTML body (DEFLATE/gzip via `flate2`), and verifies CRC32 integrity.

Pure Rust, no C dependencies.

## Install

```toml
[dependencies]
hpack-html = "0.1"
```

## Usage

```rust
use hpack_html::unpack;

fn main() -> Result<(), hpack_html::Error> {
    let packed: &[u8] = &std::fs::read("page.hpack")?;
    let result = unpack(packed)?;

    println!("URL: {}", result.url);
    println!("ETag: {:?}", result.etag);
    println!("HTML: {} bytes", result.html.len());
    println!("Checksum valid: {:?}", result.checksum_valid);

    Ok(())
}
```

## API

### `unpack(data) -> Result<UnpackResult, Error>`

Decompress and decode an `.hpack` packet with default options (verify checksum, decompress body).

### `unpack_with_options(data, options) -> Result<UnpackResult, Error>`

Decompress with custom options:

```rust
let opts = UnpackOptions {
    verify_checksum: false,  // skip CRC32 check
    headers_only: false,     // set true to skip decompression
};
let result = unpack_with_options(data, &opts)?;
```

### `read_headers(data) -> Result<UnpackResult, Error>`

Parse metadata without decompressing the body. Returns `UnpackResult` with empty `html`.

### `UnpackResult`

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
```

### Error Types

```rust
pub enum Error {
    InvalidMagic,
    UnsupportedVersion(u8),
    TruncatedPacket(String),
    DecompressionFailed(String),
    ChecksumMismatch { expected: u32, actual: u32 },
    InvalidUtf8(FromUtf8Error),
}
```

## Dependencies

| Crate | Purpose |
|-------|---------|
| `flate2` (rust_backend) | DEFLATE/gzip decompression, pure Rust |
| `crc32fast` | CRC32 checksum verification |

No C dependencies. Compiles on any target Rust supports.

## Cross-SDK Compatibility

Tested against real web pages packed by the JavaScript compressor:

| Page | Raw | .hpack | Reduction | SHA256 Match |
|------|-----|--------|-----------|-------------|
| Americanas.com.br | 101.6 KB | 22.0 KB | 78.4% | JS == Rust ✓ |
| Wikipedia | 489.8 KB | 89.7 KB | 81.7% | JS == Rust ✓ |
| Hacker News | 33.7 KB | 5.8 KB | 82.7% | JS == Rust ✓ |

Byte-identical HTML output verified via SHA256 hash comparison between JS and Rust decompressors.

## License

Apache License 2.0 — See [LICENSE](./LICENSE) for details.
