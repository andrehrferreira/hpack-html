import 'dart:typed_data';

/// Maximum VarInt bytes (7 bytes = 49 bits).
const maxVarintBytes = 7;

/// Maximum encodable value: 2^49 - 1.
const varintMax = (1 << 49) - 1;

/// Encode an unsigned integer as a VarInt byte sequence.
Uint8List encodeVarInt(int value) {
  if (value < 0) {
    throw RangeError('VarInt value must be non-negative, got $value');
  }
  if (value > varintMax) {
    throw RangeError('VarInt value exceeds maximum ($varintMax), got $value');
  }
  if (value == 0) {
    return Uint8List.fromList([0]);
  }

  final bytes = <int>[];
  var remaining = value;
  while (remaining > 0) {
    var byte = remaining & 0x7F;
    remaining = remaining >> 7;
    if (remaining > 0) {
      byte |= 0x80;
    }
    bytes.add(byte);
  }
  return Uint8List.fromList(bytes);
}

/// Result of decoding a VarInt.
class VarIntResult {
  final int value;
  final int bytesRead;
  const VarIntResult(this.value, this.bytesRead);
}

/// Decode a VarInt from [data] at [offset].
VarIntResult decodeVarInt(Uint8List data, int offset) {
  if (offset < 0 || offset >= data.length) {
    throw RangeError('VarInt offset out of bounds: $offset (data length: ${data.length})');
  }

  var value = 0;
  var shift = 0;
  var bytesRead = 0;

  while (true) {
    final pos = offset + bytesRead;
    if (pos >= data.length) {
      throw RangeError('VarInt truncated at offset $offset (read $bytesRead bytes)');
    }

    final byte = data[pos];
    bytesRead++;

    value |= (byte & 0x7F) << shift;
    shift += 7;

    if (byte & 0x80 == 0) break;

    if (bytesRead >= maxVarintBytes) {
      throw RangeError('VarInt exceeds maximum of $maxVarintBytes bytes at offset $offset');
    }
  }

  return VarIntResult(value, bytesRead);
}
