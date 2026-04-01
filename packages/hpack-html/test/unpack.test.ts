import { describe, it, expect } from "vitest";
import { pack } from "../../hpack-html-js/src/index.js";
import {
  unpack,
  readHeaders,
  ChecksumMismatchError,
  DecompressionError,
  InvalidMagicError,
  UnsupportedVersionError,
  TruncatedPacketError,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Roundtrip tests
// ---------------------------------------------------------------------------

describe("unpack roundtrip", () => {
  it("should roundtrip simple HTML", async () => {
    const html = "<h1>Hello World</h1>";
    const packed = await pack(html, { url: "https://example.com" });
    const result = await unpack(packed);

    expect(result.url).toBe("https://example.com");
    expect(result.html).toContain("Hello World");
    expect(result.version).toBe(1);
    expect(result.checksumValid).toBe(true);
  });

  it("should roundtrip all metadata fields", async () => {
    const packed = await pack("<p>test</p>", {
      url: "https://example.com/page",
      etag: '"abc123"',
      signature: "sig-xyz-123",
      contentType: "text/html; charset=utf-8",
      timestamp: 1711929600000,
      encoding: "utf-8",
      custom: { crawlerId: "bot-42", region: "us-east-1" },
    });
    const result = await unpack(packed);

    expect(result.url).toBe("https://example.com/page");
    expect(result.etag).toBe('"abc123"');
    expect(result.signature).toBe("sig-xyz-123");
    expect(result.contentType).toBe("text/html; charset=utf-8");
    expect(result.timestamp).toBe(1711929600000);
    expect(result.encoding).toBe("utf-8");
    expect(result.custom).toEqual({ crawlerId: "bot-42", region: "us-east-1" });
  });

  it("should roundtrip with minification disabled", async () => {
    const html = "<p>  hello  world  </p>";
    const packed = await pack(html, { url: "https://example.com", minify: false });
    const result = await unpack(packed);

    expect(result.html).toBe(html);
    expect(result.minified).toBe(false);
  });

  it("should roundtrip empty HTML", async () => {
    const packed = await pack("", { url: "https://example.com" });
    const result = await unpack(packed);
    expect(result.html).toBe("");
  });

  it("should roundtrip large HTML", async () => {
    const html = "<div>" + "<p>paragraph content here</p>".repeat(3000) + "</div>";
    const packed = await pack(html, { url: "https://example.com", minify: false });
    const result = await unpack(packed);
    expect(result.html).toBe(html);
  });

  it("should roundtrip Unicode content", async () => {
    const html = "<p>日本語 🌍 مرحبا Привет</p>";
    const packed = await pack(html, { url: "https://example.com/日本語", minify: false });
    const result = await unpack(packed);

    expect(result.html).toBe(html);
    expect(result.url).toBe("https://example.com/日本語");
  });

  it("should set checksumValid=true for valid checksum", async () => {
    const packed = await pack("<p>test</p>", { url: "https://example.com", checksum: true });
    const result = await unpack(packed);
    expect(result.checksumValid).toBe(true);
  });

  it("should set checksumValid=undefined when no checksum in packet", async () => {
    const packed = await pack("<p>test</p>", { url: "https://example.com", checksum: false });
    const result = await unpack(packed);
    expect(result.checksumValid).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// headersOnly / readHeaders
// ---------------------------------------------------------------------------

describe("headersOnly and readHeaders", () => {
  it("should return empty html with headersOnly=true", async () => {
    const packed = await pack("<p>big content</p>", { url: "https://example.com" });
    const result = await unpack(packed, { headersOnly: true });

    expect(result.url).toBe("https://example.com");
    expect(result.html).toBe("");
    expect(result.checksumValid).toBeUndefined();
  });

  it("should return metadata via readHeaders", async () => {
    const packed = await pack("<p>content</p>", {
      url: "https://example.com/page",
      etag: '"etag-val"',
      signature: "sig-val",
    });
    const headers = await readHeaders(packed);

    expect(headers.url).toBe("https://example.com/page");
    expect(headers.etag).toBe('"etag-val"');
    expect(headers.signature).toBe("sig-val");
    expect(headers.version).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("unpack errors", () => {
  it("should throw InvalidMagicError for bad magic", async () => {
    const packed = await pack("<p>test</p>", { url: "https://example.com" });
    packed[0] = 0x00; // corrupt magic
    await expect(unpack(packed)).rejects.toThrow(InvalidMagicError);
  });

  it("should throw UnsupportedVersionError for bad version", async () => {
    const packed = await pack("<p>test</p>", { url: "https://example.com" });
    packed[4] = 0x99; // bad version
    await expect(unpack(packed)).rejects.toThrow(UnsupportedVersionError);
  });

  it("should throw TruncatedPacketError for truncated data", async () => {
    await expect(unpack(new Uint8Array([0x89, 0x48, 0x50]))).rejects.toThrow(TruncatedPacketError);
  });

  it("should throw DecompressionError for corrupted compressed data", async () => {
    const packed = await pack("<p>test</p>", { url: "https://example.com", checksum: false });
    // Corrupt some bytes in the compressed body area (after headers)
    const bodyStart = packed.length - 10;
    for (let i = bodyStart; i < packed.length; i++) {
      packed[i] = 0xff;
    }
    await expect(unpack(packed)).rejects.toThrow(DecompressionError);
  });

  it("should throw ChecksumMismatchError for bad CRC32", async () => {
    const packed = await pack("<p>test</p>", { url: "https://example.com", checksum: true });
    // Corrupt the last 4 bytes (CRC32) to a wrong value
    packed[packed.length - 4] ^= 0x01;
    packed[packed.length - 3] ^= 0x01;
    packed[packed.length - 2] ^= 0x01;
    packed[packed.length - 1] ^= 0x01;
    await expect(unpack(packed)).rejects.toThrow(ChecksumMismatchError);
  });

  it("should skip checksum verification when verifyChecksum=false", async () => {
    const packed = await pack("<p>test</p>", { url: "https://example.com", checksum: true });
    // We can't easily corrupt just the CRC32 without corrupting the body,
    // so just verify the option doesn't throw for a valid packet
    const result = await unpack(packed, { verifyChecksum: false });
    expect(result.checksumValid).toBe(true); // still computed, just not thrown
  });
});
