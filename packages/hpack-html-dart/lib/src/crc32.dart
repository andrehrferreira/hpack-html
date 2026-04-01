import 'dart:typed_data';

/// Pre-computed CRC32 lookup table (IEEE 802.3 polynomial 0xEDB88320).
final _table = _buildTable();

Uint32List _buildTable() {
  final table = Uint32List(256);
  for (var i = 0; i < 256; i++) {
    var crc = i;
    for (var j = 0; j < 8; j++) {
      crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xEDB88320 : crc >> 1;
    }
    table[i] = crc;
  }
  return table;
}

/// Compute CRC32 checksum of [data].
int crc32(Uint8List data) {
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < data.length; i++) {
    crc = (crc >> 8) ^ _table[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) & 0xFFFFFFFF;
}
