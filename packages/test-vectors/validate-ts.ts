/**
 * Validate all test vectors against the TypeScript decompressor.
 * Usage: bun run packages/test-vectors/validate-ts.ts
 */

import { unpack } from "../hpack-html/src/index.js";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const dir = join(import.meta.dirname, "fixtures");

async function sha256(text: string): Promise<string> {
  return new Bun.CryptoHasher("sha256").update(new TextEncoder().encode(text)).digest("hex");
}

async function validate() {
  const hpackFiles = readdirSync(dir).filter((f) => f.endsWith(".hpack"));
  let passed = 0;
  let failed = 0;

  console.log("Validating test vectors (TypeScript decompressor)\n");

  for (const file of hpackFiles) {
    const name = file.replace(".hpack", "");
    const jsonPath = join(dir, `${name}.json`);
    process.stdout.write(`  ${name.padEnd(20)}`);

    let expected: any;
    try {
      expected = JSON.parse(readFileSync(jsonPath, "utf-8"));
    } catch {
      console.log("SKIP (no .json)");
      continue;
    }

    const data = readFileSync(join(dir, file));
    const result = await unpack(new Uint8Array(data));

    const errors: string[] = [];

    if (result.url !== expected.url) errors.push(`url: ${result.url} != ${expected.url}`);
    if ((result.etag ?? null) !== expected.etag) errors.push(`etag: ${result.etag} != ${expected.etag}`);
    if ((result.signature ?? null) !== expected.signature) errors.push(`signature mismatch`);
    if ((result.contentType ?? null) !== expected.contentType) errors.push(`contentType mismatch`);
    if ((result.timestamp ?? null) !== expected.timestamp) errors.push(`timestamp mismatch`);
    if ((result.encoding ?? null) !== expected.encoding) errors.push(`encoding mismatch`);
    if (result.minified !== expected.minified) errors.push(`minified: ${result.minified} != ${expected.minified}`);

    const checksumResult = result.checksumValid ?? null;
    if (checksumResult !== expected.checksumValid) errors.push(`checksumValid: ${checksumResult} != ${expected.checksumValid}`);

    const htmlHash = await sha256(result.html);
    if (htmlHash !== expected.htmlSha256) errors.push(`htmlSha256: ${htmlHash.slice(0, 16)}... != ${expected.htmlSha256.slice(0, 16)}...`);

    // Custom fields
    if (expected.custom) {
      for (const [key, val] of Object.entries(expected.custom)) {
        if (result.custom?.[key] !== val) errors.push(`custom.${key}: ${result.custom?.[key]} != ${val}`);
      }
    }

    if (errors.length === 0) {
      console.log("✓");
      passed++;
    } else {
      console.log(`✗  ${errors.join(", ")}`);
      failed++;
    }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

validate().catch(console.error);
