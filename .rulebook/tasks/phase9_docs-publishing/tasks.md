## 1. Per-Package Documentation
- [ ] 1.1 Write `packages/core/README.md` with API reference for VarInt, CRC32, format constants
- [ ] 1.2 Write `packages/compressor/README.md` with installation, quick start, full pack() API, bundle size notes
- [ ] 1.3 Write `packages/decompressor-ts/README.md` with installation, quick start, full unpack() API, error handling
- [ ] 1.4 Write `packages/decompressor-rust/README.md` with cargo install, usage, API, no_std notes
- [ ] 1.5 Write `packages/flutter/README.md` with pubspec install, usage, platform support matrix
- [ ] 1.6 Update root README.md with final published package links and badges

## 2. API Documentation Generation
- [ ] 2.1 Configure and generate TypeDoc for `@hpack-html/core`, `@hpack-html/compressor`, `@hpack-html/decompressor`
- [ ] 2.2 Configure and generate rustdoc for `hpack-html` crate
- [ ] 2.3 Configure and generate dartdoc for `hpack_html` package
- [ ] 2.4 Verify all public APIs are documented with examples

## 3. Package Metadata
- [ ] 3.1 Finalize `package.json` for all npm packages: name, version, description, keywords, repository, license, files
- [ ] 3.2 Finalize `Cargo.toml`: name, version, description, keywords, categories, repository, license
- [ ] 3.3 Finalize `pubspec.yaml`: name, version, description, homepage, repository, environment constraints
- [ ] 3.4 Add LICENSE file (MIT) to root and each package

## 4. CI/CD Pipeline
- [ ] 4.1 Create GitHub Actions workflow: test all TypeScript packages (Vitest)
- [ ] 4.2 Add Rust test step (`cargo test`) to CI
- [ ] 4.3 Add Dart test step (`dart test`) to CI
- [ ] 4.4 Add lint steps: `eslint` (TS), `cargo clippy` (Rust), `dart analyze` (Dart)
- [ ] 4.5 Add cross-SDK test vector validation step
- [ ] 4.6 Add publish workflow triggered on version tags (npm publish, cargo publish, dart pub publish)
- [ ] 4.7 Add bundle size check step (fail if compressor > 15KB gzipped)

## 5. Publishing
- [ ] 5.1 Publish `@hpack-html/core` to npm
- [ ] 5.2 Publish `@hpack-html/compressor` to npm
- [ ] 5.3 Publish `@hpack-html/decompressor` to npm
- [ ] 5.4 Publish `hpack-html` to crates.io
- [ ] 5.5 Publish `hpack_html` to pub.dev
- [ ] 5.6 Create GitHub release with changelog and links to all published packages

## 6. Verification
- [ ] 6.1 Install each package from registry in a clean project, verify it works
- [ ] 6.2 Verify cross-registry roundtrip: npm compressor -> crates.io decompressor
- [ ] 6.3 Verify cross-registry roundtrip: pub.dev compressor -> npm decompressor
