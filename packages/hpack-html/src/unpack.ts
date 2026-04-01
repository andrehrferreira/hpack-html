/**
 * Decompressor for .hpack binary packets.
 * Works in Node.js, Deno, Bun, and browser environments.
 */

import { inflateSync, gunzipSync } from "fflate";
import { decodePacket, decodeHeaders } from "./decoder.js";
import { crc32 } from "./crc32.js";
import {
  FIELD_URL,
  FIELD_ETAG,
  FIELD_SIGNATURE,
  FIELD_CONTENT_TYPE,
  FIELD_TIMESTAMP,
  FIELD_ENCODING,
  FIELD_CUSTOM_START,
} from "./format.js";
import type { UnpackResult, UnpackOptions } from "./types.js";

export class ChecksumMismatchError extends Error {
  constructor(expected: number, actual: number) {
    super(
      `CRC32 checksum mismatch: expected 0x${expected.toString(16).padStart(8, "0")}, ` +
      `got 0x${actual.toString(16).padStart(8, "0")}`,
    );
    this.name = "ChecksumMismatchError";
  }
}

export class DecompressionError extends Error {
  constructor(cause: unknown) {
    super(`Decompression failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "DecompressionError";
  }
}

/**
 * Extract metadata fields from decoded packet into a flat structure.
 */
function extractFields(
  fields: Array<{ type: number; name?: string; value: string }>,
): Pick<
  UnpackResult,
  "url" | "etag" | "signature" | "contentType" | "timestamp" | "encoding" | "custom"
> {
  let url = "";
  let etag: string | undefined;
  let signature: string | undefined;
  let contentType: string | undefined;
  let timestamp: number | undefined;
  let encoding: string | undefined;
  let custom: Record<string, string> | undefined;

  for (const field of fields) {
    switch (field.type) {
      case FIELD_URL:
        url = field.value;
        break;
      case FIELD_ETAG:
        etag = field.value;
        break;
      case FIELD_SIGNATURE:
        signature = field.value;
        break;
      case FIELD_CONTENT_TYPE:
        contentType = field.value;
        break;
      case FIELD_TIMESTAMP:
        timestamp = Number(field.value);
        break;
      case FIELD_ENCODING:
        encoding = field.value;
        break;
      default:
        if (field.type >= FIELD_CUSTOM_START && field.name) {
          if (!custom) custom = {};
          custom[field.name] = field.value;
        }
        break;
    }
  }

  return { url, etag, signature, contentType, timestamp, encoding, custom };
}

/**
 * Unpack an .hpack binary packet into structured result.
 */
export async function unpack(
  data: Uint8Array,
  options?: UnpackOptions,
): Promise<UnpackResult> {
  const verifyChecksum = options?.verifyChecksum !== false;
  const headersOnly = options?.headersOnly === true;

  const packet = decodePacket(data);
  const meta = extractFields(packet.fields);

  if (headersOnly) {
    return {
      ...meta,
      html: "",
      version: packet.version,
      minified: packet.flags.minified,
      compressionAlgorithm: packet.compressionAlgorithm,
      checksumValid: undefined,
    };
  }

  let decompressed: Uint8Array;
  try {
    decompressed =
      packet.compressionAlgorithm === "gzip"
        ? gunzipSync(packet.compressedBody)
        : inflateSync(packet.compressedBody);
  } catch (err) {
    throw new DecompressionError(err);
  }

  let checksumValid: boolean | undefined;
  if (packet.flags.checksum && packet.crc32 !== undefined) {
    const actual = crc32(decompressed);
    if (verifyChecksum && actual !== packet.crc32) {
      throw new ChecksumMismatchError(packet.crc32, actual);
    }
    checksumValid = actual === packet.crc32;
  }

  const html = new TextDecoder().decode(decompressed);

  return {
    ...meta,
    html,
    version: packet.version,
    minified: packet.flags.minified,
    compressionAlgorithm: packet.compressionAlgorithm,
    checksumValid,
  };
}

/**
 * Read only headers from an .hpack packet without decompressing the body.
 */
export async function readHeaders(
  data: Uint8Array,
): Promise<Omit<UnpackResult, "html" | "checksumValid">> {
  const packet = decodeHeaders(data);
  const meta = extractFields(packet.fields);

  return {
    ...meta,
    version: packet.version,
    minified: packet.flags.minified,
    compressionAlgorithm: packet.compressionAlgorithm,
  };
}
