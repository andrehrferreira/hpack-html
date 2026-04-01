import 'dart:io';
import 'dart:typed_data';
import 'types.dart';

/// Compression level mapping.
const _levelMap = {
  CompressionLevel.fast: 1,
  CompressionLevel.defaultLevel: 6,
  CompressionLevel.max: 9,
};

/// Result of compression.
class CompressResult {
  final Uint8List compressed;
  final bool isGzip;
  const CompressResult(this.compressed, this.isGzip);
}

/// Compress data using ZLib (raw deflate).
CompressResult compress(Uint8List data, [CompressionLevel level = CompressionLevel.defaultLevel]) {
  final numericLevel = _levelMap[level] ?? 6;
  final codec = ZLibCodec(level: numericLevel, raw: true);
  final compressed = codec.encode(data);
  return CompressResult(Uint8List.fromList(compressed), false);
}

/// Decompress raw deflate data.
Uint8List decompressDeflate(Uint8List data) {
  final codec = ZLibCodec(raw: true);
  return Uint8List.fromList(codec.decode(data));
}

/// Decompress gzip data.
Uint8List decompressGzip(Uint8List data) {
  return Uint8List.fromList(gzip.decode(data));
}
