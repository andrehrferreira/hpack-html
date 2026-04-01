import 'dart:convert';
import 'dart:typed_data';
import 'format.dart';
import 'varint.dart';
import 'types.dart';

/// Encode a known header field into bytes.
Uint8List _encodeKnownField(HeaderField field) {
  final valueBytes = utf8.encode(field.value);
  final lenBytes = encodeVarInt(valueBytes.length);
  final result = BytesBuilder();
  result.addByte(field.type);
  result.add(lenBytes);
  result.add(valueBytes);
  return result.toBytes();
}

/// Encode a custom header field into bytes.
Uint8List _encodeCustomField(HeaderField field) {
  final nameBytes = utf8.encode(field.name ?? '');
  final valueBytes = utf8.encode(field.value);
  final valueLenBytes = encodeVarInt(valueBytes.length);
  final result = BytesBuilder();
  result.addByte(field.type);
  result.addByte(nameBytes.length);
  result.add(nameBytes);
  result.add(valueLenBytes);
  result.add(valueBytes);
  return result.toBytes();
}

/// Encode a header field.
Uint8List _encodeField(HeaderField field) {
  return field.type >= fieldCustomStart
      ? _encodeCustomField(field)
      : _encodeKnownField(field);
}

/// Options for encoding a packet.
class EncodePacketOptions {
  final int flags;
  final List<HeaderField> fields;
  final Uint8List compressedBody;
  final int uncompressedLength;
  final int? crc32Value;

  const EncodePacketOptions({
    required this.flags,
    required this.fields,
    required this.compressedBody,
    required this.uncompressedLength,
    this.crc32Value,
  });
}

/// Encode a complete .hpack packet.
Uint8List encodePacket(EncodePacketOptions options) {
  final encodedFields = options.fields.map(_encodeField).toList();
  final fieldCountBytes = encodeVarInt(options.fields.length);

  final headerContentLength =
      fieldCountBytes.length + encodedFields.fold<int>(0, (sum, f) => sum + f.length);
  final headerLenBytes = encodeVarInt(headerContentLength);

  final uncompressedLenBytes = encodeVarInt(options.uncompressedLength);
  final hasCrc = options.crc32Value != null;

  final packet = BytesBuilder();

  // Magic
  packet.add(magic);
  // Version
  packet.addByte(version);
  // Flags
  packet.addByte(options.flags);
  // Header length
  packet.add(headerLenBytes);
  // Field count
  packet.add(fieldCountBytes);
  // Fields
  for (final f in encodedFields) {
    packet.add(f);
  }
  // Uncompressed length
  packet.add(uncompressedLenBytes);
  // Compressed body
  packet.add(options.compressedBody);
  // CRC32 (little-endian)
  if (hasCrc) {
    final crc = options.crc32Value!;
    packet.addByte(crc & 0xFF);
    packet.addByte((crc >> 8) & 0xFF);
    packet.addByte((crc >> 16) & 0xFF);
    packet.addByte((crc >> 24) & 0xFF);
  }

  return packet.toBytes();
}
