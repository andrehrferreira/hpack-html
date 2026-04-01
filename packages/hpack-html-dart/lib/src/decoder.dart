import 'dart:convert';
import 'dart:typed_data';
import 'format.dart';
import 'varint.dart';
import 'types.dart';

/// Errors.
class InvalidMagicError implements Exception {
  @override
  String toString() => 'InvalidMagicError: Invalid .hpack magic bytes';
}

class UnsupportedVersionError implements Exception {
  final int versionFound;
  UnsupportedVersionError(this.versionFound);
  @override
  String toString() => 'UnsupportedVersionError: version $versionFound';
}

class TruncatedPacketError implements Exception {
  final String message;
  TruncatedPacketError(this.message);
  @override
  String toString() => 'TruncatedPacketError: $message';
}

class ChecksumMismatchError implements Exception {
  final int expected;
  final int actual;
  ChecksumMismatchError(this.expected, this.actual);
  @override
  String toString() =>
      'ChecksumMismatchError: expected 0x${expected.toRadixString(16).padLeft(8, '0')}, '
      'got 0x${actual.toRadixString(16).padLeft(8, '0')}';
}

class DecompressionError implements Exception {
  final String message;
  DecompressionError(this.message);
  @override
  String toString() => 'DecompressionError: $message';
}

/// Internal decoded packet.
class DecodedPacket {
  final int packetVersion;
  final DecodedFlags flags;
  final CompressionAlgorithm compressionAlgorithm;
  final List<HeaderField> fields;
  final Uint8List compressedBody;
  final int uncompressedLength;
  final int? crc32Value;

  DecodedPacket({
    required this.packetVersion,
    required this.flags,
    required this.compressionAlgorithm,
    required this.fields,
    required this.compressedBody,
    required this.uncompressedLength,
    this.crc32Value,
  });
}

/// Decode an .hpack packet structure.
DecodedPacket decodePacket(Uint8List data) {
  if (data.length < minPacketSize) {
    throw TruncatedPacketError(
        'Packet too small: ${data.length} bytes (minimum: $minPacketSize)');
  }

  var offset = 0;

  // Magic
  for (var i = 0; i < magicSize; i++) {
    if (data[i] != magic[i]) throw InvalidMagicError();
  }
  offset += magicSize;

  // Version
  final ver = data[offset++];
  if (ver != version) throw UnsupportedVersionError(ver);

  // Flags
  final flagsByte = data[offset++];
  final flags = decodeFlags(flagsByte);
  final compressionAlgorithm =
      flags.compression == compressionGzip ? CompressionAlgorithm.gzip : CompressionAlgorithm.deflate;

  // Header length
  final headerLen = decodeVarInt(data, offset);
  offset += headerLen.bytesRead;
  final headerEnd = offset + headerLen.value;

  if (headerEnd > data.length) {
    throw TruncatedPacketError('Header section extends beyond packet');
  }

  // Field count
  final fieldCount = decodeVarInt(data, offset);
  offset += fieldCount.bytesRead;

  // Fields
  final fields = <HeaderField>[];
  for (var i = 0; i < fieldCount.value; i++) {
    if (offset >= headerEnd) {
      throw TruncatedPacketError('Header field $i extends beyond header section');
    }

    final fieldType = data[offset++];

    if (fieldType >= fieldCustomStart) {
      if (offset >= headerEnd) {
        throw TruncatedPacketError('Custom field $i name length missing');
      }
      final nameLen = data[offset++];
      if (offset + nameLen > headerEnd) {
        throw TruncatedPacketError('Custom field $i name truncated');
      }
      final name = utf8.decode(data.sublist(offset, offset + nameLen));
      offset += nameLen;

      final valueLen = decodeVarInt(data, offset);
      offset += valueLen.bytesRead;
      if (offset + valueLen.value > headerEnd) {
        throw TruncatedPacketError('Custom field $i value truncated');
      }
      final value = utf8.decode(data.sublist(offset, offset + valueLen.value));
      offset += valueLen.value;

      fields.add(HeaderField(type: fieldType, name: name, value: value));
    } else {
      final valueLen = decodeVarInt(data, offset);
      offset += valueLen.bytesRead;
      if (offset + valueLen.value > headerEnd) {
        throw TruncatedPacketError('Field $i (type 0x${fieldType.toRadixString(16)}) value truncated');
      }
      final value = utf8.decode(data.sublist(offset, offset + valueLen.value));
      offset += valueLen.value;

      fields.add(HeaderField(type: fieldType, value: value));
    }
  }

  // Skip remaining header bytes
  offset = headerEnd;

  // Body section
  if (offset >= data.length) {
    throw TruncatedPacketError('Body section missing');
  }

  final uncompressedLen = decodeVarInt(data, offset);
  offset += uncompressedLen.bytesRead;

  final crcSz = flags.checksum ? crc32Size : 0;
  final compressedBodyEnd = data.length - crcSz;

  if (offset > compressedBodyEnd) {
    throw TruncatedPacketError('Compressed body truncated');
  }

  final compressedBody = data.sublist(offset, compressedBodyEnd);

  int? crc32Val;
  if (flags.checksum) {
    final crcOff = compressedBodyEnd;
    if (crcOff + crc32Size > data.length) {
      throw TruncatedPacketError('CRC32 checksum truncated');
    }
    crc32Val = data[crcOff] |
        (data[crcOff + 1] << 8) |
        (data[crcOff + 2] << 16) |
        (data[crcOff + 3] << 24);
    crc32Val = crc32Val & 0xFFFFFFFF; // unsigned
  }

  return DecodedPacket(
    packetVersion: ver,
    flags: flags,
    compressionAlgorithm: compressionAlgorithm,
    fields: fields,
    compressedBody: compressedBody,
    uncompressedLength: uncompressedLen.value,
    crc32Value: crc32Val,
  );
}
