/**
 * End-to-end verification: fetch real HTML -> pack -> unpack -> compare byte-by-byte.
 * Usage: bun run benchmark/e2e-verify.ts
 */

import { pack } from "../packages/hpack-html-js/src/index.js";
import { unpack } from "../packages/hpack-html/src/index.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const pages = [
  { name: "Americanas", url: "https://www.americanas.com.br/celular-samsung-galaxy-a17-com-ia--128gb--4gb-ram--camera-de-50mp--tela-de-6-7---nfc--ip54--cinza/p" },
  { name: "Wikipedia (HTML)", url: "https://en.wikipedia.org/wiki/HTML" },
  { name: "Hacker News", url: "https://news.ycombinator.com/" },
  { name: "Google (BR)", url: "https://www.google.com.br/" },
  { name: "Cloudflare Blog", url: "https://blog.cloudflare.com/" },
];

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "pt-BR,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

console.log("=".repeat(100));
console.log("END-TO-END VERIFICATION: fetch -> pack -> unpack -> compare");
console.log("=".repeat(100));
console.log();

let passed = 0;
let failed = 0;

for (const { name, url } of pages) {
  process.stdout.write(`${name.padEnd(25)}`);

  let rawHtml: string;
  try {
    rawHtml = await fetchHtml(url);
  } catch (e: any) {
    console.log(`SKIP (${e.message})`);
    continue;
  }

  const rawBytes = Buffer.byteLength(rawHtml, "utf-8");

  // --- Pack WITHOUT minification (exact roundtrip) ---
  const packedExact = await pack(rawHtml, {
    url,
    etag: '"test-etag"',
    signature: "test-sig",
    minify: false,
    checksum: true,
  });

  const resultExact = await unpack(packedExact);

  const exactMatch = resultExact.html === rawHtml;
  const exactBytes = Buffer.byteLength(resultExact.html, "utf-8");

  // --- Pack WITH minification (verify it's valid HTML, smaller, and decompresses) ---
  const packedMinified = await pack(rawHtml, {
    url,
    etag: '"test-etag"',
    signature: "test-sig",
    minify: true,
    checksum: true,
  });

  const resultMinified = await unpack(packedMinified);
  const minifiedBytes = Buffer.byteLength(resultMinified.html, "utf-8");

  // Minified HTML should be smaller
  const minifiedSmaller = minifiedBytes <= rawBytes;
  // Minified HTML should still contain key structural elements
  const hasHtmlContent = resultMinified.html.includes("<") && resultMinified.html.includes(">");

  // --- Metadata check ---
  const metaOk =
    resultExact.url === url &&
    resultExact.etag === '"test-etag"' &&
    resultExact.signature === "test-sig" &&
    resultExact.checksumValid === true;

  const allOk = exactMatch && minifiedSmaller && hasHtmlContent && metaOk;

  if (allOk) {
    const ratio = ((1 - packedMinified.length / rawBytes) * 100).toFixed(1);
    console.log(
      `✓  raw=${(rawBytes / 1024).toFixed(1)}KB` +
      `  packed=${(packedMinified.length / 1024).toFixed(1)}KB (${ratio}%)` +
      `  exact_roundtrip=YES` +
      `  checksum=OK` +
      `  metadata=OK`
    );
    passed++;
  } else {
    console.log(`✗  FAILED`);
    if (!exactMatch) {
      console.log(`     exact roundtrip FAILED: raw=${rawBytes}B, decompressed=${exactBytes}B`);
      // Show first difference
      for (let i = 0; i < Math.min(rawHtml.length, resultExact.html.length); i++) {
        if (rawHtml[i] !== resultExact.html[i]) {
          const ctx = 40;
          console.log(`     first diff at char ${i}:`);
          console.log(`       raw:    ...${JSON.stringify(rawHtml.slice(Math.max(0, i - ctx), i + ctx))}...`);
          console.log(`       unpack: ...${JSON.stringify(resultExact.html.slice(Math.max(0, i - ctx), i + ctx))}...`);
          break;
        }
      }
      if (rawHtml.length !== resultExact.html.length) {
        console.log(`     length: raw=${rawHtml.length} chars, decompressed=${resultExact.html.length} chars`);
      }
    }
    if (!minifiedSmaller) console.log(`     minified NOT smaller: raw=${rawBytes}B, minified=${minifiedBytes}B`);
    if (!hasHtmlContent) console.log(`     minified has no HTML tags`);
    if (!metaOk) console.log(`     metadata mismatch: url=${resultExact.url}, etag=${resultExact.etag}, sig=${resultExact.signature}, checksum=${resultExact.checksumValid}`);
    failed++;
  }
}

console.log();
console.log("=".repeat(100));
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log("=".repeat(100));

if (failed > 0) process.exit(1);
