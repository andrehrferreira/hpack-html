/**
 * Protocol Buffers-style variable-length integer encoding.
 *
 * Each byte uses 7 bits for data and 1 bit (MSB) as a continuation flag.
 * Little-endian byte order (least significant group first).
 * Maximum supported value: 2^49 - 1 (7 bytes).
 */

/** Maximum value encodable in 7 VarInt bytes (2^49 - 1). */
export const VARINT_MAX = 2 ** 49 - 1;

/**
 * Encode an unsigned integer as a VarInt byte sequence.
 *
 * @param value - Non-negative integer to encode (0 to 2^49 - 1)
 * @returns Uint8Array containing the VarInt bytes
 * @throws RangeError if value is negative, non-integer, or exceeds VARINT_MAX
 */
export function encodeVarInt(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`VarInt value must be a non-negative integer, got ${value}`);
  }
  if (value > VARINT_MAX) {
    throw new RangeError(`VarInt value exceeds maximum (${VARINT_MAX}), got ${value}`);
  }

  if (value === 0) {
    return new Uint8Array([0]);
  }

  const bytes: number[] = [];
  let remaining = value;

  while (remaining > 0) {
    let byte = remaining & 0x7f; // lower 7 bits
    remaining = Math.floor(remaining / 128); // shift right by 7 (safe for large numbers)
    if (remaining > 0) {
      byte |= 0x80; // set continuation bit
    }
    bytes.push(byte);
  }

  return new Uint8Array(bytes);
}

/**
 * Decode a VarInt from a byte array at the given offset.
 *
 * @param data - Byte array containing the VarInt
 * @param offset - Byte offset to start reading from
 * @returns Object with decoded `value` and `bytesRead` count
 * @throws RangeError if the VarInt is truncated, exceeds 7 bytes, or offset is out of bounds
 */
export function decodeVarInt(
  data: Uint8Array,
  offset: number,
): { value: number; bytesRead: number } {
  if (offset < 0 || offset >= data.length) {
    throw new RangeError(`VarInt offset out of bounds: ${offset} (data length: ${data.length})`);
  }

  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  const maxBytes = 7; // 7 bytes * 7 bits = 49 bits max

  while (true) {
    const pos = offset + bytesRead;
    if (pos >= data.length) {
      throw new RangeError(`VarInt is truncated at offset ${offset} (read ${bytesRead} bytes, need more)`);
    }

    const byte = data[pos];
    bytesRead++;

    // Add the lower 7 bits to the value at the current shift position
    value += (byte & 0x7f) * (2 ** shift);
    shift += 7;

    // If MSB is not set, this is the last byte
    if ((byte & 0x80) === 0) {
      break;
    }

    if (bytesRead >= maxBytes) {
      throw new RangeError(`VarInt exceeds maximum of ${maxBytes} bytes at offset ${offset}`);
    }
  }

  return { value, bytesRead };
}
