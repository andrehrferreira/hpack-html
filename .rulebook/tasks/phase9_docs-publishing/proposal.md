# Proposal: Documentation & Publishing

## Why
All SDKs are implemented and validated but not yet available to consumers. Publishing to npm (JS/TS packages), crates.io (Rust crate), and pub.dev (Dart package) makes the library usable. Each package needs its own README with installation, usage examples, and API reference. A CI/CD pipeline ensures automated testing and publishing on tagged releases.

## What Changes
- Per-package README.md with installation, quick start, and full API reference
- Generated API docs: TypeDoc (TS), rustdoc (Rust), dartdoc (Dart)
- npm publish for `@hpack-html/core`, `@hpack-html/compressor`, `@hpack-html/decompressor`
- crates.io publish for `hpack-html`
- pub.dev publish for `hpack_html`
- GitHub Actions CI/CD: test -> lint -> build -> publish on version tag
- GitHub release with changelog

## Impact
- Affected specs: None (documentation only)
- Affected code: READMEs, CI config, package metadata
- Breaking change: NO
- User benefit: Can install and use hpack-html from any package manager
