import 'dart:convert';
import 'dart:typed_data';
import 'package:test/test.dart';
import 'package:hpack_html/hpack_html.dart';
import 'package:hpack_html/src/varint.dart';
import 'package:hpack_html/src/crc32.dart' as crc;
import 'package:hpack_html/src/minifier.dart' as min;

void main() {
  group('VarInt', () {
    test('encode/decode 0', () {
      final encoded = encodeVarInt(0);
      expect(encoded, equals([0x00]));
      final decoded = decodeVarInt(Uint8List.fromList([0x00]), 0);
      expect(decoded.value, 0);
      expect(decoded.bytesRead, 1);
    });

    test('encode/decode 127', () {
      final encoded = encodeVarInt(127);
      expect(encoded, equals([0x7F]));
      expect(decodeVarInt(encoded, 0).value, 127);
    });

    test('encode/decode 128', () {
      final encoded = encodeVarInt(128);
      expect(encoded, equals([0x80, 0x01]));
      expect(decodeVarInt(encoded, 0).value, 128);
    });

    test('encode/decode 300', () {
      final encoded = encodeVarInt(300);
      expect(encoded, equals([0xAC, 0x02]));
      expect(decodeVarInt(encoded, 0).value, 300);
    });

    test('roundtrip large values', () {
      for (final value in [0, 1, 127, 128, 16384, 65535, 1048576]) {
        final encoded = encodeVarInt(value);
        final decoded = decodeVarInt(encoded, 0);
        expect(decoded.value, value, reason: 'roundtrip failed for $value');
      }
    });

    test('throws on negative', () {
      expect(() => encodeVarInt(-1), throwsRangeError);
    });

    test('throws on truncated', () {
      expect(() => decodeVarInt(Uint8List.fromList([0x80]), 0), throwsRangeError);
    });
  });

  group('CRC32', () {
    test('empty input', () {
      expect(crc.crc32(Uint8List(0)), 0x00000000);
    });

    test('RFC 3720 check value', () {
      final data = Uint8List.fromList(utf8.encode('123456789'));
      expect(crc.crc32(data), 0xCBF43926);
    });

    test('"hello"', () {
      final data = Uint8List.fromList(utf8.encode('hello'));
      expect(crc.crc32(data), 0x3610A686);
    });
  });

  group('Minifier', () {
    test('collapse whitespace', () {
      expect(min.minify('<p>hello    world</p>'), '<p>hello world');
    });

    test('remove comments', () {
      expect(min.minify('<!-- comment --><p>hi</p>'), '<p>hi');
    });

    test('preserve conditional comments', () {
      final input = '<!--[if IE]><p>IE only</p><![endif]-->';
      expect(min.minify(input), input);
    });

    test('preserve script content', () {
      final input = '<script>  var x = 1;  </script>';
      expect(min.minify(input), contains('  var x = 1;  '));
    });

    test('remove optional closing tags', () {
      expect(min.minify('<li>item</li>'), '<li>item');
    });
  });

  group('Pack/Unpack roundtrip', () {
    test('simple HTML', () async {
      final html = '<h1>Hello World</h1>';
      final packed = await pack(html, PackOptions(
        url: 'https://example.com',
        minify: false,
        checksum: true,
      ));

      final result = await unpack(packed);
      expect(result.url, 'https://example.com');
      expect(result.html, html);
      expect(result.checksumValid, true);
    });

    test('all metadata fields', () async {
      final packed = await pack('<p>test</p>', PackOptions(
        url: 'https://example.com/page',
        etag: '"abc123"',
        signature: 'sig-xyz',
        contentType: 'text/html',
        timestamp: 1711929600000,
        encoding: 'utf-8',
        custom: {'crawlerId': 'bot-42'},
        minify: false,
        checksum: true,
      ));

      final result = await unpack(packed);
      expect(result.url, 'https://example.com/page');
      expect(result.etag, '"abc123"');
      expect(result.signature, 'sig-xyz');
      expect(result.contentType, 'text/html');
      expect(result.timestamp, 1711929600000);
      expect(result.encoding, 'utf-8');
      expect(result.custom?['crawlerId'], 'bot-42');
    });

    test('empty HTML', () async {
      final packed = await pack('', PackOptions(
        url: 'https://example.com',
        minify: false,
        checksum: true,
      ));
      final result = await unpack(packed);
      expect(result.html, '');
    });

    test('unicode content', () async {
      final html = '<p>日本語 🌍 مرحبا</p>';
      final packed = await pack(html, PackOptions(
        url: 'https://example.com/日本語',
        minify: false,
        checksum: true,
      ));
      final result = await unpack(packed);
      expect(result.html, html);
      expect(result.url, 'https://example.com/日本語');
    });

    test('with minification', () async {
      final html = '<!-- remove me --><p>  hello  world  </p>';
      final packed = await pack(html, PackOptions(
        url: 'https://example.com',
        minify: true,
        checksum: true,
      ));
      final result = await unpack(packed);
      expect(result.minified, true);
      expect(result.html, isNot(contains('<!-- remove me -->')));
      expect(result.html, contains('hello world'));
    });

    test('no checksum', () async {
      final packed = await pack('<p>test</p>', PackOptions(
        url: 'https://example.com',
        minify: false,
        checksum: false,
      ));
      final result = await unpack(packed);
      expect(result.checksumValid, isNull);
    });

    test('headersOnly', () async {
      final packed = await pack('<p>big content</p>', PackOptions(
        url: 'https://example.com',
      ));
      final result = await unpack(packed, UnpackOptions(headersOnly: true));
      expect(result.url, 'https://example.com');
      expect(result.html, '');
    });

    test('readHeaders', () async {
      final packed = await pack('<p>content</p>', PackOptions(
        url: 'https://example.com/page',
        etag: '"etag-val"',
      ));
      final headers = await readHeaders(packed);
      expect(headers.url, 'https://example.com/page');
      expect(headers.etag, '"etag-val"');
      expect(headers.html, '');
    });
  });

  group('Error handling', () {
    test('invalid magic', () async {
      final packed = await pack('<p>test</p>', PackOptions(url: 'https://example.com'));
      packed[0] = 0x00;
      expect(() => unpack(packed), throwsA(isA<InvalidMagicError>()));
    });

    test('bad version', () async {
      final packed = await pack('<p>test</p>', PackOptions(url: 'https://example.com'));
      packed[4] = 0x99;
      expect(() => unpack(packed), throwsA(isA<UnsupportedVersionError>()));
    });

    test('truncated', () {
      expect(
        () => unpack(Uint8List.fromList([0x89, 0x48, 0x50])),
        throwsA(isA<TruncatedPacketError>()),
      );
    });

    test('corrupted CRC32', () async {
      final packed = await pack('<p>test</p>', PackOptions(
        url: 'https://example.com',
        checksum: true,
      ));
      packed[packed.length - 1] ^= 0xFF;
      packed[packed.length - 2] ^= 0xFF;
      expect(() => unpack(packed), throwsA(isA<ChecksumMismatchError>()));
    });

    test('missing url', () {
      expect(
        () => pack('<p>test</p>', PackOptions(url: '')),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
