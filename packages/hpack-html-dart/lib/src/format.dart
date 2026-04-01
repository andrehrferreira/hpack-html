import 'dart:typed_data';

/// Magic bytes: 0x89 "HPK".
final magic = Uint8List.fromList([0x89, 0x48, 0x50, 0x4B]);
const magicSize = 4;

/// Format version.
const version = 0x01;
const versionSize = 1;
const flagsSize = 1;

/// Flag bits.
const flagMinified = 1 << 0;
const flagChecksum = 1 << 1;
const flagCompressionMask = 0x0C; // bits 2-3
const flagCompressionShift = 2;

/// Compression algorithm IDs.
const compressionDeflate = 0;
const compressionGzip = 1;

/// Header field type IDs.
const fieldUrl = 0x01;
const fieldEtag = 0x02;
const fieldSignature = 0x03;
const fieldContentType = 0x04;
const fieldTimestamp = 0x05;
const fieldEncoding = 0x06;
const fieldCustomStart = 0x10;
const fieldCustomEnd = 0xFF;

/// CRC32 size in bytes.
const crc32Size = 4;

/// Minimum packet size.
const minPacketSize = magicSize + versionSize + flagsSize + 1;

/// Encode flags byte.
int encodeFlags(bool minified, bool checksum, int compression) {
  var flags = 0;
  if (minified) flags |= flagMinified;
  if (checksum) flags |= flagChecksum;
  flags |= (compression & 0x03) << flagCompressionShift;
  return flags;
}

/// Decoded flags.
class DecodedFlags {
  final bool minified;
  final bool checksum;
  final int compression;
  const DecodedFlags(this.minified, this.checksum, this.compression);
}

/// Decode flags byte.
DecodedFlags decodeFlags(int flags) {
  return DecodedFlags(
    (flags & flagMinified) != 0,
    (flags & flagChecksum) != 0,
    (flags & flagCompressionMask) >> flagCompressionShift,
  );
}

/// Check if field type is in custom range.
bool isCustomField(int fieldType) {
  return fieldType >= fieldCustomStart && fieldType <= fieldCustomEnd;
}
