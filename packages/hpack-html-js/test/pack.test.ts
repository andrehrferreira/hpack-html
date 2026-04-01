import { describe, it, expect } from "vitest";
import { pack } from "../src/index.js";
import {
  decodePacket,
  MAGIC,
  FIELD_URL,
  FIELD_ETAG,
  FIELD_SIGNATURE,
  FIELD_CONTENT_TYPE,
  FIELD_TIMESTAMP,
  FIELD_ENCODING,
  FIELD_CUSTOM_START,
  crc32,
} from "../../hpack-html/src/index.js";
import { inflateSync, gunzipSync } from "fflate";

// Helper: unpack compressed body from a decoded packet (handles both deflate and gzip)
function decompressBody(packet: ReturnType<typeof decodePacket>): string {
  const decompressed =
    packet.compressionAlgorithm === "gzip"
      ? gunzipSync(packet.compressedBody)
      : inflateSync(packet.compressedBody);
  return new TextDecoder().decode(decompressed);
}

describe("pack", () => {
  it("should produce a packet starting with magic bytes", async () => {
    const result = await pack("<h1>Hello</h1>", { url: "https://example.com" });
    expect(result[0]).toBe(MAGIC[0]);
    expect(result[1]).toBe(MAGIC[1]);
    expect(result[2]).toBe(MAGIC[2]);
    expect(result[3]).toBe(MAGIC[3]);
  });

  it("should include URL field in the packet", async () => {
    const result = await pack("<p>test</p>", { url: "https://example.com/page" });
    const decoded = decodePacket(result);
    const urlField = decoded.fields.find((f) => f.type === FIELD_URL);
    expect(urlField).toBeDefined();
    expect(urlField!.value).toBe("https://example.com/page");
  });

  it("should include all optional metadata fields", async () => {
    const result = await pack("<p>test</p>", {
      url: "https://example.com",
      etag: '"abc123"',
      signature: "sig-xyz",
      contentType: "text/html",
      timestamp: 1711929600000,
      encoding: "utf-8",
    });
    const decoded = decodePacket(result);

    expect(decoded.fields.find((f) => f.type === FIELD_ETAG)!.value).toBe('"abc123"');
    expect(decoded.fields.find((f) => f.type === FIELD_SIGNATURE)!.value).toBe("sig-xyz");
    expect(decoded.fields.find((f) => f.type === FIELD_CONTENT_TYPE)!.value).toBe("text/html");
    expect(decoded.fields.find((f) => f.type === FIELD_TIMESTAMP)!.value).toBe("1711929600000");
    expect(decoded.fields.find((f) => f.type === FIELD_ENCODING)!.value).toBe("utf-8");
  });

  it("should include custom fields", async () => {
    const result = await pack("<p>test</p>", {
      url: "https://example.com",
      custom: { crawlerId: "bot-42", sessionId: "sess-abc" },
    });
    const decoded = decodePacket(result);
    const customs = decoded.fields.filter((f) => f.type >= FIELD_CUSTOM_START);
    expect(customs.length).toBe(2);
    expect(customs[0].name).toBe("crawlerId");
    expect(customs[0].value).toBe("bot-42");
    expect(customs[1].name).toBe("sessionId");
    expect(customs[1].value).toBe("sess-abc");
  });

  it("should minify HTML by default", async () => {
    const html = "<!-- remove me --><p>  hello  world  </p>";
    const result = await pack(html, { url: "https://example.com" });
    const decoded = decodePacket(result);
    expect(decoded.flags.minified).toBe(true);

    // Decompress and verify minification happened
    const decompressed = decompressBody(decoded);
    expect(decompressed).not.toContain("<!-- remove me -->"); // comment removed
    expect(decompressed).toContain("hello world"); // whitespace collapsed
  });

  it("should skip minification when minify=false", async () => {
    const html = "<p>  hello  world  </p>";
    const result = await pack(html, { url: "https://example.com", minify: false });
    const decoded = decodePacket(result);
    expect(decoded.flags.minified).toBe(false);

    const decompressed = decompressBody(decoded);
    expect(decompressed).toBe(html); // unchanged
  });

  it("should include CRC32 checksum by default", async () => {
    const result = await pack("<p>test</p>", { url: "https://example.com" });
    const decoded = decodePacket(result);
    expect(decoded.flags.checksum).toBe(true);
    expect(decoded.crc32).toBeDefined();

    // Verify checksum matches decompressed content
    const decompressed =
      decoded.compressionAlgorithm === "gzip"
        ? gunzipSync(decoded.compressedBody)
        : inflateSync(decoded.compressedBody);
    expect(decoded.crc32).toBe(crc32(decompressed));
  });

  it("should skip CRC32 when checksum=false", async () => {
    const result = await pack("<p>test</p>", {
      url: "https://example.com",
      checksum: false,
    });
    const decoded = decodePacket(result);
    expect(decoded.flags.checksum).toBe(false);
    expect(decoded.crc32).toBeUndefined();
  });

  it("should use a valid compression algorithm", async () => {
    const result = await pack("<p>test</p>", { url: "https://example.com" });
    const decoded = decodePacket(result);
    // Depending on env: gzip (native CompressionStream) or deflate (fflate fallback)
    expect(["deflate", "gzip"]).toContain(decoded.compressionAlgorithm);
  });

  it("should support compression level presets", async () => {
    const html = "<div>" + "x".repeat(1000) + "</div>";
    const fast = await pack(html, { url: "https://example.com", level: "fast" });
    const max = await pack(html, { url: "https://example.com", level: "max" });
    // Max should produce smaller or equal output
    expect(max.length).toBeLessThanOrEqual(fast.length);
  });

  it("should add default timestamp when not provided", async () => {
    const before = Date.now();
    const result = await pack("<p>test</p>", { url: "https://example.com" });
    const after = Date.now();
    const decoded = decodePacket(result);
    const tsField = decoded.fields.find((f) => f.type === FIELD_TIMESTAMP);
    expect(tsField).toBeDefined();
    const ts = Number(tsField!.value);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("should throw on missing url", async () => {
    await expect(pack("<p>test</p>", { url: "" })).rejects.toThrow("url is required");
  });

  it("should handle empty HTML", async () => {
    const result = await pack("", { url: "https://example.com" });
    const decoded = decodePacket(result);
    const decompressed = decompressBody(decoded);
    expect(decompressed).toBe("");
  });

  it("should handle large HTML", async () => {
    const html = "<div>" + "<p>paragraph</p>".repeat(5000) + "</div>";
    const result = await pack(html, { url: "https://example.com" });
    expect(result.length).toBeLessThan(html.length);
    const decoded = decodePacket(result);
    expect(decoded.uncompressedLength).toBeGreaterThan(0);
  });

  it("should handle Unicode content", async () => {
    const html = "<p>日本語 🌍 مرحبا</p>";
    const result = await pack(html, { url: "https://example.com/日本語" });
    const decoded = decodePacket(result);
    const decompressed = decompressBody(decoded);
    expect(decompressed).toContain("日本語");
    expect(decompressed).toContain("🌍");
    expect(decompressed).toContain("مرحبا");
  });
});
