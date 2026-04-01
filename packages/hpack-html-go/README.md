# hpack-html-go

[![Go](https://img.shields.io/badge/go-1.21%2B-blue.svg)](https://golang.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

Go SDK for the `.hpack` binary HTML compression format. Pack and unpack HTML pages with structured metadata. Zero external dependencies — stdlib only (`compress/flate`, `compress/gzip`, `hash/crc32`).

## Install

```bash
go get github.com/andrehrferreira/hpack-html-go
```

## Usage

### Unpack

```go
import hpack "github.com/andrehrferreira/hpack-html-go"

data, _ := os.ReadFile("page.hpack")
result, err := hpack.Unpack(data)
if err != nil {
    log.Fatal(err)
}

fmt.Println(result.URL)
fmt.Println(result.HTML[:100])
fmt.Println(*result.ChecksumValid) // true
```

### Pack

```go
packed, err := hpack.Pack("<html>...</html>", hpack.PackOptions{
    URL:      "https://example.com/page",
    ETag:     `"abc123"`,
    Checksum: true,
})
```

### Headers Only

```go
result, _ := hpack.UnpackHeaders(data)
fmt.Println(result.URL) // fast, no decompression
```

## API

- `Unpack(data []byte) (*UnpackResult, error)`
- `UnpackWithOptions(data []byte, opts UnpackOptions) (*UnpackResult, error)`
- `UnpackHeaders(data []byte) (*UnpackResult, error)`
- `Pack(html string, opts PackOptions) ([]byte, error)`

## Cross-SDK Validated

14 canonical test vectors verified with SHA256 byte-exact match across JS, Rust, Python, and Go decompressors.

## License

Apache License 2.0
