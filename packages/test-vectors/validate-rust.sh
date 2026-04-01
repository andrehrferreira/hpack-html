#!/bin/bash
# Validate all test vectors against the Rust decompressor.
# Usage: bash packages/test-vectors/validate-rust.sh
set -e

# Copy latest vectors to Rust fixtures
cp -r "$(dirname "$0")/fixtures" "$(dirname "$0")/../hpack-html-rs/tests/fixtures"

cd "$(dirname "$0")/../hpack-html-rs"
echo "Validating test vectors (Rust decompressor)"
echo ""
cargo test -q
echo ""
echo "Rust validation complete."
