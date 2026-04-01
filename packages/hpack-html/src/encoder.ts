/**
 * .hpack packet encoder.
 *
 * Serializes metadata headers + compressed body into the binary .hpack format.
 */

import { encodeVarInt } from "./varint.js";
import {
  MAGIC,
  VERSION,
  FIELD_CUSTOM_START,
  CRC32_SIZE,
} from "./format.js";
import type { HeaderField } from "./types.js";

/**
 * Encode a single known header field (type < 0x10) into bytes.
 *
 * Layout: [fieldType: 1B] [valueLength: VarInt] [value: UTF-8]
 */
function encodeKnownField(field: HeaderField): Uint8Array {
  const valueBytes = new TextEncoder().encode(field.value);
  const lenBytes = encodeVarInt(valueBytes.length);

  const result = new Uint8Array(1 + lenBytes.length + valueBytes.length);
  result[0] = field.type;
  result.set(lenBytes, 1);
  result.set(valueBytes, 1 + lenBytes.length);
  return result;
}

/**
 * Encode a custom header field (type >= 0x10) into bytes.
 *
 * Layout: [fieldType: 1B] [nameLength: 1B] [name: UTF-8] [valueLength: VarInt] [value: UTF-8]
 */
function encodeCustomField(field: HeaderField): Uint8Array {
  const nameBytes = new TextEncoder().encode(field.name ?? "");
  const valueBytes = new TextEncoder().encode(field.value);
  const valueLenBytes = encodeVarInt(valueBytes.length);

  const result = new Uint8Array(
    1 + 1 + nameBytes.length + valueLenBytes.length + valueBytes.length,
  );
  let offset = 0;
  result[offset++] = field.type;
  result[offset++] = nameBytes.length;
  result.set(nameBytes, offset);
  offset += nameBytes.length;
  result.set(valueLenBytes, offset);
  offset += valueLenBytes.length;
  result.set(valueBytes, offset);
  return result;
}

/**
 * Encode a header field (dispatches to known or custom encoding).
 */
function encodeField(field: HeaderField): Uint8Array {
  if (field.type >= FIELD_CUSTOM_START) {
    return encodeCustomField(field);
  }
  return encodeKnownField(field);
}

export interface EncodePacketOptions {
  /** Flags byte (already encoded via encodeFlags). */
  flags: number;
  /** Header fields to include. */
  fields: HeaderField[];
  /** Compressed body bytes. */
  compressedBody: Uint8Array;
  /** Original uncompressed body length in bytes. */
  uncompressedLength: number;
  /** CRC32 checksum of uncompressed body (included only if flags has checksum bit). */
  crc32?: number;
}

/**
 * Encode a complete .hpack packet.
 *
 * Layout:
 *   [magic: 4B] [version: 1B] [flags: 1B]
 *   [headerLength: VarInt] [fieldCount: VarInt] [fields...]
 *   [uncompressedLength: VarInt] [compressedBody...] [crc32?: 4B LE]
 */
export function encodePacket(options: EncodePacketOptions): Uint8Array {
  const { flags, fields, compressedBody, uncompressedLength, crc32 } = options;

  // Encode all fields
  const encodedFields: Uint8Array[] = fields.map(encodeField);
  const fieldCountBytes = encodeVarInt(fields.length);

  // Header section content = fieldCount + all encoded fields
  const headerContentLength =
    fieldCountBytes.length +
    encodedFields.reduce((sum, f) => sum + f.length, 0);
  const headerLenBytes = encodeVarInt(headerContentLength);

  // Body section
  const uncompressedLenBytes = encodeVarInt(uncompressedLength);
  const hasCrc = crc32 !== undefined;
  const crcSize = hasCrc ? CRC32_SIZE : 0;

  // Total packet size
  const totalSize =
    MAGIC.length +          // magic
    1 +                     // version
    1 +                     // flags
    headerLenBytes.length + // header length varint
    headerContentLength +   // header content
    uncompressedLenBytes.length + // uncompressed length varint
    compressedBody.length + // compressed body
    crcSize;                // optional CRC32

  const packet = new Uint8Array(totalSize);
  let offset = 0;

  // Magic
  packet.set(MAGIC, offset);
  offset += MAGIC.length;

  // Version
  packet[offset++] = VERSION;

  // Flags
  packet[offset++] = flags;

  // Header length
  packet.set(headerLenBytes, offset);
  offset += headerLenBytes.length;

  // Field count
  packet.set(fieldCountBytes, offset);
  offset += fieldCountBytes.length;

  // Fields
  for (const encoded of encodedFields) {
    packet.set(encoded, offset);
    offset += encoded.length;
  }

  // Uncompressed length
  packet.set(uncompressedLenBytes, offset);
  offset += uncompressedLenBytes.length;

  // Compressed body
  packet.set(compressedBody, offset);
  offset += compressedBody.length;

  // CRC32 (little-endian)
  if (hasCrc) {
    packet[offset++] = crc32 & 0xff;
    packet[offset++] = (crc32 >>> 8) & 0xff;
    packet[offset++] = (crc32 >>> 16) & 0xff;
    packet[offset++] = (crc32 >>> 24) & 0xff;
  }

  return packet;
}
