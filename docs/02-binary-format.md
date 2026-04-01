# Binary Packet Format Specification (`.hpack`)

## Overview

The `.hpack` format is a binary container that wraps compressed HTML with structured metadata. It is designed for minimal overhead, fast parsing, and forward compatibility.

## Format Layout

```
+------------------+------------------+----------------+------------------+------------------+
| Magic (4 bytes)  | Version (1 byte) | Flags (1 byte) | Header Section   | Body Section     |
+------------------+------------------+----------------+------------------+------------------+
```

### Total Minimum Overhead

Magic (4) + Version (1) + Flags (1) + Header Length VarInt (1) + Body Length VarInt (1) + CRC32 (4) = **12 bytes** minimum overhead for an empty packet.

## 1. Magic Bytes (4 bytes)

```
0x89 0x48 0x50 0x4B
```

- `0x89`: Non-ASCII byte (detects binary/text transport corruption, same strategy as PNG)
- `0x48 0x50 0x4B`: ASCII "HPK" (Html PacK)

This sequence does not collide with any known file format signature.

## 2. Version (1 byte)

```
0x01 = version 1
```

Allows future format evolution. Decoders MUST reject versions they don't support.

## 3. Flags (1 byte)

```
Bit 0:    Minified (1 = HTML was minified before compression)
Bit 1:    Has checksum (1 = CRC32 appended after body)
Bit 2-3:  Compression algorithm
            00 = raw deflate
            01 = gzip (deflate + gzip header)
            10 = reserved (future: brotli)
            11 = reserved (future: zstd)
Bit 4-7:  Reserved (must be 0)
```

## 4. Header Section

```
+-------------------+-------------------+-------------------+
| Header Length      | Field Count       | Fields...         |
| (VarInt)          | (VarInt)          |                   |
+-------------------+-------------------+-------------------+
```

### Header Length (VarInt)

Total byte length of the header section (excluding this length field itself). Allows decoders to skip directly to the body if headers are not needed.

### Field Count (VarInt)

Number of header fields that follow.

### Header Fields

Each field:

```
+-------------------+-------------------+-------------------+
| Field Type (1B)   | Value Length       | Value (UTF-8)     |
|                   | (VarInt)          |                   |
+-------------------+-------------------+-------------------+
```

#### Field Types

| Type ID | Name | Description | Required |
|---------|------|-------------|----------|
| `0x01` | URL | Source page URL | Yes |
| `0x02` | ETag | HTTP ETag or content hash | No |
| `0x03` | Signature | Request signature (opaque bytes) | No |
| `0x04` | Content-Type | Original Content-Type header | No |
| `0x05` | Timestamp | Capture time (Unix epoch ms, UTF-8 decimal) | No |
| `0x06` | Encoding | Original page encoding (e.g., "utf-8", "shift_jis") | No |
| `0x07`-`0x0F` | Reserved | Reserved for future standard fields | - |
| `0x10`-`0xFF` | Custom | User-defined metadata fields | No |

#### Custom Fields (0x10-0xFF)

Custom fields use the same structure but include a field name:

```
+-------------------+-------------------+-------------------+-------------------+-------------------+
| Field Type (1B)   | Name Length (1B)  | Name (UTF-8)      | Value Length       | Value (UTF-8)     |
|                   |                   |                   | (VarInt)          |                   |
+-------------------+-------------------+-------------------+-------------------+-------------------+
```

This allows arbitrary key-value metadata without format changes.

## 5. Body Section

```
+-------------------+-------------------+-------------------+
| Uncompressed Len  | Compressed Data   | CRC32 (optional)  |
| (VarInt)          | (remaining bytes) | (4 bytes, LE)     |
+-------------------+-------------------+-------------------+
```

### Uncompressed Length (VarInt)

The byte length of the original HTML (after minification, if applied). Allows decoders to pre-allocate the output buffer for efficient decompression.

### Compressed Data

The compressed HTML bytes. The compression algorithm is indicated by the Flags byte.

For `raw deflate` (flags bits 2-3 = 00): raw DEFLATE stream without gzip/zlib headers.
For `gzip` (flags bits 2-3 = 01): standard gzip format (RFC 1952).

### CRC32 Checksum (4 bytes, optional)

Present only if Flags bit 1 is set. CRC32 of the **uncompressed** HTML (before compression). Little-endian byte order. Allows integrity verification after decompression.

## 6. VarInt Encoding

Protocol Buffers style variable-length integer encoding:

```
Each byte:
  Bits 0-6: 7 bits of data
  Bit 7:    Continuation flag (1 = more bytes follow)

Byte order: little-endian (least significant group first)
```

Examples:
- `0` -> `0x00` (1 byte)
- `127` -> `0x7F` (1 byte)
- `128` -> `0x80 0x01` (2 bytes)
- `300` -> `0xAC 0x02` (2 bytes)
- `16384` -> `0x80 0x80 0x01` (3 bytes)

Maximum supported value: 2^49 - 1 (7 bytes), sufficient for any realistic HTML size.

## 7. Example Packet

Packing the URL `https://example.com` with a 150KB HTML page:

```
89 48 50 4B          # Magic: 0x89 "HPK"
01                   # Version: 1
03                   # Flags: minified=1, checksum=1, compression=raw deflate
1E                   # Header length: 30 bytes
01                   # Field count: 1
01                   # Field type: URL
13                   # Value length: 19 bytes
68 74 74 70 73 ...   # "https://example.com" (UTF-8)
80 A5 09             # Uncompressed length: 153600 (150KB as VarInt)
... compressed data ...
XX XX XX XX          # CRC32 of uncompressed HTML
```

## 8. Versioning Strategy

- **Minor additions** (new field types, new flag bits): backward-compatible, same version byte
- **Breaking changes** (layout change): increment version byte
- Decoders SHOULD ignore unknown field types (forward compatibility)
- Decoders MUST reject unknown versions

## 9. Size Budget

For a typical packet with URL (100 chars) + ETag (32 chars) + Signature (64 chars) + Timestamp:

```
Magic + Version + Flags:    6 bytes
Header overhead:            ~8 bytes (lengths, field types)
URL value:                  100 bytes
ETag value:                 32 bytes
Signature value:            64 bytes
Timestamp value:            13 bytes
Body overhead:              ~8 bytes (uncompressed length + CRC32)
                           ___________
Total overhead:             ~231 bytes
```

Well within the 512-byte target for typical metadata.
