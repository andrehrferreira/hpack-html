# Implementation Plan

## Phase 1: Core Format & Utilities

**Goal**: Implement the binary format primitives shared by all SDKs.

### Tasks
1. Initialize monorepo (TypeScript, Vitest, tsup for bundling)
2. Implement `packages/core/`:
   - VarInt encode/decode
   - Magic bytes, version, flag constants
   - Field type constants and registry
   - CRC32 computation (pure JS, small implementation)
   - Shared TypeScript types
3. Write unit tests for all core utilities (100% coverage)

**Deliverable**: `@hpack-html/core` package with zero external dependencies.

## Phase 2: Packet Encoder/Decoder (TypeScript)

**Goal**: Encode and decode the `.hpack` binary format.

### Tasks
1. Implement `packages/core/src/encoder.ts`:
   - Header field serialization
   - Packet assembly (magic + version + flags + headers + body placeholder)
2. Implement `packages/core/src/decoder.ts`:
   - Magic byte validation
   - Version check
   - Flag parsing
   - Header field deserialization
   - Body extraction
3. Implement `readHeaders()` (skip body decompression)
4. Write round-trip tests: encode -> decode -> verify all fields match
5. Write golden file tests with pre-built `.hpack` fixtures

**Deliverable**: Encode/decode functions that work with raw bytes (no compression yet).

## Phase 3: HTML Minifier

**Goal**: Lightweight, safe HTML minifier for preprocessing.

### Tasks
1. Implement `packages/compressor/src/minifier.ts`:
   - Whitespace collapsing
   - Comment removal (preserve conditional comments)
   - Boolean attribute collapsing
   - Attribute sorting
   - Optional closing tag removal
   - Optional attribute quote removal
2. Write extensive tests with real-world HTML samples:
   - Simple pages
   - Malformed HTML
   - Pages with inline scripts/styles
   - Non-ASCII content (CJK, Arabic, Cyrillic)
   - Conditional comments (IE)
   - SVG/MathML embedded content
3. Benchmark minification speed and size reduction

**Deliverable**: `minify(html: string): string` function, pure JS, <3KB.

## Phase 4: JavaScript Compressor

**Goal**: Complete `pack()` function.

### Tasks
1. Implement `packages/compressor/src/compress.ts`:
   - CompressionStream detection and wrapper
   - fflate fallback (dynamic import to avoid bundle cost when native is available)
   - Compression level presets (fast/default/max)
2. Implement `packages/compressor/src/index.ts`:
   - `pack()` function: minify -> compress -> encode packet
   - Input validation
3. Integration tests: pack real HTML, verify output is valid `.hpack`
4. Bundle size verification (<15KB gzipped)
5. Performance benchmarks (compression speed on various HTML sizes)

**Deliverable**: `@hpack-html/compressor` package.

## Phase 5: TypeScript Decompressor

**Goal**: Complete `unpack()` function.

### Tasks
1. Implement `packages/decompressor-ts/src/decompress.ts`:
   - DecompressionStream detection and wrapper
   - fflate fallback for decompression
2. Implement `packages/decompressor-ts/src/index.ts`:
   - `unpack()` function: decode packet -> decompress -> return result
   - `readHeaders()` function
   - CRC32 verification
3. Round-trip tests: pack -> unpack -> verify HTML matches original
4. Error handling tests: corrupted packets, wrong magic, bad checksums
5. Golden file tests: decode pre-built `.hpack` fixtures

**Deliverable**: `@hpack-html/decompressor` package.

## Phase 6: Rust Decompressor

**Goal**: Rust crate that decodes `.hpack` packets.

### Tasks
1. Create `packages/decompressor-rust/`:
   - `Cargo.toml` with `flate2` and `crc32fast` dependencies
   - `src/varint.rs`: VarInt decode
   - `src/decoder.rs`: Packet decoder (magic, version, flags, headers, body)
   - `src/decompress.rs`: DEFLATE/gzip decompression via flate2
   - `src/lib.rs`: Public API (`unpack`, `read_headers`)
   - `src/error.rs`: Error types
2. Unit tests for VarInt, decoder, decompressor
3. Golden file tests: same `.hpack` fixtures as TypeScript SDK
4. Benchmark decompression speed

**Deliverable**: `hpack-html` Rust crate.

## Phase 7: Flutter/Dart SDK

**Goal**: Dart package with full pack/unpack support for Flutter apps.

### Tasks
1. Create `packages/flutter/`:
   - `pubspec.yaml` with zero native dependencies
   - `lib/src/format.dart`: Magic bytes, version, field type constants
   - `lib/src/varint.dart`: VarInt encode/decode
   - `lib/src/crc32.dart`: CRC32 computation
   - `lib/src/minifier.dart`: HTML minifier (port from JS)
   - `lib/src/encoder.dart`: Packet encoder
   - `lib/src/decoder.dart`: Packet decoder
   - `lib/src/compress.dart`: Compression wrapper (`ZLibCodec` / `GZipCodec`)
   - `lib/hpack_html.dart`: Public API (`HpackHtml.pack`, `.unpack`, `.readHeaders`)
2. Unit tests for all components
3. Integration tests: pack in Dart, unpack in Dart, verify roundtrip
4. Platform tests: Android, iOS, Flutter Web, Desktop
5. Golden file tests: same `.hpack` fixtures as other SDKs

**Deliverable**: `hpack_html` Dart package on pub.dev.

## Phase 8: Test Vectors & Cross-SDK Validation

**Goal**: Guarantee all SDKs produce/consume identical results.

### Tasks
1. Create `packages/test-vectors/`:
   - Generate `.hpack` files from the JS compressor covering:
     - Minimal HTML (< 100 bytes)
     - Typical page (~50KB)
     - Large page (~1MB)
     - All header field types
     - Custom metadata fields
     - With/without checksum
     - With/without minification
     - All compression levels
   - Corresponding `.json` files with expected decode results
2. Run all four SDKs against the same test vectors
3. Verify byte-exact HTML output across all SDKs

**Deliverable**: Cross-SDK compatibility verified.

## Phase 9: Documentation & Publishing

### Tasks
1. Write README.md with usage examples for each SDK
2. Generate API documentation (TypeDoc for TS, rustdoc for Rust, dartdoc for Dart)
3. Publish `@hpack-html/compressor` and `@hpack-html/decompressor` to npm
4. Publish `hpack-html` to crates.io
5. Publish `hpack_html` to pub.dev
6. CI/CD pipeline (GitHub Actions: test, lint, build, publish)

## Timeline Estimate

| Phase | Dependencies | Complexity |
|-------|-------------|------------|
| Phase 1: Core | None | Low |
| Phase 2: Encoder/Decoder | Phase 1 | Medium |
| Phase 3: Minifier | None | Medium |
| Phase 4: Compressor | Phase 1, 2, 3 | Medium |
| Phase 5: TS Decompressor | Phase 1, 2 | Low |
| Phase 6: Rust Decompressor | Phase 2 (format spec) | Medium |
| Phase 7: Flutter/Dart SDK | Phase 2 (format spec) | Medium |
| Phase 8: Test Vectors | Phase 4, 5, 6, 7 | Low |
| Phase 9: Docs & Publishing | All | Low |

Phases 3 and 6 can run in parallel with Phase 2.
