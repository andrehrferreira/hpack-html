package hpack

import "fmt"

// ErrInvalidMagic indicates the packet does not start with valid magic bytes.
var ErrInvalidMagic = fmt.Errorf("invalid .hpack magic bytes")

// UnsupportedVersionError indicates an unknown format version.
type UnsupportedVersionError struct {
	Version byte
}

func (e *UnsupportedVersionError) Error() string {
	return fmt.Sprintf("unsupported .hpack version: %d", e.Version)
}

// TruncatedPacketError indicates the packet data is incomplete.
type TruncatedPacketError struct {
	Message string
}

func (e *TruncatedPacketError) Error() string {
	return fmt.Sprintf("truncated packet: %s", e.Message)
}

// ChecksumMismatchError indicates CRC32 verification failed.
type ChecksumMismatchError struct {
	Expected uint32
	Actual   uint32
}

func (e *ChecksumMismatchError) Error() string {
	return fmt.Sprintf("CRC32 mismatch: expected 0x%08X, got 0x%08X", e.Expected, e.Actual)
}

// DecompressionError indicates DEFLATE/gzip decompression failed.
type DecompressionError struct {
	Cause error
}

func (e *DecompressionError) Error() string {
	return fmt.Sprintf("decompression failed: %v", e.Cause)
}

func (e *DecompressionError) Unwrap() error {
	return e.Cause
}
