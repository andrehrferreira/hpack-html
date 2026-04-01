/**
 * .hpack packet decoder.
 *
 * Parses the binary .hpack format into structured metadata + compressed body.
 */

import { decodeVarInt } from "./varint.js";
import {
  MAGIC,
  MAGIC_SIZE,
  VERSION,
  VERSION_SIZE,
  FLAGS_SIZE,
  MIN_PACKET_SIZE,
  FIELD_CUSTOM_START,
  CRC32_SIZE,
  decodeFlags,
} from "./format.js";
import type { HeaderField, CompressionAlgorithm } from "./types.js";

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class InvalidMagicError extends Error {
  constructor(actual: Uint8Array) {
    super(
      `Invalid magic bytes: expected [${Array.from(MAGIC).map((b) => "0x" + b.toString(16).padStart(2, "0")).join(", ")}], ` +
      `got [${Array.from(actual).map((b) => "0x" + b.toString(16).padStart(2, "0")).join(", ")}]`,
    );
    this.name = "InvalidMagicError";
  }
}

export class UnsupportedVersionError extends Error {
  constructor(version: number) {
    super(`Unsupported .hpack version: ${version} (supported: ${VERSION})`);
    this.name = "UnsupportedVersionError";
  }
}

export class TruncatedPacketError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TruncatedPacketError";
  }
}

// ---------------------------------------------------------------------------
// Decoded packet structure
// ---------------------------------------------------------------------------

export interface DecodedPacket {
  version: number;
  flags: {
    minified: boolean;
    checksum: boolean;
    compression: number;
  };
  compressionAlgorithm: CompressionAlgorithm;
  fields: HeaderField[];
  compressedBody: Uint8Array;
  uncompressedLength: number;
  /** CRC32 from the packet (little-endian decoded). undefined if no checksum flag. */
  crc32?: number;
}

const COMPRESSION_MAP: Record<number, CompressionAlgorithm> = {
  0: "deflate",
  1: "gzip",
};

// ---------------------------------------------------------------------------
// Decoder
// ---------------------------------------------------------------------------

/**
 * Decode a complete .hpack packet.
 *
 * @param data - Raw packet bytes
 * @returns Decoded packet structure with fields and compressed body
 */
export function decodePacket(data: Uint8Array): DecodedPacket {
  if (data.length < MIN_PACKET_SIZE) {
    throw new TruncatedPacketError(
      `Packet too small: ${data.length} bytes (minimum: ${MIN_PACKET_SIZE})`,
    );
  }

  let offset = 0;

  // --- Magic ---
  const magic = data.slice(offset, offset + MAGIC_SIZE);
  for (let i = 0; i < MAGIC_SIZE; i++) {
    if (magic[i] !== MAGIC[i]) {
      throw new InvalidMagicError(magic);
    }
  }
  offset += MAGIC_SIZE;

  // --- Version ---
  const version = data[offset++];
  if (version !== VERSION) {
    throw new UnsupportedVersionError(version);
  }

  // --- Flags ---
  const flagsByte = data[offset++];
  const flags = decodeFlags(flagsByte);

  const compressionAlgorithm: CompressionAlgorithm =
    COMPRESSION_MAP[flags.compression] ?? "deflate";

  // --- Header section ---
  const headerLen = decodeVarInt(data, offset);
  offset += headerLen.bytesRead;

  const headerEndOffset = offset + headerLen.value;
  if (headerEndOffset > data.length) {
    throw new TruncatedPacketError(
      `Header section extends beyond packet: header claims ${headerLen.value} bytes at offset ${offset}, but packet is only ${data.length} bytes`,
    );
  }

  // Field count
  const fieldCount = decodeVarInt(data, offset);
  offset += fieldCount.bytesRead;

  // Fields
  const fields: HeaderField[] = [];
  for (let i = 0; i < fieldCount.value; i++) {
    if (offset >= headerEndOffset) {
      throw new TruncatedPacketError(
        `Header field ${i} extends beyond header section`,
      );
    }

    const fieldType = data[offset++];

    if (fieldType >= FIELD_CUSTOM_START) {
      // Custom field: [type: 1B] [nameLen: 1B] [name] [valueLen: VarInt] [value]
      if (offset >= headerEndOffset) {
        throw new TruncatedPacketError(`Custom field ${i} name length missing`);
      }
      const nameLen = data[offset++];
      if (offset + nameLen > headerEndOffset) {
        throw new TruncatedPacketError(`Custom field ${i} name truncated`);
      }
      const name = new TextDecoder().decode(data.slice(offset, offset + nameLen));
      offset += nameLen;

      const valueLen = decodeVarInt(data, offset);
      offset += valueLen.bytesRead;
      if (offset + valueLen.value > headerEndOffset) {
        throw new TruncatedPacketError(`Custom field ${i} value truncated`);
      }
      const value = new TextDecoder().decode(
        data.slice(offset, offset + valueLen.value),
      );
      offset += valueLen.value;

      fields.push({ type: fieldType, name, value });
    } else {
      // Known field: [type: 1B] [valueLen: VarInt] [value]
      const valueLen = decodeVarInt(data, offset);
      offset += valueLen.bytesRead;
      if (offset + valueLen.value > headerEndOffset) {
        throw new TruncatedPacketError(`Field ${i} (type 0x${fieldType.toString(16).padStart(2, "0")}) value truncated`);
      }
      const value = new TextDecoder().decode(
        data.slice(offset, offset + valueLen.value),
      );
      offset += valueLen.value;

      fields.push({ type: fieldType, value });
    }
  }

  // Skip any remaining header bytes (forward compatibility)
  offset = headerEndOffset;

  // --- Body section ---
  if (offset >= data.length) {
    throw new TruncatedPacketError("Body section missing");
  }

  const uncompressedLen = decodeVarInt(data, offset);
  offset += uncompressedLen.bytesRead;

  // Determine compressed body end (account for optional CRC32)
  const crcSize = flags.checksum ? CRC32_SIZE : 0;
  const compressedBodyEnd = data.length - crcSize;

  if (offset > compressedBodyEnd) {
    throw new TruncatedPacketError("Compressed body truncated");
  }

  const compressedBody = data.slice(offset, compressedBodyEnd);

  // CRC32
  let crc32: number | undefined;
  if (flags.checksum) {
    const crcOffset = compressedBodyEnd;
    if (crcOffset + CRC32_SIZE > data.length) {
      throw new TruncatedPacketError("CRC32 checksum truncated");
    }
    crc32 =
      data[crcOffset] |
      (data[crcOffset + 1] << 8) |
      (data[crcOffset + 2] << 16) |
      ((data[crcOffset + 3] << 24) >>> 0); // unsigned
    // Fix sign: JavaScript bitwise ops return signed int32
    crc32 = crc32 >>> 0;
  }

  return {
    version,
    flags,
    compressionAlgorithm,
    fields,
    compressedBody,
    uncompressedLength: uncompressedLen.value,
    crc32,
  };
}

/**
 * Read only the headers from a packet, skipping body decompression.
 * Uses the header length field to jump directly past the header section.
 *
 * @param data - Raw packet bytes
 * @returns Decoded header fields and flags (no body data)
 */
export function decodeHeaders(
  data: Uint8Array,
): Pick<DecodedPacket, "version" | "flags" | "compressionAlgorithm" | "fields"> {
  // We reuse decodePacket since the body parsing is cheap (just slicing, no decompression).
  // The caller avoids decompression by not using compressedBody.
  const packet = decodePacket(data);
  return {
    version: packet.version,
    flags: packet.flags,
    compressionAlgorithm: packet.compressionAlgorithm,
    fields: packet.fields,
  };
}
