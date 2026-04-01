/**
 * CRC32 checksum computation (IEEE 802.3 / ISO 3309).
 *
 * Uses the standard polynomial 0xEDB88320 (reversed representation).
 * Compatible with zlib, gzip, PNG, and all standard CRC32 implementations.
 */

/** Pre-computed CRC32 lookup table (256 entries). */
const TABLE = /* @__PURE__ */ buildTable();

function buildTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    table[i] = crc;
  }
  return table;
}

/**
 * Compute the CRC32 checksum of a byte array.
 *
 * @param data - Input bytes
 * @returns CRC32 checksum as an unsigned 32-bit integer
 */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
