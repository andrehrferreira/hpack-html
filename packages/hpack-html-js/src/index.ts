/**
 * hpack-html-js
 *
 * Pure JavaScript HTML compressor for the .hpack format.
 * Works in browsers, Chrome extensions, Flutter JS bridges, and any JS runtime.
 */

import {
  encodeFlags,
  encodePacket,
  crc32,
  COMPRESSION_DEFLATE,
  COMPRESSION_GZIP,
  FIELD_URL,
  FIELD_ETAG,
  FIELD_SIGNATURE,
  FIELD_CONTENT_TYPE,
  FIELD_TIMESTAMP,
  FIELD_ENCODING,
  FIELD_CUSTOM_START,
} from "hpack-html";
import type { PackOptions, HeaderField } from "hpack-html";
import { minify } from "./minifier.js";
import { compress } from "./compress.js";

export { minify } from "./minifier.js";
export { compress } from "./compress.js";

/**
 * Pack HTML into a compact .hpack binary packet.
 *
 * Pipeline: validate -> minify (optional) -> compress -> encode packet
 */
export async function pack(
  html: string,
  options: PackOptions,
): Promise<Uint8Array> {
  if (!options.url) {
    throw new Error("PackOptions.url is required");
  }

  const doMinify = options.minify !== false;
  const doChecksum = options.checksum !== false;
  const level = options.level ?? "default";

  const processedHtml = doMinify ? minify(html) : html;
  const htmlBytes = new TextEncoder().encode(processedHtml);
  const { compressed, isGzip } = await compress(htmlBytes, level);
  const checksum = doChecksum ? crc32(htmlBytes) : undefined;

  const fields: HeaderField[] = [];
  fields.push({ type: FIELD_URL, value: options.url });

  if (options.etag !== undefined) {
    fields.push({ type: FIELD_ETAG, value: options.etag });
  }
  if (options.signature !== undefined) {
    fields.push({ type: FIELD_SIGNATURE, value: options.signature });
  }
  if (options.contentType !== undefined) {
    fields.push({ type: FIELD_CONTENT_TYPE, value: options.contentType });
  }

  const timestamp = options.timestamp ?? Date.now();
  fields.push({ type: FIELD_TIMESTAMP, value: String(timestamp) });

  if (options.encoding !== undefined) {
    fields.push({ type: FIELD_ENCODING, value: options.encoding });
  }

  if (options.custom) {
    let customType = FIELD_CUSTOM_START;
    for (const [name, value] of Object.entries(options.custom)) {
      fields.push({ type: customType++, name, value });
    }
  }

  const compressionId = isGzip ? COMPRESSION_GZIP : COMPRESSION_DEFLATE;
  const flags = encodeFlags(doMinify, doChecksum, compressionId);

  return encodePacket({
    flags,
    fields,
    compressedBody: compressed,
    uncompressedLength: htmlBytes.length,
    crc32: checksum,
  });
}
