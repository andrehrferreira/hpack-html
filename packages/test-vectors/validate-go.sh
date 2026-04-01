#!/bin/bash
# Validate all test vectors against the Go decompressor.
# Usage: bash packages/test-vectors/validate-go.sh
set -e
cd "$(dirname "$0")/../hpack-html-go"
echo "Validating test vectors (Go decompressor)"
echo ""
go test -v -run TestCrossSDKVectors ./...
echo ""
echo "Go validation complete."
