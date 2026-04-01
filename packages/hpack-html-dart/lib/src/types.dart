/// Compression level presets.
enum CompressionLevel { fast, defaultLevel, max }

/// Compression algorithm.
enum CompressionAlgorithm { deflate, gzip }

/// A single header field.
class HeaderField {
  final int type;
  final String? name;
  final String value;
  const HeaderField({required this.type, this.name, required this.value});
}

/// Pack options.
class PackOptions {
  final String url;
  final String? etag;
  final String? signature;
  final String? contentType;
  final int? timestamp;
  final String? encoding;
  final Map<String, String>? custom;
  final CompressionLevel level;
  final bool minify;
  final bool checksum;

  const PackOptions({
    required this.url,
    this.etag,
    this.signature,
    this.contentType,
    this.timestamp,
    this.encoding,
    this.custom,
    this.level = CompressionLevel.defaultLevel,
    this.minify = true,
    this.checksum = true,
  });
}

/// Unpack result.
class UnpackResult {
  final String url;
  final String? etag;
  final String? signature;
  final String? contentType;
  final int? timestamp;
  final String? encoding;
  final Map<String, String>? custom;
  final String html;
  final int version;
  final bool minified;
  final CompressionAlgorithm compressionAlgorithm;
  final bool? checksumValid;

  const UnpackResult({
    required this.url,
    this.etag,
    this.signature,
    this.contentType,
    this.timestamp,
    this.encoding,
    this.custom,
    required this.html,
    required this.version,
    required this.minified,
    required this.compressionAlgorithm,
    this.checksumValid,
  });
}

/// Unpack options.
class UnpackOptions {
  final bool verifyChecksum;
  final bool headersOnly;
  const UnpackOptions({this.verifyChecksum = true, this.headersOnly = false});
}
