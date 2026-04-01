/**
 * Shared TypeScript types for the hpack-html binary format.
 * Used by both compressor and decompressor SDKs.
 */

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

/** Named compression level presets. */
export type CompressionLevel = "fast" | "default" | "max";

/** Compression algorithm identifiers (matches flags bits 2-3). */
export type CompressionAlgorithm = "deflate" | "gzip";

// ---------------------------------------------------------------------------
// Pack options (compressor input)
// ---------------------------------------------------------------------------

export interface PackOptions {
  /** Source page URL (required). */
  url: string;

  /** HTTP ETag or content hash. */
  etag?: string;

  /** Request signature (opaque, for server-side identification). */
  signature?: string;

  /** Original Content-Type header. */
  contentType?: string;

  /** Capture timestamp in Unix epoch milliseconds. Defaults to Date.now(). */
  timestamp?: number;

  /** Original page encoding (e.g. "utf-8", "shift_jis"). Defaults to "utf-8". */
  encoding?: string;

  /** Arbitrary key-value metadata. */
  custom?: Record<string, string>;

  /** Compression level preset. Defaults to "default". */
  level?: CompressionLevel;

  /** Enable HTML minification before compression. Defaults to true. */
  minify?: boolean;

  /** Include CRC32 checksum for integrity verification. Defaults to true. */
  checksum?: boolean;
}

// ---------------------------------------------------------------------------
// Unpack result (decompressor output)
// ---------------------------------------------------------------------------

export interface UnpackResult {
  /** Source page URL. */
  url: string;

  /** HTTP ETag or content hash, if present. */
  etag?: string;

  /** Request signature, if present. */
  signature?: string;

  /** Original Content-Type header, if present. */
  contentType?: string;

  /** Capture timestamp (Unix epoch ms), if present. */
  timestamp?: number;

  /** Original page encoding, if present. */
  encoding?: string;

  /** Custom key-value metadata, if any custom fields were present. */
  custom?: Record<string, string>;

  /** Decompressed HTML content. Empty string if headersOnly was true. */
  html: string;

  /** Format version byte from the packet. */
  version: number;

  /** Whether HTML was minified before compression. */
  minified: boolean;

  /** Compression algorithm used. */
  compressionAlgorithm: CompressionAlgorithm;

  /** CRC32 verification result. true=valid, false=mismatch, undefined=no checksum in packet. */
  checksumValid?: boolean;
}

// ---------------------------------------------------------------------------
// Unpack options
// ---------------------------------------------------------------------------

export interface UnpackOptions {
  /** Verify CRC32 checksum if present. Defaults to true. */
  verifyChecksum?: boolean;

  /** Parse only headers, skip body decompression. Defaults to false. */
  headersOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Header field (internal representation)
// ---------------------------------------------------------------------------

/** A single header field as parsed from or to be encoded into a packet. */
export interface HeaderField {
  /** Field type ID (0x01-0x06 for known, 0x10-0xFF for custom). */
  type: number;

  /** Field name (only for custom fields, 0x10-0xFF). */
  name?: string;

  /** Field value as a UTF-8 string. */
  value: string;
}
