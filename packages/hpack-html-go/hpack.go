// Package hpack implements the .hpack binary HTML compression format.
//
// Provides Unpack/UnpackHeaders for decompressing packets and Pack for creating them.
// Zero external dependencies — uses only Go stdlib (compress/flate, compress/gzip, hash/crc32).
package hpack

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"io"
	"strconv"
	"time"
)

// UnpackResult holds the decoded packet data.
type UnpackResult struct {
	URL                  string
	ETag                 *string
	Signature            *string
	ContentType          *string
	Timestamp            *int64
	Encoding             *string
	Custom               map[string]string
	HTML                 string
	Version              byte
	Minified             bool
	CompressionAlgorithm string // "deflate" or "gzip"
	ChecksumValid        *bool
}

// UnpackOptions controls unpack behavior.
type UnpackOptions struct {
	VerifyChecksum bool
	HeadersOnly    bool
}

// DefaultUnpackOptions returns options with checksum verification enabled.
func DefaultUnpackOptions() UnpackOptions {
	return UnpackOptions{VerifyChecksum: true, HeadersOnly: false}
}

// Unpack decodes an .hpack binary packet with default options.
func Unpack(data []byte) (*UnpackResult, error) {
	opts := DefaultUnpackOptions()
	return UnpackWithOptions(data, opts)
}

// UnpackHeaders reads only metadata without decompressing the body.
func UnpackHeaders(data []byte) (*UnpackResult, error) {
	return UnpackWithOptions(data, UnpackOptions{HeadersOnly: true})
}

// UnpackWithOptions decodes an .hpack packet with custom options.
func UnpackWithOptions(data []byte, opts UnpackOptions) (*UnpackResult, error) {
	pkt, err := decodePacket(data)
	if err != nil {
		return nil, err
	}

	result := extractFields(pkt.fields)
	result.Version = pkt.version
	result.Minified = pkt.minified
	if pkt.compression == CompressionGzip {
		result.CompressionAlgorithm = "gzip"
	} else {
		result.CompressionAlgorithm = "deflate"
	}

	if opts.HeadersOnly {
		return result, nil
	}

	// Decompress
	decompressed, err := decompress(pkt.compressedBody, pkt.compression)
	if err != nil {
		return nil, err
	}

	// CRC32
	if pkt.hasChecksum && pkt.crc32 != nil {
		actual := crc32.ChecksumIEEE(decompressed)
		valid := actual == *pkt.crc32
		result.ChecksumValid = &valid
		if opts.VerifyChecksum && !valid {
			return nil, &ChecksumMismatchError{Expected: *pkt.crc32, Actual: actual}
		}
	}

	result.HTML = string(decompressed)
	return result, nil
}

// --- internal types ---

type headerField struct {
	fieldType byte
	name      string // only for custom fields
	value     string
}

type decodedPacket struct {
	version        byte
	minified       bool
	hasChecksum    bool
	compression    int
	fields         []headerField
	compressedBody []byte
	uncompressedLen int
	crc32          *uint32
}

func decodePacket(data []byte) (*decodedPacket, error) {
	if len(data) < MinPacketSize {
		return nil, &TruncatedPacketError{Message: fmt.Sprintf("packet too small: %d bytes", len(data))}
	}

	offset := 0

	// Magic
	if !bytes.Equal(data[:MagicSize], Magic) {
		return nil, ErrInvalidMagic
	}
	offset += MagicSize

	// Version
	ver := data[offset]; offset++
	if ver != Version {
		return nil, &UnsupportedVersionError{Version: ver}
	}

	// Flags
	flagsByte := data[offset]; offset++
	flags := DecodeFlags(flagsByte)

	// Header length
	headerLen, n, err := DecodeVarInt(data, offset)
	if err != nil {
		return nil, &TruncatedPacketError{Message: err.Error()}
	}
	offset += n
	headerEnd := offset + int(headerLen)
	if headerEnd > len(data) {
		return nil, &TruncatedPacketError{Message: "header section extends beyond packet"}
	}

	// Field count
	fieldCount, n, err := DecodeVarInt(data, offset)
	if err != nil {
		return nil, &TruncatedPacketError{Message: err.Error()}
	}
	offset += n

	// Fields
	fields := make([]headerField, 0, fieldCount)
	for i := 0; i < int(fieldCount); i++ {
		if offset >= headerEnd {
			return nil, &TruncatedPacketError{Message: fmt.Sprintf("field %d extends beyond header", i)}
		}

		ft := data[offset]; offset++

		if ft >= FieldCustomStart {
			if offset >= headerEnd {
				return nil, &TruncatedPacketError{Message: fmt.Sprintf("custom field %d name length missing", i)}
			}
			nameLen := int(data[offset]); offset++
			if offset+nameLen > headerEnd {
				return nil, &TruncatedPacketError{Message: fmt.Sprintf("custom field %d name truncated", i)}
			}
			name := string(data[offset : offset+nameLen]); offset += nameLen

			valueLen, n, err := DecodeVarInt(data, offset)
			if err != nil {
				return nil, &TruncatedPacketError{Message: err.Error()}
			}
			offset += n
			if offset+int(valueLen) > headerEnd {
				return nil, &TruncatedPacketError{Message: fmt.Sprintf("custom field %d value truncated", i)}
			}
			value := string(data[offset : offset+int(valueLen)]); offset += int(valueLen)

			fields = append(fields, headerField{fieldType: ft, name: name, value: value})
		} else {
			valueLen, n, err := DecodeVarInt(data, offset)
			if err != nil {
				return nil, &TruncatedPacketError{Message: err.Error()}
			}
			offset += n
			if offset+int(valueLen) > headerEnd {
				return nil, &TruncatedPacketError{Message: fmt.Sprintf("field %d value truncated", i)}
			}
			value := string(data[offset : offset+int(valueLen)]); offset += int(valueLen)

			fields = append(fields, headerField{fieldType: ft, value: value})
		}
	}

	offset = headerEnd

	// Body
	if offset >= len(data) {
		return nil, &TruncatedPacketError{Message: "body section missing"}
	}

	uncompressedLen, n, err := DecodeVarInt(data, offset)
	if err != nil {
		return nil, &TruncatedPacketError{Message: err.Error()}
	}
	offset += n

	crcSize := 0
	if flags.Checksum {
		crcSize = CRC32Size
	}
	bodyEnd := len(data) - crcSize
	if offset > bodyEnd {
		return nil, &TruncatedPacketError{Message: "compressed body truncated"}
	}

	compressedBody := data[offset:bodyEnd]

	var crc32Val *uint32
	if flags.Checksum {
		v := binary.LittleEndian.Uint32(data[bodyEnd:])
		crc32Val = &v
	}

	return &decodedPacket{
		version:         ver,
		minified:        flags.Minified,
		hasChecksum:     flags.Checksum,
		compression:     flags.Compression,
		fields:          fields,
		compressedBody:  compressedBody,
		uncompressedLen: int(uncompressedLen),
		crc32:           crc32Val,
	}, nil
}

func extractFields(fields []headerField) *UnpackResult {
	result := &UnpackResult{}
	for _, f := range fields {
		switch f.fieldType {
		case FieldURL:
			result.URL = f.value
		case FieldETag:
			s := f.value; result.ETag = &s
		case FieldSignature:
			s := f.value; result.Signature = &s
		case FieldContentType:
			s := f.value; result.ContentType = &s
		case FieldTimestamp:
			if v, err := strconv.ParseInt(f.value, 10, 64); err == nil {
				result.Timestamp = &v
			}
		case FieldEncoding:
			s := f.value; result.Encoding = &s
		default:
			if f.fieldType >= FieldCustomStart && f.name != "" {
				if result.Custom == nil {
					result.Custom = make(map[string]string)
				}
				result.Custom[f.name] = f.value
			}
		}
	}
	return result
}

func decompress(data []byte, algorithm int) ([]byte, error) {
	switch algorithm {
	case CompressionGzip:
		r, err := gzip.NewReader(bytes.NewReader(data))
		if err != nil {
			return nil, &DecompressionError{Cause: err}
		}
		defer r.Close()
		out, err := io.ReadAll(r)
		if err != nil {
			return nil, &DecompressionError{Cause: err}
		}
		return out, nil
	default: // deflate
		r := flate.NewReader(bytes.NewReader(data))
		defer r.Close()
		out, err := io.ReadAll(r)
		if err != nil {
			return nil, &DecompressionError{Cause: err}
		}
		return out, nil
	}
}

// --- Pack ---

// PackOptions controls packet creation.
type PackOptions struct {
	URL         string
	ETag        string
	Signature   string
	ContentType string
	Timestamp   int64 // 0 = use current time
	Encoding    string
	Custom      map[string]string
	Level       int  // 1-9, default 6
	Checksum    bool
}

// Pack creates an .hpack packet from HTML and options.
// No HTML minification (use the JS compressor for that).
func Pack(html string, opts PackOptions) ([]byte, error) {
	if opts.URL == "" {
		return nil, fmt.Errorf("PackOptions.URL is required")
	}
	if opts.Level == 0 {
		opts.Level = 6
	}

	htmlBytes := []byte(html)

	// Compress (raw deflate)
	var compBuf bytes.Buffer
	w, err := flate.NewWriter(&compBuf, opts.Level)
	if err != nil {
		return nil, err
	}
	if _, err := w.Write(htmlBytes); err != nil {
		return nil, err
	}
	if err := w.Close(); err != nil {
		return nil, err
	}
	compressed := compBuf.Bytes()

	// CRC32
	var crc32Val *uint32
	if opts.Checksum {
		v := crc32.ChecksumIEEE(htmlBytes)
		crc32Val = &v
	}

	// Fields
	var fieldsData []byte
	fieldCount := 0

	fieldsData = append(fieldsData, encodeKnownField(FieldURL, opts.URL)...)
	fieldCount++

	if opts.ETag != "" {
		fieldsData = append(fieldsData, encodeKnownField(FieldETag, opts.ETag)...)
		fieldCount++
	}
	if opts.Signature != "" {
		fieldsData = append(fieldsData, encodeKnownField(FieldSignature, opts.Signature)...)
		fieldCount++
	}
	if opts.ContentType != "" {
		fieldsData = append(fieldsData, encodeKnownField(FieldContentType, opts.ContentType)...)
		fieldCount++
	}

	ts := opts.Timestamp
	if ts == 0 {
		ts = time.Now().UnixMilli()
	}
	fieldsData = append(fieldsData, encodeKnownField(FieldTimestamp, strconv.FormatInt(ts, 10))...)
	fieldCount++

	if opts.Encoding != "" {
		fieldsData = append(fieldsData, encodeKnownField(FieldEncoding, opts.Encoding)...)
		fieldCount++
	}

	customType := byte(FieldCustomStart)
	for name, value := range opts.Custom {
		fieldsData = append(fieldsData, encodeCustomField(customType, name, value)...)
		fieldCount++
		customType++
	}

	// Header
	fieldCountBytes := EncodeVarInt(uint64(fieldCount))
	headerContent := append(fieldCountBytes, fieldsData...)
	headerLenBytes := EncodeVarInt(uint64(len(headerContent)))

	flags := EncodeFlags(false, opts.Checksum, CompressionDeflate)

	// Assemble
	var packet []byte
	packet = append(packet, Magic...)
	packet = append(packet, Version)
	packet = append(packet, flags)
	packet = append(packet, headerLenBytes...)
	packet = append(packet, headerContent...)
	packet = append(packet, EncodeVarInt(uint64(len(htmlBytes)))...)
	packet = append(packet, compressed...)

	if crc32Val != nil {
		crcBytes := make([]byte, 4)
		binary.LittleEndian.PutUint32(crcBytes, *crc32Val)
		packet = append(packet, crcBytes...)
	}

	return packet, nil
}

func encodeKnownField(fieldType byte, value string) []byte {
	vb := []byte(value)
	var buf []byte
	buf = append(buf, fieldType)
	buf = append(buf, EncodeVarInt(uint64(len(vb)))...)
	buf = append(buf, vb...)
	return buf
}

func encodeCustomField(fieldType byte, name, value string) []byte {
	nb := []byte(name)
	vb := []byte(value)
	var buf []byte
	buf = append(buf, fieldType, byte(len(nb)))
	buf = append(buf, nb...)
	buf = append(buf, EncodeVarInt(uint64(len(vb)))...)
	buf = append(buf, vb...)
	return buf
}
