/**
 * Generate .hpack test vectors from REAL web pages.
 * Run: bun run packages/hpack-html-rs/tests/generate_vectors.ts
 */

import { pack } from "../../hpack-html-js/src/index.js";
import { unpack } from "../../hpack-html/src/index.js";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const dir = join(import.meta.dirname, "fixtures");
mkdirSync(dir, { recursive: true });

const pages: Array<{ name: string; url: string }> = [
  { name: "americanas", url: "https://www.americanas.com.br/celular-samsung-galaxy-a17-com-ia--128gb--4gb-ram--camera-de-50mp--tela-de-6-7---nfc--ip54--cinza/p" },
  { name: "github", url: "https://github.com/nicollasbolado" },
  { name: "wikipedia", url: "https://en.wikipedia.org/wiki/HTML" },
  { name: "hackernews", url: "https://news.ycombinator.com/" },
  { name: "stackoverflow", url: "https://stackoverflow.com/questions/tagged/javascript" },
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function generate() {
  // Also use the existing benchmark sample
  const samplePath = join(import.meta.dirname, "../../../benchmark/sample.html");
  if (existsSync(samplePath)) {
    pages.unshift({ name: "americanas-cached", url: "https://www.americanas.com.br/produto/cached" });
  }

  for (const { name, url } of pages) {
    console.log(`Fetching: ${name} (${url})`);

    let html: string;
    if (name === "americanas-cached") {
      html = readFileSync(samplePath, "utf-8");
    } else {
      try {
        html = await fetchPage(url);
      } catch (e: any) {
        console.log(`  SKIP: ${e.message}`);
        continue;
      }
    }

    const rawSize = Buffer.byteLength(html, "utf-8");
    console.log(`  Raw: ${(rawSize / 1024).toFixed(1)} KB`);

    // Pack with minification + checksum
    const packed = await pack(html, {
      url,
      etag: `"${name}-etag-${Date.now()}"`,
      signature: `sig-${name}-${Math.random().toString(36).slice(2, 10)}`,
      contentType: "text/html; charset=utf-8",
      timestamp: Date.now(),
      encoding: "utf-8",
      custom: { source: "test-vector", page: name },
      minify: true,
      checksum: true,
    });

    const ratio = ((1 - packed.length / rawSize) * 100).toFixed(1);
    console.log(`  Packed: ${(packed.length / 1024).toFixed(1)} KB (${ratio}% reduction)`);

    // Verify TS roundtrip
    const result = await unpack(packed);
    if (!result.html || result.checksumValid !== true) {
      console.log(`  ERROR: TS roundtrip failed!`);
      continue;
    }
    console.log(`  TS roundtrip: OK (${result.html.length} chars, checksum valid)`);

    writeFileSync(join(dir, `${name}.hpack`), packed);

    // Save expected metadata for Rust validation
    writeFileSync(join(dir, `${name}.json`), JSON.stringify({
      url: result.url,
      etag: result.etag,
      signature: result.signature,
      contentType: result.contentType,
      timestamp: result.timestamp,
      encoding: result.encoding,
      custom: result.custom,
      htmlLength: result.html.length,
      htmlSha256: await sha256(result.html),
      minified: result.minified,
      checksumValid: result.checksumValid,
    }, null, 2));
  }

  // Also keep a small synthetic vector for edge cases
  const minimal = await pack("<h1>Hello World</h1>", {
    url: "https://example.com/minimal",
    minify: false,
    checksum: true,
  });
  writeFileSync(join(dir, "minimal.hpack"), minimal);

  const empty = await pack("", {
    url: "https://example.com/empty",
    minify: false,
    checksum: true,
  });
  writeFileSync(join(dir, "empty.hpack"), empty);

  const unicode = await pack("<p>日本語 🌍 مرحبا Привет</p>", {
    url: "https://example.com/日本語",
    minify: false,
    checksum: true,
  });
  writeFileSync(join(dir, "unicode.hpack"), unicode);

  const noChecksum = await pack("<p>test</p>", {
    url: "https://example.com/no-checksum",
    minify: false,
    checksum: false,
  });
  writeFileSync(join(dir, "no-checksum.hpack"), noChecksum);

  console.log("\nDone. Vectors in:", dir);
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = new Bun.CryptoHasher("sha256").update(data).digest("hex");
  return hash;
}

generate().catch(console.error);
