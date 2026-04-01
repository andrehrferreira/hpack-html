# Roadmap

## Visual Overview

```
PHASE 1          PHASE 2          PHASE 3          PHASE 4
Core             Encoder/         Minifier         JS Compressor
Primitives       Decoder          (HTML)           (pack)
                                                   
 VarInt           Serialize        Whitespace       CompressionStream
 CRC32            Headers          Comments         fflate fallback
 Constants        Magic/Ver/       Attr sort        Level presets
 Types            Flags parse      Bool attrs       pack() API
                  Body extract     Opt tags         Bundle <15KB
                  readHeaders()    Opt quotes       
                                                   
[============]   [============]   [============]   [============]
    Week 1            Week 2           Week 2           Week 3
                          |                |                |
                          +-------+--------+                |
                                  |                         |
                                  v                         v
                          PHASE 5                    PHASE 4
                          TS Decompressor            depends on
                          (unpack)                   1 + 2 + 3
```

## Dependency Graph

```
                    ┌─────────────────┐
                    │   Phase 1       │
                    │   Core          │
                    │   Primitives    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              v              v              v
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Phase 2   │  │  Phase 3   │  │  (no dep)  │
     │  Encoder/  │  │  Minifier  │  │            │
     │  Decoder   │  │            │  │            │
     └─────┬──────┘  └──────┬─────┘  └────────────┘
           │                │
     ┌─────┼────────────────┤
     │     │                │
     │     v                v
     │  ┌─────────────────────┐
     │  │     Phase 4         │
     │  │  JS Compressor      │
     │  │  (pack)             │
     │  └─────────┬───────────┘
     │            │
     ├────────────┼──────────────────────────┐
     │            │                          │
     v            v                          v
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Phase 5  │ │ Phase 6  │ │ Phase 7  │ │          │
│ TS       │ │ Rust     │ │ Flutter  │ │          │
│ Decomp   │ │ Decomp   │ │ Dart SDK │ │          │
└────┬─────┘ └────┬─────┘ └────┬─────┘ │          │
     │            │            │        │          │
     └────────────┼────────────┘        │          │
                  │                     │          │
                  v                     │          │
           ┌──────────┐                │          │
           │ Phase 8  │                │          │
           │ Test     │◄───────────────┘          │
           │ Vectors  │                           │
           └────┬─────┘                           │
                │                                 │
                v                                 │
           ┌──────────┐                           │
           │ Phase 9  │◄──────────────────────────┘
           │ Docs &   │
           │ Publish  │
           └──────────┘
```

## Phases in Detail

### Phase 1: Core Primitives
> **Blocks**: Everything. This is the foundation.

| Task | Output | Tests |
|------|--------|-------|
| VarInt encode/decode | `varint.ts` | Encode/decode roundtrip, edge cases (0, 127, 128, 16384, max) |
| Magic bytes, version, flag constants | `format.ts` | Constant validation |
| Field type registry | `fields.ts` | Known/custom field type resolution |
| CRC32 computation | `crc32.ts` | Known test vectors (RFC 3720) |
| Shared TypeScript types | `types.ts` | Type compilation check |

**Exit criteria**: All core functions passing 100% tests, zero external deps.

---

### Phase 2: Packet Encoder/Decoder
> **Depends on**: Phase 1
> **Can run in parallel with**: Phase 3

| Task | Output | Tests |
|------|--------|-------|
| Header field serialization | `encoder.ts` | Single field, multiple fields, custom fields |
| Packet assembly | `encoder.ts` | Full packet with all field types |
| Magic byte validation | `decoder.ts` | Valid magic, invalid magic, truncated |
| Version/flags parsing | `decoder.ts` | All flag combinations |
| Header deserialization | `decoder.ts` | All field types, unknown fields (forward compat) |
| Body extraction | `decoder.ts` | With/without CRC32, various body sizes |
| `readHeaders()` | `decoder.ts` | Headers-only mode skips body |
| Round-trip tests | `encoder.test.ts` | Encode -> Decode -> verify equality |
| Golden file fixtures | `fixtures/` | Pre-built `.hpack` files for cross-SDK use |

**Exit criteria**: encode(decode(packet)) === packet for all field combinations.

---

### Phase 3: HTML Minifier
> **Depends on**: Nothing (can start immediately)
> **Can run in parallel with**: Phase 2

| Task | Output | Tests |
|------|--------|-------|
| Whitespace collapsing | `minifier.ts` | Inline, block, pre/code/textarea preserved |
| Comment removal | `minifier.ts` | Regular, conditional `<!--[if]>`, IE downlevel |
| Boolean attribute collapse | `minifier.ts` | `checked="checked"` -> `checked` |
| Attribute sorting | `minifier.ts` | Alphabetical, improves compression ratio |
| Optional closing tags | `minifier.ts` | `</li>`, `</td>`, `</tr>`, `</p>`, `</option>` |
| Optional quote removal | `minifier.ts` | Safe only (no spaces, quotes, `=`, `>` in value) |
| Malformed HTML handling | `minifier.ts` | Unclosed tags, nested errors, partial docs |
| Non-ASCII preservation | `minifier.ts` | CJK, Arabic, Cyrillic, emoji |
| Inline script/style safety | `minifier.ts` | Never modify content inside `<script>`/`<style>` |
| SVG/MathML passthrough | `minifier.ts` | Foreign content untouched |

**Exit criteria**: `minify(html)` renders identically in browser, <3KB bundle, 5-15% size reduction.

---

### Phase 4: JavaScript Compressor
> **Depends on**: Phase 1 + 2 + 3

| Task | Output | Tests |
|------|--------|-------|
| `CompressionStream` detection | `compress.ts` | Feature detection, gzip output |
| fflate fallback | `compress.ts` | Raw deflate when native unavailable |
| Level presets (fast/default/max) | `compress.ts` | Level 1/6/9 mapping |
| `pack()` function | `index.ts` | minify -> compress -> encode pipeline |
| Input validation | `index.ts` | Empty HTML, missing URL, invalid options |
| Bundle size check | CI | `< 15KB` gzipped verified |
| Performance benchmark | `bench/` | < 10ms for 100KB HTML |

**Exit criteria**: `pack()` produces valid `.hpack` packets, bundle <15KB, <10ms for 100KB.

---

### Phase 5: TypeScript Decompressor
> **Depends on**: Phase 1 + 2

| Task | Output | Tests |
|------|--------|-------|
| `DecompressionStream` wrapper | `decompress.ts` | Native decompression path |
| fflate fallback | `decompress.ts` | Inflate when native unavailable |
| `unpack()` function | `index.ts` | Decode -> decompress -> result |
| `readHeaders()` function | `index.ts` | Headers without body decompression |
| CRC32 verification | `index.ts` | Valid checksum, invalid checksum, missing |
| Round-trip tests | `integration.test.ts` | pack() -> unpack() -> compare HTML |
| Error handling | `error.test.ts` | Corrupted, truncated, wrong magic, bad version |
| Golden file tests | `golden.test.ts` | Decode pre-built fixtures |

**Exit criteria**: `unpack(pack(html))` === html for all test cases.

---

### Phase 6: Rust Decompressor
> **Depends on**: Phase 2 (format spec)
> **Can run in parallel with**: Phase 5, 7

| Task | Output | Tests |
|------|--------|-------|
| VarInt decode | `varint.rs` | Same test vectors as JS |
| Packet decoder | `decoder.rs` | Magic, version, flags, headers, body |
| DEFLATE/gzip decompression | `decompress.rs` | Via `flate2` with `miniz_oxide` |
| CRC32 verification | `lib.rs` | Via `crc32fast` |
| `unpack()` / `read_headers()` | `lib.rs` | Public API |
| Error types | `error.rs` | `InvalidMagic`, `UnsupportedVersion`, `ChecksumMismatch`, etc. |
| Golden file tests | `tests/` | Same `.hpack` fixtures as TS SDK |
| Decompression benchmark | `benches/` | < 1ms for 100KB HTML |

**Exit criteria**: Rust `unpack()` produces identical output to TS `unpack()` for all test vectors.

---

### Phase 7: Flutter/Dart SDK
> **Depends on**: Phase 2 (format spec)
> **Can run in parallel with**: Phase 5, 6

| Task | Output | Tests |
|------|--------|-------|
| Format constants | `format.dart` | Magic, version, field types |
| VarInt encode/decode | `varint.dart` | Same test vectors as JS/Rust |
| CRC32 computation | `crc32.dart` | RFC 3720 test vectors |
| HTML minifier (port from JS) | `minifier.dart` | Same test cases as JS minifier |
| Packet encoder | `encoder.dart` | All field types, custom fields |
| Packet decoder | `decoder.dart` | All field types, error cases |
| Compression (`ZLibCodec`) | `compress.dart` | DEFLATE/gzip via `dart:io` |
| `HpackHtml.pack()` | `hpack_html.dart` | Full pipeline |
| `HpackHtml.unpack()` | `hpack_html.dart` | Full pipeline |
| `HpackHtml.readHeaders()` | `hpack_html.dart` | Headers-only |
| Golden file tests | `test/` | Same `.hpack` fixtures |
| Platform matrix | CI | Android, iOS, Web, Desktop |

**Exit criteria**: Dart `pack()`/`unpack()` roundtrip works, golden files pass, all platforms green.

---

### Phase 8: Test Vectors & Cross-SDK Validation
> **Depends on**: Phase 4 + 5 + 6 + 7

| Vector | Description | Validates |
|--------|-------------|-----------|
| `minimal.hpack` | `<h1>Hi</h1>` (< 100 bytes) | Small payload handling |
| `typical.hpack` | ~50KB real-world page | Normal operation |
| `large.hpack` | ~1MB page | Large buffer handling |
| `all-fields.hpack` | Every header field type populated | Full field support |
| `custom-fields.hpack` | Custom `0x10`-`0xFF` fields | Extension mechanism |
| `no-checksum.hpack` | Flags bit 1 = 0 | Optional CRC32 |
| `no-minify.hpack` | Flags bit 0 = 0 | Raw HTML passthrough |
| `level-fast.hpack` | Level 1 compression | Level variation |
| `level-max.hpack` | Level 9 compression | Level variation |
| `unicode-heavy.hpack` | CJK/Arabic/emoji content | Encoding correctness |
| `empty-body.hpack` | Empty HTML string | Edge case |
| `max-url.hpack` | 2KB URL | Large header field |

**Validation matrix:**

| Vector | JS pack | TS unpack | Rust unpack | Dart pack | Dart unpack |
|--------|---------|-----------|-------------|-----------|-------------|
| Each vector | Generate | Verify | Verify | Generate | Verify |

**Exit criteria**: All SDKs produce byte-identical HTML from every test vector.

---

### Phase 9: Documentation & Publishing
> **Depends on**: All phases

| Task | Output |
|------|--------|
| README.md per package | Usage examples, API reference |
| TypeDoc generation | `@hpack-html/compressor`, `@hpack-html/decompressor` |
| rustdoc generation | `hpack-html` crate |
| dartdoc generation | `hpack_html` package |
| npm publish | `@hpack-html/core`, `@hpack-html/compressor`, `@hpack-html/decompressor` |
| crates.io publish | `hpack-html` |
| pub.dev publish | `hpack_html` |
| GitHub Actions CI | Test + lint + build + publish on tag |
| GitHub release | Changelog, binaries, links |

---

## Parallelism Map

```
Week 1:   [Phase 1: Core]──────────────────────────────►
          [Phase 3: Minifier]───────────────────────────►

Week 2:   [Phase 2: Encoder/Decoder]───────────────────►

Week 3:                    [Phase 4: JS Compressor]────►
                           [Phase 5: TS Decompressor]──►

Week 4:   [Phase 6: Rust Decompressor]────────────────►
          [Phase 7: Flutter/Dart SDK]─────────────────►

Week 5:            [Phase 8: Test Vectors & Validation]►
                   [Phase 9: Docs & Publishing]────────►
```

**Maximum parallelism at Week 4**: Phases 6 and 7 can run simultaneously since they only depend on the format spec (Phase 2).

## Milestones

| Milestone | Phases Complete | What You Can Do |
|-----------|----------------|-----------------|
| **M1: Format Defined** | 1, 2 | Encode/decode `.hpack` packets in TypeScript |
| **M2: JS Compressor Ready** | 1, 2, 3, 4 | Pack HTML in Chrome extension / browser |
| **M3: TS Round-Trip** | 1-5 | Pack in browser, unpack on Node.js server |
| **M4: Rust Server** | 1-6 | Pack in browser, unpack on Rust server (production) |
| **M5: Flutter Ready** | 1-7 | Pack in Flutter app, unpack anywhere |
| **M6: Validated** | 1-8 | All SDKs cross-validated with golden tests |
| **M7: Published** | 1-9 | npm, crates.io, pub.dev packages live |

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| `CompressionStream` not available in target browser | Fallback to fflate (8KB) | Already planned as dual-engine |
| Chrome extension CSP blocks `new Function` / eval | fflate is CSP-safe (no eval) | Verified: fflate uses no dynamic code |
| `dart:io` not available on Flutter Web | Use pure Dart zlib or JS interop | Test early in Phase 7 |
| Malformed HTML breaks minifier | Minifier must be fault-tolerant | Extensive fuzz testing in Phase 3 |
| VarInt overflow on huge HTML (>2GB) | 7-byte VarInt supports up to 2^49 | Sufficient for any realistic HTML |
| Cross-SDK CRC32 mismatch | Use standard CRC32 (ISO 3309) | Golden file tests catch this |
