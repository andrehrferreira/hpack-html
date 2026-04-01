# hpack-html

[![PyPI](https://img.shields.io/pypi/v/hpack-html.svg)](https://pypi.org/project/hpack-html/)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://python.org/)

Python SDK for the `.hpack` binary HTML compression format. Pack and unpack HTML pages with structured metadata. Zero external dependencies — stdlib only (`zlib`, `gzip`).

## Install

```bash
pip install hpack-html
```

## Usage

### Unpack

```python
from hpack_html import unpack

with open("page.hpack", "rb") as f:
    data = f.read()

result = unpack(data)
print(result.url)             # 'https://example.com/page'
print(result.html[:100])      # '<html>...'
print(result.checksum_valid)  # True
```

### Pack

```python
from hpack_html import pack, PackOptions

packed = pack("<html>...</html>", PackOptions(
    url="https://example.com/page",
    etag='"abc123"',
    checksum=True,
))
```

### Headers Only

```python
from hpack_html import unpack_headers

result = unpack_headers(data)
print(result.url)  # fast, no decompression
```

## API

- `unpack(data, options=None) -> UnpackResult`
- `unpack_headers(data) -> UnpackResult`
- `pack(html, options) -> bytes`

### UnpackResult

```python
@dataclass
class UnpackResult:
    url: str
    etag: str | None
    signature: str | None
    content_type: str | None
    timestamp: int | None
    encoding: str | None
    custom: dict[str, str] | None
    html: str
    version: int
    minified: bool
    compression_algorithm: str  # "deflate" or "gzip"
    checksum_valid: bool | None
```

## Cross-SDK Validated

14 canonical test vectors verified with SHA256 byte-exact match across JS, Rust, Python, and Go decompressors.

## License

Apache License 2.0
