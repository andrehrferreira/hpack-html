## 1. Project Setup
- [ ] 1.1 Create `packages/hpack-html-go/` with `go.mod` (module path TBD)
- [ ] 1.2 Set Go >=1.21, zero external dependencies (stdlib only)
- [ ] 1.3 Create package structure: `hpack.go`, `varint.go`, `decoder.go`, `errors.go`

## 2. Core Primitives
- [ ] 2.1 Implement `varint.go`: `DecodeVarInt(data []byte, offset int) (value uint64, bytesRead int, err error)`
- [ ] 2.2 Implement CRC32 via `hash/crc32` stdlib (IEEE polynomial)
- [ ] 2.3 Implement format constants: magic bytes, version, flags, field types

## 3. Packet Decoder
- [ ] 3.1 Implement `decoder.go`: magic validation, version check, flags parsing
- [ ] 3.2 Implement header section parsing (header length, field count, known + custom fields)
- [ ] 3.3 Implement body extraction (uncompressed length, compressed data, optional CRC32)
- [ ] 3.4 Implement error types: `ErrInvalidMagic`, `ErrUnsupportedVersion`, `ErrTruncatedPacket`, `ErrChecksumMismatch`, `ErrDecompression`

## 4. Decompression
- [ ] 4.1 Implement raw DEFLATE decompression via `compress/flate.NewReader()`
- [ ] 4.2 Implement gzip decompression via `compress/gzip.NewReader()`
- [ ] 4.3 Implement CRC32 verification after decompression

## 5. Public API
- [ ] 5.1 Implement `Unpack(data []byte) (*UnpackResult, error)` with default options
- [ ] 5.2 Implement `UnpackWithOptions(data []byte, opts UnpackOptions) (*UnpackResult, error)`
- [ ] 5.3 Implement `UnpackHeaders(data []byte) (*UnpackResult, error)` (no decompression)
- [ ] 5.4 Define `UnpackResult` struct (URL, ETag, Signature, HTML, Custom map, etc.)
- [ ] 5.5 Define `UnpackOptions` struct (VerifyChecksum, HeadersOnly)

## 6. Optional: Pack Function
- [ ] 6.1 Implement `Pack(html string, opts PackOptions) ([]byte, error)` for server-side packing
- [ ] 6.2 Implement VarInt encode, packet encoder, flags encoding
- [ ] 6.3 Compression via `compress/flate` (raw deflate)
- [ ] 6.4 No HTML minifier (use JS compressor for that)

## 7. Testing
- [ ] 7.1 VarInt unit tests (same test vectors as TS/Rust/Python)
- [ ] 7.2 CRC32 unit tests (RFC 3720 check value)
- [ ] 7.3 Decoder unit tests (valid packets, all error types)
- [ ] 7.4 Cross-SDK validation: decode all 14 canonical .hpack vectors, verify SHA256
- [ ] 7.5 Pack/unpack roundtrip tests (if pack is implemented)
- [ ] 7.6 Benchmark: `go test -bench .` for decompression speed

## 8. Package Files
- [ ] 8.1 README.md with install (`go get`), usage, API reference
- [ ] 8.2 LICENSE (Apache-2.0)
- [ ] 8.3 Add Go job to `.github/workflows/ci.yml`
- [ ] 8.4 Add Go module path to root README SDK list
