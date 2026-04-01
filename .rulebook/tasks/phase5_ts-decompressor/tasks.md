## 1. Decompression Engine
- [x] 1.1 Implement gzip decompression via fflate `gunzipSync`
- [x] 1.2 Implement raw deflate decompression via fflate `inflateSync`
- [x] 1.3 Auto-detect algorithm from packet flags (deflate vs gzip)

## 2. Unpack Function
- [x] 2.1 Implement `unpack()`: decode packet -> decompress -> return UnpackResult
- [x] 2.2 Implement CRC32 verification with ChecksumMismatchError on mismatch
- [x] 2.3 Implement `checksumValid` field (true/false/undefined)
- [x] 2.4 Implement `verifyChecksum` option (skip check when false)
- [x] 2.5 Implement `headersOnly` option (returns empty html, no decompression)
- [x] 2.6 Implement `readHeaders()` for metadata-only parsing

## 3. Error Handling
- [x] 3.1 Re-export `InvalidMagicError`, `UnsupportedVersionError`, `TruncatedPacketError` from core
- [x] 3.2 Implement `ChecksumMismatchError` with expected vs actual hex values
- [x] 3.3 Implement `DecompressionError` wrapping fflate errors

## 4. Field Extraction
- [x] 4.1 Extract known fields (URL, ETag, Signature, ContentType, Timestamp, Encoding)
- [x] 4.2 Extract custom fields into `custom` Record
- [x] 4.3 Parse timestamp string to number

## 5. Testing
- [x] 5.1 Roundtrip: simple HTML, all metadata fields, minify disabled, empty, large, Unicode <!-- 8 tests -->
- [x] 5.2 headersOnly + readHeaders tests <!-- 2 tests -->
- [x] 5.3 Error tests: bad magic, bad version, truncated, corrupted body, bad CRC32, skip verify <!-- 6 tests -->
- [x] 5.4 All 16 decompressor tests passing <!-- total: 172 tests across all packages -->

## 6. Finalization
- [x] 6.1 Export `unpack`, `readHeaders`, all error classes from package
- [x] 6.2 Package.json with deps on core + fflate
