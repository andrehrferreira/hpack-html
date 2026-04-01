// Core primitives
export { encodeVarInt, decodeVarInt, VARINT_MAX } from "./varint.js";
export { crc32 } from "./crc32.js";
export {
  MAGIC, MAGIC_SIZE, VERSION, VERSION_SIZE, FLAGS_SIZE,
  FLAG_MINIFIED, FLAG_CHECKSUM, FLAG_COMPRESSION_MASK, FLAG_COMPRESSION_SHIFT,
  COMPRESSION_DEFLATE, COMPRESSION_GZIP, COMPRESSION_BROTLI, COMPRESSION_ZSTD,
  FIELD_URL, FIELD_ETAG, FIELD_SIGNATURE, FIELD_CONTENT_TYPE,
  FIELD_TIMESTAMP, FIELD_ENCODING, FIELD_CUSTOM_START, FIELD_CUSTOM_END,
  CRC32_SIZE, MIN_PACKET_SIZE,
  encodeFlags, decodeFlags, isCustomField,
} from "./format.js";

// Types
export type {
  CompressionLevel, CompressionAlgorithm,
  PackOptions, UnpackResult, UnpackOptions, HeaderField,
} from "./types.js";

// Encoder / Decoder
export { encodePacket } from "./encoder.js";
export type { EncodePacketOptions } from "./encoder.js";
export { decodePacket, decodeHeaders, InvalidMagicError, UnsupportedVersionError, TruncatedPacketError } from "./decoder.js";
export type { DecodedPacket } from "./decoder.js";

// Unpack (decompressor)
export { unpack, readHeaders, ChecksumMismatchError, DecompressionError } from "./unpack.js";
