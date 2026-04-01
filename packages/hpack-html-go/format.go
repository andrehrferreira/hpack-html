package hpack

// Magic bytes: 0x89 "HPK"
var Magic = []byte{0x89, 0x48, 0x50, 0x4B}

const (
	MagicSize   = 4
	Version     = 0x01
	VersionSize = 1
	FlagsSize   = 1

	FlagMinified        = 1 << 0
	FlagChecksum        = 1 << 1
	FlagCompressionMask = 0x0C
	FlagCompressionShift = 2

	CompressionDeflate = 0
	CompressionGzip    = 1

	FieldURL         = 0x01
	FieldETag        = 0x02
	FieldSignature   = 0x03
	FieldContentType = 0x04
	FieldTimestamp   = 0x05
	FieldEncoding    = 0x06
	FieldCustomStart = 0x10

	CRC32Size     = 4
	MinPacketSize = MagicSize + VersionSize + FlagsSize + 1
)

// EncodeFlags encodes options into a flags byte.
func EncodeFlags(minified, checksum bool, compression int) byte {
	var flags byte
	if minified {
		flags |= FlagMinified
	}
	if checksum {
		flags |= FlagChecksum
	}
	flags |= byte((compression & 0x03) << FlagCompressionShift)
	return flags
}

// DecodedFlags holds parsed flag values.
type DecodedFlags struct {
	Minified    bool
	Checksum    bool
	Compression int
}

// DecodeFlags parses a flags byte.
func DecodeFlags(flags byte) DecodedFlags {
	return DecodedFlags{
		Minified:    flags&FlagMinified != 0,
		Checksum:    flags&FlagChecksum != 0,
		Compression: int((flags & FlagCompressionMask) >> FlagCompressionShift),
	}
}
