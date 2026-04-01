/// hpack_html — High-performance lossless HTML compression for Dart/Flutter.
///
/// Pack HTML pages into compact .hpack binary packets with structured metadata.
/// Works on Android, iOS, macOS, Windows, Linux. Flutter Web requires a
/// separate pure-Dart zlib implementation since dart:io is unavailable.
library hpack_html;

import 'dart:convert';
import 'dart:typed_data';

import 'src/crc32.dart';
import 'src/compress.dart';
import 'src/decoder.dart';
import 'src/encoder.dart';
import 'src/format.dart' as fmt;
import 'src/minifier.dart' as min;
import 'src/types.dart';

export 'src/types.dart';
export 'src/decoder.dart'
    show
        InvalidMagicError,
        UnsupportedVersionError,
        TruncatedPacketError,
        ChecksumMismatchError,
        DecompressionError;

/// Pack HTML into a compact .hpack binary packet.
///
/// Pipeline: validate -> minify (optional) -> compress -> encode packet.
Future<Uint8List> pack(String html, PackOptions options) async {
  if (options.url.isEmpty) {
    throw ArgumentError('PackOptions.url is required');
  }

  final doMinify = options.minify;
  final doChecksum = options.checksum;

  final processedHtml = doMinify ? min.minify(html) : html;
  final htmlBytes = Uint8List.fromList(utf8.encode(processedHtml));

  final result = compress(htmlBytes, options.level);
  final checksumValue = doChecksum ? crc32(htmlBytes) : null;

  final fields = <HeaderField>[];
  fields.add(HeaderField(type: fmt.fieldUrl, value: options.url));

  if (options.etag != null) {
    fields.add(HeaderField(type: fmt.fieldEtag, value: options.etag!));
  }
  if (options.signature != null) {
    fields.add(HeaderField(type: fmt.fieldSignature, value: options.signature!));
  }
  if (options.contentType != null) {
    fields.add(HeaderField(type: fmt.fieldContentType, value: options.contentType!));
  }

  final timestamp = options.timestamp ?? DateTime.now().millisecondsSinceEpoch;
  fields.add(HeaderField(type: fmt.fieldTimestamp, value: timestamp.toString()));

  if (options.encoding != null) {
    fields.add(HeaderField(type: fmt.fieldEncoding, value: options.encoding!));
  }

  if (options.custom != null) {
    var customType = fmt.fieldCustomStart;
    for (final entry in options.custom!.entries) {
      fields.add(HeaderField(type: customType++, name: entry.key, value: entry.value));
    }
  }

  final compressionId = result.isGzip ? fmt.compressionGzip : fmt.compressionDeflate;
  final flags = fmt.encodeFlags(doMinify, doChecksum, compressionId);

  return encodePacket(EncodePacketOptions(
    flags: flags,
    fields: fields,
    compressedBody: result.compressed,
    uncompressedLength: htmlBytes.length,
    crc32Value: checksumValue,
  ));
}

/// Unpack an .hpack binary packet.
Future<UnpackResult> unpack(Uint8List data, [UnpackOptions? options]) async {
  final opts = options ?? const UnpackOptions();
  final packet = decodePacket(data);
  final meta = _extractFields(packet.fields);

  if (opts.headersOnly) {
    return UnpackResult(
      url: meta.url,
      etag: meta.etag,
      signature: meta.signature,
      contentType: meta.contentType,
      timestamp: meta.timestamp,
      encoding: meta.encoding,
      custom: meta.custom,
      html: '',
      version: packet.packetVersion,
      minified: packet.flags.minified,
      compressionAlgorithm: packet.compressionAlgorithm,
    );
  }

  Uint8List decompressed;
  try {
    decompressed = packet.compressionAlgorithm == CompressionAlgorithm.gzip
        ? decompressGzip(packet.compressedBody)
        : decompressDeflate(packet.compressedBody);
  } catch (e) {
    throw DecompressionError(e.toString());
  }

  bool? checksumValid;
  if (packet.flags.checksum && packet.crc32Value != null) {
    final actual = crc32(decompressed);
    if (opts.verifyChecksum && actual != packet.crc32Value!) {
      throw ChecksumMismatchError(packet.crc32Value!, actual);
    }
    checksumValid = actual == packet.crc32Value!;
  }

  final html = utf8.decode(decompressed);

  return UnpackResult(
    url: meta.url,
    etag: meta.etag,
    signature: meta.signature,
    contentType: meta.contentType,
    timestamp: meta.timestamp,
    encoding: meta.encoding,
    custom: meta.custom,
    html: html,
    version: packet.packetVersion,
    minified: packet.flags.minified,
    compressionAlgorithm: packet.compressionAlgorithm,
    checksumValid: checksumValid,
  );
}

/// Read only headers without decompressing.
Future<UnpackResult> readHeaders(Uint8List data) async {
  return unpack(data, const UnpackOptions(headersOnly: true));
}

/// Internal field extraction.
class _ExtractedFields {
  String url = '';
  String? etag;
  String? signature;
  String? contentType;
  int? timestamp;
  String? encoding;
  Map<String, String>? custom;
}

_ExtractedFields _extractFields(List<HeaderField> fields) {
  final r = _ExtractedFields();
  for (final f in fields) {
    switch (f.type) {
      case fmt.fieldUrl:
        r.url = f.value;
      case fmt.fieldEtag:
        r.etag = f.value;
      case fmt.fieldSignature:
        r.signature = f.value;
      case fmt.fieldContentType:
        r.contentType = f.value;
      case fmt.fieldTimestamp:
        r.timestamp = int.tryParse(f.value);
      case fmt.fieldEncoding:
        r.encoding = f.value;
      default:
        if (f.type >= fmt.fieldCustomStart && f.name != null) {
          r.custom ??= {};
          r.custom![f.name!] = f.value;
        }
    }
  }
  return r;
}
