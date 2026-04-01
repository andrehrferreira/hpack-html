/**
 * HTML Compression Benchmark
 *
 * Compares all available compression algorithms on a real-world HTML page.
 * Usage: bun run index.ts
 */

import * as fflate from "fflate";
import pako from "pako";
import lz4 from "lz4js";
const _lzmaCode = await Bun.file(require.resolve("lzma/src/lzma_worker.js")).text();
const _lzmaFn = new Function("var self = {}; " + _lzmaCode + "; return self.LZMA || this.LZMA || LZMA;");
const LZMA = _lzmaFn();
import LZString from "lz-string";
import brotli from "brotli-wasm";
import { ZstdCodec } from "zstd-codec";
import {
  gzipSync,
  gunzipSync,
  brotliCompressSync,
  brotliDecompressSync,
  constants,
} from "zlib";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function percent(compressed: number, original: number): string {
  return ((1 - compressed / original) * 100).toFixed(2) + "%";
}

interface BenchResult {
  algorithm: string;
  compressedSize: number;
  ratio: string;
  compressMs: number;
  decompressMs: number;
  roundtrip: boolean;
  notes: string;
}

function timeSync<T>(fn: () => T): [T, number] {
  const start = performance.now();
  const result = fn();
  return [result, performance.now() - start];
}

// ---------------------------------------------------------------------------
// Load HTML
// ---------------------------------------------------------------------------

const htmlPath = import.meta.dir + "/sample.html";
const file = Bun.file(htmlPath);
if (!(await file.exists())) {
  console.error("sample.html not found. Run: bun run fetch-html.ts");
  process.exit(1);
}

const html = await file.text();
const rawBytes = new TextEncoder().encode(html);
const originalSize = rawBytes.byteLength;

console.log("=".repeat(90));
console.log("HTML COMPRESSION BENCHMARK");
console.log("=".repeat(90));
console.log(`Source: sample.html`);
console.log(`Original size: ${formatBytes(originalSize)} (${originalSize} bytes)`);
console.log("=".repeat(90));
console.log();

const results: BenchResult[] = [];

// ---------------------------------------------------------------------------
// 1. fflate - DEFLATE raw (levels 1, 6, 9)
// ---------------------------------------------------------------------------

for (const level of [1, 6, 9] as const) {
  const label = `fflate deflate (level ${level})`;
  try {
    const [compressed, compressMs] = timeSync(() =>
      fflate.deflateSync(rawBytes, { level })
    );
    const [decompressed, decompressMs] = timeSync(() =>
      fflate.inflateSync(compressed)
    );
    const roundtrip = Buffer.from(decompressed).equals(Buffer.from(rawBytes));
    results.push({
      algorithm: label,
      compressedSize: compressed.byteLength,
      ratio: percent(compressed.byteLength, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Pure JS, 8KB bundle",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

// ---------------------------------------------------------------------------
// 2. fflate - GZIP (level 6)
// ---------------------------------------------------------------------------

{
  const label = "fflate gzip (level 6)";
  try {
    const [compressed, compressMs] = timeSync(() =>
      fflate.gzipSync(rawBytes, { level: 6 })
    );
    const [decompressed, decompressMs] = timeSync(() =>
      fflate.gunzipSync(compressed)
    );
    const roundtrip = Buffer.from(decompressed).equals(Buffer.from(rawBytes));
    results.push({
      algorithm: label,
      compressedSize: compressed.byteLength,
      ratio: percent(compressed.byteLength, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Pure JS, gzip wrapper",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

// ---------------------------------------------------------------------------
// 3. pako - DEFLATE (levels 1, 6, 9) and GZIP
// ---------------------------------------------------------------------------

for (const level of [1, 6, 9] as const) {
  const label = `pako deflate (level ${level})`;
  try {
    const [compressed, compressMs] = timeSync(() =>
      pako.deflate(rawBytes, { level })
    );
    const [decompressed, decompressMs] = timeSync(() =>
      pako.inflate(compressed)
    );
    const roundtrip = Buffer.from(decompressed).equals(Buffer.from(rawBytes));
    results.push({
      algorithm: label,
      compressedSize: compressed.byteLength,
      ratio: percent(compressed.byteLength, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Pure JS, 45KB bundle",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

{
  const label = "pako gzip (level 6)";
  try {
    const [compressed, compressMs] = timeSync(() =>
      pako.gzip(rawBytes, { level: 6 })
    );
    const [decompressed, decompressMs] = timeSync(() =>
      pako.ungzip(compressed)
    );
    const roundtrip = Buffer.from(decompressed).equals(Buffer.from(rawBytes));
    results.push({
      algorithm: label,
      compressedSize: compressed.byteLength,
      ratio: percent(compressed.byteLength, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Pure JS, gzip wrapper",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

// ---------------------------------------------------------------------------
// 4. Brotli (via brotli-wasm) - qualities 1, 6, 11
// ---------------------------------------------------------------------------

{
  const brotliModule = await brotli;
  for (const quality of [1, 6, 11] as const) {
    const label = `brotli-wasm (quality ${quality})`;
    try {
      const [compressed, compressMs] = timeSync(() =>
        brotliModule.compress(rawBytes, { quality })
      );
      const [decompressed, decompressMs] = timeSync(() =>
        brotliModule.decompress(compressed)
      );
      const roundtrip = Buffer.from(decompressed).equals(Buffer.from(rawBytes));
      results.push({
        algorithm: label,
        compressedSize: compressed.byteLength,
        ratio: percent(compressed.byteLength, originalSize),
        compressMs: Math.round(compressMs * 100) / 100,
        decompressMs: Math.round(decompressMs * 100) / 100,
        roundtrip,
        notes: "WASM, 138KB bundle",
      });
    } catch (e: any) {
      results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Zstandard (via zstd-codec) - levels 1, 6, 19
// ---------------------------------------------------------------------------

try {
  const zstd = await new Promise<any>((resolve, reject) => {
    ZstdCodec.run((z: any) => {
      try {
        resolve(new z.Simple());
      } catch (e) {
        reject(e);
      }
    });
  });

  for (const level of [1, 6, 19] as const) {
    const label = `zstd-codec (level ${level})`;
    try {
      const [compressed, compressMs] = timeSync(() =>
        zstd.compress(rawBytes, level)
      );
      const [decompressed, decompressMs] = timeSync(() =>
        zstd.decompress(compressed)
      );
      const roundtrip = Buffer.from(decompressed).equals(Buffer.from(rawBytes));
      results.push({
        algorithm: label,
        compressedSize: compressed.byteLength,
        ratio: percent(compressed.byteLength, originalSize),
        compressMs: Math.round(compressMs * 100) / 100,
        decompressMs: Math.round(decompressMs * 100) / 100,
        roundtrip,
        notes: "WASM, ~139KB bundle",
      });
    } catch (e: any) {
      results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
    }
  }
} catch (e: any) {
  results.push({ algorithm: "zstd-codec", compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: `Init failed: ${e.message}` });
}

// ---------------------------------------------------------------------------
// 6. LZ4 (via lz4js)
// ---------------------------------------------------------------------------

{
  const label = "lz4js";
  try {
    const [compressed, compressMs] = timeSync(() => lz4.compress(rawBytes));
    const [decompressed, decompressMs] = timeSync(() =>
      lz4.decompress(compressed, originalSize)
    );
    const roundtrip = Buffer.from(decompressed).equals(Buffer.from(rawBytes));
    results.push({
      algorithm: label,
      compressedSize: compressed.byteLength,
      ratio: percent(compressed.byteLength, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Pure JS, ~14KB bundle",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

// ---------------------------------------------------------------------------
// 7. LZMA (via lzma package) - level 1 only (higher levels are very slow)
// ---------------------------------------------------------------------------

for (const level of [1] as const) {
  const label = `lzma (level ${level})`;
  try {
    let compressedResult: Int8Array | null = null;
    let compressMs = 0;
    let decompressMs = 0;
    let decompressedResult: Int8Array | null = null;

    // LZMA.compress is sync when no callback is provided in this build
    const startC = performance.now();
    await new Promise<void>((resolve, reject) => {
      LZMA.compress(rawBytes, level, (result: any, err: any) => {
        compressMs = performance.now() - startC;
        if (err) return reject(err);
        compressedResult = result;
        resolve();
      });
    });

    const startD = performance.now();
    await new Promise<void>((resolve, reject) => {
      LZMA.decompress(compressedResult!, (result: any, err: any) => {
        decompressMs = performance.now() - startD;
        if (err) return reject(err);
        decompressedResult = result;
        resolve();
      });
    });

    const compressedBytes = new Uint8Array(compressedResult!);
    const decompressedBytes = new Uint8Array(decompressedResult!);
    const roundtrip = Buffer.from(decompressedBytes).equals(Buffer.from(rawBytes));

    results.push({
      algorithm: label,
      compressedSize: compressedBytes.byteLength,
      ratio: percent(compressedBytes.byteLength, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Pure JS, ~25KB bundle",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

// ---------------------------------------------------------------------------
// 8. LZ-String (UTF16 + Base64)
// ---------------------------------------------------------------------------

{
  const label = "lz-string (UTF16)";
  try {
    const [compressed, compressMs] = timeSync(() => LZString.compressToUTF16(html));
    const compressedSize = compressed.length * 2;
    const [decompressed, decompressMs] = timeSync(() => LZString.decompressFromUTF16(compressed));
    const roundtrip = decompressed === html;
    results.push({
      algorithm: label,
      compressedSize,
      ratio: percent(compressedSize, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Pure JS, <1KB, UTF-16 output",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

{
  const label = "lz-string (Base64)";
  try {
    const [compressed, compressMs] = timeSync(() => LZString.compressToBase64(html));
    const compressedSize = compressed.length;
    const [decompressed, decompressMs] = timeSync(() => LZString.decompressFromBase64(compressed));
    const roundtrip = decompressed === html;
    results.push({
      algorithm: label,
      compressedSize,
      ratio: percent(compressedSize, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Pure JS, <1KB, Base64 output",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

// ---------------------------------------------------------------------------
// 9. Native zlib gzip (levels 1, 6, 9) - reference baseline
// ---------------------------------------------------------------------------

for (const level of [1, 6, 9] as const) {
  const label = `native zlib gzip (level ${level})`;
  try {
    const input = Buffer.from(rawBytes);
    const [compressed, compressMs] = timeSync(() => gzipSync(input, { level }));
    const [decompressed, decompressMs] = timeSync(() => gunzipSync(compressed));
    const roundtrip = decompressed.equals(input);
    results.push({
      algorithm: label,
      compressedSize: compressed.byteLength,
      ratio: percent(compressed.byteLength, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Native C (zlib), reference",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

// ---------------------------------------------------------------------------
// 10. Native brotli (levels 1, 6, 11) - reference baseline
// ---------------------------------------------------------------------------

for (const quality of [1, 6, 11] as const) {
  const label = `native brotli (quality ${quality})`;
  try {
    const input = Buffer.from(rawBytes);
    const [compressed, compressMs] = timeSync(() =>
      brotliCompressSync(input, { params: { [constants.BROTLI_PARAM_QUALITY]: quality } })
    );
    const [decompressed, decompressMs] = timeSync(() => brotliDecompressSync(compressed));
    const roundtrip = decompressed.equals(input);
    results.push({
      algorithm: label,
      compressedSize: compressed.byteLength,
      ratio: percent(compressed.byteLength, originalSize),
      compressMs: Math.round(compressMs * 100) / 100,
      decompressMs: Math.round(decompressMs * 100) / 100,
      roundtrip,
      notes: "Native C, reference",
    });
  } catch (e: any) {
    results.push({ algorithm: label, compressedSize: 0, ratio: "FAIL", compressMs: 0, decompressMs: 0, roundtrip: false, notes: e.message });
  }
}

// ---------------------------------------------------------------------------
// Print results (sorted by compressed size)
// ---------------------------------------------------------------------------

console.log();
const header =
  "ALGORITHM".padEnd(35) +
  "SIZE".padStart(12) +
  "RATIO".padStart(10) +
  "COMPRESS".padStart(12) +
  "DECOMP".padStart(12) +
  " OK  " +
  "NOTES";
console.log(header);
console.log("-".repeat(header.length + 30));

results.sort((a, b) => {
  if (a.compressedSize === 0) return 1;
  if (b.compressedSize === 0) return -1;
  return a.compressedSize - b.compressedSize;
});

for (const r of results) {
  const size = r.compressedSize > 0 ? formatBytes(r.compressedSize) : "FAIL";
  console.log(
    r.algorithm.padEnd(35) +
      size.padStart(12) +
      r.ratio.padStart(10) +
      `${r.compressMs}ms`.padStart(12) +
      `${r.decompressMs}ms`.padStart(12) +
      (r.roundtrip ? "  ✓  " : "  ✗  ") +
      r.notes
  );
}

console.log("-".repeat(header.length + 30));
console.log(`\nOriginal: ${formatBytes(originalSize)} (${originalSize} bytes)`);

const best = results.find((r) => r.compressedSize > 0);
if (best) {
  console.log(`Best: ${best.algorithm} -> ${formatBytes(best.compressedSize)} (${best.ratio} reduction)`);
}

const bestPureJS = results.find(
  (r) => r.compressedSize > 0 && (r.notes.includes("Pure JS") || r.notes.includes("<1KB"))
);
if (bestPureJS) {
  console.log(`Best (Pure JS only): ${bestPureJS.algorithm} -> ${formatBytes(bestPureJS.compressedSize)} (${bestPureJS.ratio} reduction)`);
}

// ---------------------------------------------------------------------------
// Save results
// ---------------------------------------------------------------------------

const output = {
  source: "sample.html",
  originalSize,
  timestamp: new Date().toISOString(),
  results: results.map((r) => ({ ...r })),
};

await Bun.write(import.meta.dir + "/results.json", JSON.stringify(output, null, 2));
console.log("\nResults saved to results.json");
