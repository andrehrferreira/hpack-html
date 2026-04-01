/**
 * Generate canonical .hpack test vectors for cross-SDK validation.
 *
 * Each vector is a .hpack file + a .json file with expected decode results.
 * All SDKs (TS, Rust, Dart) must produce identical results for these vectors.
 *
 * Usage: bun run packages/test-vectors/generate.ts
 */

import { pack } from "../hpack-html-js/src/index.js";
import { unpack } from "../hpack-html/src/index.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const dir = join(import.meta.dirname, "fixtures");
mkdirSync(dir, { recursive: true });

async function sha256(text: string): Promise<string> {
  return new Bun.CryptoHasher("sha256").update(new TextEncoder().encode(text)).digest("hex");
}

interface Vector {
  name: string;
  html: string;
  options: Parameters<typeof pack>[1];
  description: string;
}

const vectors: Vector[] = [
  {
    name: "minimal",
    html: "<h1>Hello World</h1>",
    options: { url: "https://example.com/minimal", minify: false, checksum: true },
    description: "Minimal HTML, no minification, with checksum",
  },
  {
    name: "empty",
    html: "",
    options: { url: "https://example.com/empty", minify: false, checksum: true },
    description: "Empty HTML body",
  },
  {
    name: "unicode",
    html: "<p>日本語 🌍 مرحبا Привет café</p>",
    options: { url: "https://example.com/日本語", minify: false, checksum: true },
    description: "Unicode: CJK, emoji, Arabic, Cyrillic, Latin accents",
  },
  {
    name: "no-checksum",
    html: "<p>no checksum test</p>",
    options: { url: "https://example.com/no-checksum", minify: false, checksum: false },
    description: "Packet without CRC32 checksum",
  },
  {
    name: "all-fields",
    html: "<html><head><title>Test</title></head><body><p>All fields test</p></body></html>",
    options: {
      url: "https://www.example.com/page?id=123&lang=en",
      etag: '"W/abc-def-123"',
      signature: "hmac-sha256:abcdef1234567890abcdef1234567890",
      contentType: "text/html; charset=utf-8",
      timestamp: 1711929600000,
      encoding: "utf-8",
      minify: false,
      checksum: true,
    },
    description: "All standard header fields populated",
  },
  {
    name: "custom-fields",
    html: "<div>Custom metadata test</div>",
    options: {
      url: "https://example.com/custom",
      custom: {
        crawlerId: "chrome-ext-v3",
        sessionId: "sess-abc-123",
        pageType: "product",
        region: "us-east-1",
      },
      minify: false,
      checksum: true,
    },
    description: "Multiple custom key-value header fields",
  },
  {
    name: "minified",
    html: '<!-- remove --><div  class="foo"  id="bar">  <p>  hello  world  </p>  <li>item</li>  </div>',
    options: { url: "https://example.com/minified", minify: true, checksum: true },
    description: "HTML minification enabled (comments, whitespace, optional tags)",
  },
  {
    name: "large-url",
    html: "<p>Large URL test</p>",
    options: {
      url: "https://example.com/" + "a".repeat(2000),
      minify: false,
      checksum: true,
    },
    description: "URL with 2000+ characters",
  },
  {
    name: "level-fast",
    html: "<div>" + "<p>paragraph content here for compression testing</p>".repeat(100) + "</div>",
    options: { url: "https://example.com/fast", level: "fast", minify: false, checksum: true },
    description: "Compression level: fast (level 1)",
  },
  {
    name: "level-max",
    html: "<div>" + "<p>paragraph content here for compression testing</p>".repeat(100) + "</div>",
    options: { url: "https://example.com/max", level: "max", minify: false, checksum: true },
    description: "Compression level: max (level 9)",
  },
  {
    name: "special-chars",
    html: '<p>Special: &amp; &lt; &gt; "quotes" \'apostrophe\' backslash\\ tab\tnewline\n</p>',
    options: { url: "https://example.com/special?a=1&b=2&c=<3>", minify: false, checksum: true },
    description: "HTML entities, special chars in URL and body",
  },
  {
    name: "nested-html",
    html: "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>",
    options: { url: "https://example.com/table", minify: true, checksum: true },
    description: "Deeply nested HTML with optional closing tags removed by minifier",
  },
];

// Also fetch real pages
const realPages = [
  { name: "real-hackernews", url: "https://news.ycombinator.com/" },
  { name: "real-wikipedia", url: "https://en.wikipedia.org/wiki/HTML" },
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function generate() {
  console.log("Generating test vectors...\n");

  for (const vec of vectors) {
    process.stdout.write(`  ${vec.name.padEnd(20)}`);
    const packed = await pack(vec.html, vec.options);
    const result = await unpack(packed);

    const rawBytes = Buffer.byteLength(vec.html, "utf-8");

    writeFileSync(join(dir, `${vec.name}.hpack`), packed);
    writeFileSync(
      join(dir, `${vec.name}.json`),
      JSON.stringify(
        {
          description: vec.description,
          url: result.url,
          etag: result.etag ?? null,
          signature: result.signature ?? null,
          contentType: result.contentType ?? null,
          timestamp: result.timestamp ?? null,
          encoding: result.encoding ?? null,
          custom: result.custom ?? null,
          minified: result.minified,
          checksumValid: result.checksumValid ?? null,
          compressionAlgorithm: result.compressionAlgorithm,
          htmlSha256: await sha256(result.html),
          rawHtmlBytes: rawBytes,
          packedBytes: packed.length,
        },
        null,
        2,
      ),
    );

    const ratio = rawBytes > 0 ? `${((1 - packed.length / rawBytes) * 100).toFixed(1)}%` : "N/A";
    console.log(`${rawBytes}B -> ${packed.length}B (${ratio})  ✓`);
  }

  // Real pages
  for (const { name, url } of realPages) {
    process.stdout.write(`  ${name.padEnd(20)}`);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      if (!res.ok) {
        console.log(`SKIP (HTTP ${res.status})`);
        continue;
      }
      const html = await res.text();
      const rawBytes = Buffer.byteLength(html, "utf-8");

      const packed = await pack(html, {
        url,
        etag: `"${name}-etag"`,
        signature: `sig-${name}`,
        contentType: "text/html; charset=utf-8",
        timestamp: 1711929600000, // fixed for reproducibility
        encoding: "utf-8",
        custom: { source: "test-vector", page: name },
        minify: true,
        checksum: true,
      });

      const result = await unpack(packed);

      writeFileSync(join(dir, `${name}.hpack`), packed);
      writeFileSync(
        join(dir, `${name}.json`),
        JSON.stringify(
          {
            description: `Real page: ${url}`,
            url: result.url,
            etag: result.etag,
            signature: result.signature,
            contentType: result.contentType,
            timestamp: result.timestamp,
            encoding: result.encoding,
            custom: result.custom,
            minified: result.minified,
            checksumValid: result.checksumValid,
            compressionAlgorithm: result.compressionAlgorithm,
            htmlSha256: await sha256(result.html),
            rawHtmlBytes: rawBytes,
            packedBytes: packed.length,
          },
          null,
          2,
        ),
      );

      const ratio = ((1 - packed.length / rawBytes) * 100).toFixed(1);
      console.log(`${(rawBytes / 1024).toFixed(1)}KB -> ${(packed.length / 1024).toFixed(1)}KB (${ratio}%)  ✓`);
    } catch (e: any) {
      console.log(`SKIP (${e.message})`);
    }
  }

  console.log(`\nDone. ${vectors.length + realPages.length} vectors in: ${dir}`);
}

generate().catch(console.error);
