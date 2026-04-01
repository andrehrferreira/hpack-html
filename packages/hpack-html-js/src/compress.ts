/**
 * Compression engine with dual-path:
 * 1. Native CompressionStream (0KB overhead, ~95% browser support)
 * 2. fflate fallback (8KB, pure JS)
 */

import { deflateSync, gzipSync } from "fflate";
import type { CompressionLevel } from "hpack-html";

/** Map named presets to numeric levels. */
const LEVEL_MAP: Record<CompressionLevel, number> = {
  fast: 1,
  default: 6,
  max: 9,
};

/**
 * Check if native CompressionStream API is available.
 */
function hasNativeCompression(): boolean {
  return typeof globalThis.CompressionStream !== "undefined";
}

/**
 * Compress using native CompressionStream (gzip).
 */
async function compressNative(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  writer.write(data as unknown as BufferSource);
  writer.close();

  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Compress data using the best available engine.
 *
 * @param data - Raw bytes to compress
 * @param level - Compression level preset
 * @returns Object with compressed bytes and whether gzip format was used
 */
export async function compress(
  data: Uint8Array,
  level: CompressionLevel = "default",
): Promise<{ compressed: Uint8Array; isGzip: boolean }> {
  // Try native CompressionStream first (gzip, fastest, 0KB bundle)
  if (hasNativeCompression() && level === "default") {
    const compressed = await compressNative(data);
    return { compressed, isGzip: true };
  }

  // Fallback to fflate
  const numericLevel = LEVEL_MAP[level] as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

  // Use raw deflate (smaller output than gzip, no gzip header overhead)
  const compressed = deflateSync(data, { level: numericLevel });
  return { compressed, isGzip: false };
}
