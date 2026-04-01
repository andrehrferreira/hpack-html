package hpack

import "fmt"

const maxVarintBytes = 7

// DecodeVarInt decodes a protobuf-style VarInt from data at offset.
// Returns (value, bytesRead, error).
func DecodeVarInt(data []byte, offset int) (uint64, int, error) {
	if offset < 0 || offset >= len(data) {
		return 0, 0, fmt.Errorf("varint offset out of bounds: %d (data length: %d)", offset, len(data))
	}

	var value uint64
	var shift uint
	bytesRead := 0

	for {
		pos := offset + bytesRead
		if pos >= len(data) {
			return 0, 0, fmt.Errorf("varint truncated at offset %d (read %d bytes)", offset, bytesRead)
		}

		b := data[pos]
		bytesRead++

		value |= uint64(b&0x7F) << shift
		shift += 7

		if b&0x80 == 0 {
			break
		}
		if bytesRead >= maxVarintBytes {
			return 0, 0, fmt.Errorf("varint exceeds maximum of %d bytes", maxVarintBytes)
		}
	}

	return value, bytesRead, nil
}

// EncodeVarInt encodes a uint64 as a VarInt byte sequence.
func EncodeVarInt(value uint64) []byte {
	if value == 0 {
		return []byte{0}
	}
	var buf []byte
	remaining := value
	for remaining > 0 {
		b := byte(remaining & 0x7F)
		remaining >>= 7
		if remaining > 0 {
			b |= 0x80
		}
		buf = append(buf, b)
	}
	return buf
}
