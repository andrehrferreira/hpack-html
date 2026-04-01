/**
 * .hpack binary format constants.
 *
 * Defines magic bytes, version, flag bits, and header field types
 * shared across all SDK implementations (JS, TS, Rust, Dart).
 */

// ---------------------------------------------------------------------------
// Magic bytes: 0x89 "HPK" (non-ASCII prefix detects binary/text corruption)
// ---------------------------------------------------------------------------

export const MAGIC = new Uint8Array([0x89, 0x48, 0x50, 0x4b]);
export const MAGIC_SIZE = 4;

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export const VERSION = 0x01;
export const VERSION_SIZE = 1;

// ---------------------------------------------------------------------------
// Flags byte bit layout
// ---------------------------------------------------------------------------

/** Bit 0: HTML was minified before compression. */
export const FLAG_MINIFIED = 1 << 0;

/** Bit 1: CRC32 checksum is appended after compressed body. */
export const FLAG_CHECKSUM = 1 << 1;

/**
 * Bits 2-3: Compression algorithm.
 * - 0b00 (0): raw DEFLATE
 * - 0b01 (1): gzip
 * - 0b10 (2): reserved (brotli)
 * - 0b11 (3): reserved (zstd)
 */
export const FLAG_COMPRESSION_MASK = 0b00001100;
export const FLAG_COMPRESSION_SHIFT = 2;

export const FLAGS_SIZE = 1;

// ---------------------------------------------------------------------------
// Compression algorithm IDs (stored in flags bits 2-3)
// ---------------------------------------------------------------------------

export const COMPRESSION_DEFLATE = 0;
export const COMPRESSION_GZIP = 1;
export const COMPRESSION_BROTLI = 2; // reserved
export const COMPRESSION_ZSTD = 3; // reserved

// ---------------------------------------------------------------------------
// Header field type IDs
// ---------------------------------------------------------------------------

export const FIELD_URL = 0x01;
export const FIELD_ETAG = 0x02;
export const FIELD_SIGNATURE = 0x03;
export const FIELD_CONTENT_TYPE = 0x04;
export const FIELD_TIMESTAMP = 0x05;
export const FIELD_ENCODING = 0x06;

/** First type ID for custom (user-defined) fields. */
export const FIELD_CUSTOM_START = 0x10;

/** Last type ID for custom fields. */
export const FIELD_CUSTOM_END = 0xff;

// ---------------------------------------------------------------------------
// CRC32 size
// ---------------------------------------------------------------------------

export const CRC32_SIZE = 4;

// ---------------------------------------------------------------------------
// Minimum packet size: magic (4) + version (1) + flags (1) = 6 bytes
// (plus at least 1 byte for header length VarInt)
// ---------------------------------------------------------------------------

export const MIN_PACKET_SIZE = MAGIC_SIZE + VERSION_SIZE + FLAGS_SIZE + 1;

// ---------------------------------------------------------------------------
// Flags helper functions
// ---------------------------------------------------------------------------

/**
 * Encode option booleans + compression algorithm into a single flags byte.
 */
export function encodeFlags(
  minified: boolean,
  checksum: boolean,
  compression: number,
): number {
  let flags = 0;
  if (minified) flags |= FLAG_MINIFIED;
  if (checksum) flags |= FLAG_CHECKSUM;
  flags |= (compression & 0x03) << FLAG_COMPRESSION_SHIFT;
  return flags;
}

/**
 * Decode a flags byte into its components.
 */
export function decodeFlags(flags: number): {
  minified: boolean;
  checksum: boolean;
  compression: number;
} {
  return {
    minified: (flags & FLAG_MINIFIED) !== 0,
    checksum: (flags & FLAG_CHECKSUM) !== 0,
    compression: (flags & FLAG_COMPRESSION_MASK) >> FLAG_COMPRESSION_SHIFT,
  };
}

/**
 * Check if a field type ID is in the custom range (0x10-0xFF).
 */
export function isCustomField(fieldType: number): boolean {
  return fieldType >= FIELD_CUSTOM_START && fieldType <= FIELD_CUSTOM_END;
}
