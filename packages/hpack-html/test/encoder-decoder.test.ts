import { describe, it, expect } from "vitest";
import { encodePacket } from "../src/encoder.js";
import {
  decodePacket,
  decodeHeaders,
  InvalidMagicError,
  UnsupportedVersionError,
  TruncatedPacketError,
} from "../src/decoder.js";
import { encodeFlags, COMPRESSION_DEFLATE, COMPRESSION_GZIP } from "../src/format.js";
import {
  FIELD_URL,
  FIELD_ETAG,
  FIELD_SIGNATURE,
  FIELD_CONTENT_TYPE,
  FIELD_TIMESTAMP,
  FIELD_ENCODING,
  FIELD_CUSTOM_START,
} from "../src/format.js";
import { crc32 } from "../src/crc32.js";
import type { HeaderField } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePacket(overrides: Partial<Parameters<typeof encodePacket>[0]> = {}) {
  const body = new TextEncoder().encode("<h1>Hello</h1>");
  const defaults = {
    flags: encodeFlags(true, true, COMPRESSION_DEFLATE),
    fields: [{ type: FIELD_URL, value: "https://example.com" }] as HeaderField[],
    compressedBody: body, // not actually compressed for test simplicity
    uncompressedLength: body.length,
    crc32: crc32(body),
  };
  return encodePacket({ ...defaults, ...overrides });
}

// ---------------------------------------------------------------------------
// Encoder tests
// ---------------------------------------------------------------------------

describe("encodePacket", () => {
  it("should produce a packet starting with magic bytes", () => {
    const packet = makePacket();
    expect(packet[0]).toBe(0x89);
    expect(packet[1]).toBe(0x48);
    expect(packet[2]).toBe(0x50);
    expect(packet[3]).toBe(0x4b);
  });

  it("should include version byte after magic", () => {
    const packet = makePacket();
    expect(packet[4]).toBe(0x01);
  });

  it("should include flags byte after version", () => {
    const flags = encodeFlags(true, true, COMPRESSION_GZIP);
    const packet = makePacket({ flags });
    expect(packet[5]).toBe(flags);
  });

  it("should encode packet with no fields", () => {
    const packet = makePacket({ fields: [] });
    const decoded = decodePacket(packet);
    expect(decoded.fields).toEqual([]);
  });

  it("should encode packet with multiple known fields", () => {
    const fields: HeaderField[] = [
      { type: FIELD_URL, value: "https://example.com" },
      { type: FIELD_ETAG, value: '"abc123"' },
      { type: FIELD_SIGNATURE, value: "sig-xyz" },
      { type: FIELD_CONTENT_TYPE, value: "text/html" },
      { type: FIELD_TIMESTAMP, value: "1711929600000" },
      { type: FIELD_ENCODING, value: "utf-8" },
    ];
    const packet = makePacket({ fields });
    const decoded = decodePacket(packet);
    expect(decoded.fields.length).toBe(6);
    for (let i = 0; i < fields.length; i++) {
      expect(decoded.fields[i].type).toBe(fields[i].type);
      expect(decoded.fields[i].value).toBe(fields[i].value);
    }
  });

  it("should encode custom fields with name and value", () => {
    const fields: HeaderField[] = [
      { type: FIELD_URL, value: "https://example.com" },
      { type: FIELD_CUSTOM_START, name: "crawlerId", value: "bot-42" },
      { type: FIELD_CUSTOM_START + 1, name: "sessionId", value: "sess-abc" },
    ];
    const packet = makePacket({ fields });
    const decoded = decodePacket(packet);
    expect(decoded.fields.length).toBe(3);
    expect(decoded.fields[1].type).toBe(FIELD_CUSTOM_START);
    expect(decoded.fields[1].name).toBe("crawlerId");
    expect(decoded.fields[1].value).toBe("bot-42");
    expect(decoded.fields[2].name).toBe("sessionId");
    expect(decoded.fields[2].value).toBe("sess-abc");
  });

  it("should encode and decode CRC32 checksum correctly", () => {
    const body = new TextEncoder().encode("<html>test</html>");
    const checksum = crc32(body);
    const packet = makePacket({
      flags: encodeFlags(false, true, COMPRESSION_DEFLATE),
      compressedBody: body,
      uncompressedLength: body.length,
      crc32: checksum,
    });
    const decoded = decodePacket(packet);
    expect(decoded.crc32).toBe(checksum);
  });

  it("should encode packet without CRC32 when checksum flag is off", () => {
    const body = new TextEncoder().encode("<html>test</html>");
    const packet = makePacket({
      flags: encodeFlags(false, false, COMPRESSION_DEFLATE),
      compressedBody: body,
      uncompressedLength: body.length,
      crc32: undefined,
    });
    const decoded = decodePacket(packet);
    expect(decoded.crc32).toBeUndefined();
    expect(decoded.flags.checksum).toBe(false);
  });

  it("should preserve uncompressed length", () => {
    const packet = makePacket({ uncompressedLength: 150000 });
    const decoded = decodePacket(packet);
    expect(decoded.uncompressedLength).toBe(150000);
  });

  it("should handle empty compressed body", () => {
    const packet = makePacket({
      compressedBody: new Uint8Array(0),
      uncompressedLength: 0,
      flags: encodeFlags(false, false, COMPRESSION_DEFLATE),
      crc32: undefined,
    });
    const decoded = decodePacket(packet);
    expect(decoded.compressedBody.length).toBe(0);
    expect(decoded.uncompressedLength).toBe(0);
  });

  it("should handle large URL (2KB)", () => {
    const longUrl = "https://example.com/" + "a".repeat(2000);
    const fields: HeaderField[] = [{ type: FIELD_URL, value: longUrl }];
    const packet = makePacket({ fields });
    const decoded = decodePacket(packet);
    expect(decoded.fields[0].value).toBe(longUrl);
  });

  it("should handle Unicode content in field values", () => {
    const fields: HeaderField[] = [
      { type: FIELD_URL, value: "https://example.com/日本語" },
      { type: FIELD_CUSTOM_START, name: "description", value: "Olá 世界 🌍" },
    ];
    const packet = makePacket({ fields });
    const decoded = decodePacket(packet);
    expect(decoded.fields[0].value).toBe("https://example.com/日本語");
    expect(decoded.fields[1].value).toBe("Olá 世界 🌍");
  });
});

// ---------------------------------------------------------------------------
// Decoder error tests
// ---------------------------------------------------------------------------

describe("decodePacket errors", () => {
  it("should throw TruncatedPacketError for empty data", () => {
    expect(() => decodePacket(new Uint8Array([]))).toThrow(TruncatedPacketError);
  });

  it("should throw TruncatedPacketError for data smaller than MIN_PACKET_SIZE", () => {
    expect(() => decodePacket(new Uint8Array([0x89, 0x48, 0x50]))).toThrow(TruncatedPacketError);
  });

  it("should throw InvalidMagicError for wrong magic bytes", () => {
    const packet = makePacket();
    packet[0] = 0x00; // corrupt magic
    expect(() => decodePacket(packet)).toThrow(InvalidMagicError);
  });

  it("should throw UnsupportedVersionError for wrong version", () => {
    const packet = makePacket();
    packet[4] = 0x99; // bad version
    expect(() => decodePacket(packet)).toThrow(UnsupportedVersionError);
  });

  it("should throw TruncatedPacketError when header length exceeds data", () => {
    const packet = makePacket();
    const corrupted = new Uint8Array(packet.length);
    corrupted.set(packet);
    // Set header length varint to a huge value at offset 6
    corrupted[6] = 0xff;
    corrupted[7] = 0xff;
    corrupted[8] = 0x7f;
    expect(() => decodePacket(corrupted)).toThrow(TruncatedPacketError);
  });

  it("should throw TruncatedPacketError when body section is missing", () => {
    // Build a packet that has magic+version+flags+header but nothing for body
    // Manually: magic(4) + version(1) + flags(1) + headerLen=1(1) + fieldCount=0(1) = 8 bytes, no body
    const data = new Uint8Array([
      0x89, 0x48, 0x50, 0x4b, // magic
      0x01,                     // version
      0x00,                     // flags (no checksum, no minify, deflate)
      0x01,                     // header length = 1
      0x00,                     // field count = 0
      // no body section
    ]);
    expect(() => decodePacket(data)).toThrow(TruncatedPacketError);
  });

  it("should throw TruncatedPacketError when compressed body is truncated (checksum expected but missing)", () => {
    // Packet with checksum flag set but not enough trailing bytes for CRC32
    const data = new Uint8Array([
      0x89, 0x48, 0x50, 0x4b, // magic
      0x01,                     // version
      0x02,                     // flags: checksum=1 (bit1)
      0x01,                     // header length = 1
      0x00,                     // field count = 0
      0x05,                     // uncompressed length = 5
      0x01, 0x02,               // 2 bytes of compressed body — not enough for CRC32 after
    ]);
    expect(() => decodePacket(data)).toThrow(TruncatedPacketError);
  });

  it("should throw TruncatedPacketError when field extends beyond header", () => {
    // Craft a packet where field count says 1 field but header section is too short
    const data = new Uint8Array([
      0x89, 0x48, 0x50, 0x4b, // magic
      0x01,                     // version
      0x00,                     // flags
      0x02,                     // header length = 2
      0x01,                     // field count = 1
      0x01,                     // field type = URL (0x01)
      // Missing value length and value — header section ends here
      0x00,                     // uncompressed length = 0 (body)
    ]);
    expect(() => decodePacket(data)).toThrow(); // VarInt or truncation error
  });

  it("should throw TruncatedPacketError when custom field name is truncated", () => {
    const data = new Uint8Array([
      0x89, 0x48, 0x50, 0x4b, // magic
      0x01,                     // version
      0x00,                     // flags
      0x04,                     // header length = 4
      0x01,                     // field count = 1
      0x10,                     // field type = custom (0x10)
      0x0a,                     // name length = 10 (but only 1 byte available)
      0x41,                     // 'A' — truncated
      0x00,                     // body: uncompressed length
    ]);
    expect(() => decodePacket(data)).toThrow(TruncatedPacketError);
  });

  it("should throw TruncatedPacketError when custom field value is truncated", () => {
    const data = new Uint8Array([
      0x89, 0x48, 0x50, 0x4b, // magic
      0x01,                     // version
      0x00,                     // flags
      0x06,                     // header length = 6
      0x01,                     // field count = 1
      0x10,                     // field type = custom (0x10)
      0x01,                     // name length = 1
      0x41,                     // name = 'A'
      0x0a,                     // value length = 10 (truncated)
      0x42,                     // 'B' — only 1 byte, need 10
      0x00,                     // body: uncompressed length
    ]);
    expect(() => decodePacket(data)).toThrow(TruncatedPacketError);
  });

  it("should throw TruncatedPacketError when known field value is truncated", () => {
    const data = new Uint8Array([
      0x89, 0x48, 0x50, 0x4b, // magic
      0x01,                     // version
      0x00,                     // flags
      0x04,                     // header length = 4
      0x01,                     // field count = 1
      0x01,                     // field type = URL
      0x0a,                     // value length = 10 (but only 1 byte left in header)
      0x41,                     // 'A' — truncated
      0x00,                     // body
    ]);
    expect(() => decodePacket(data)).toThrow(TruncatedPacketError);
  });

  it("should throw TruncatedPacketError when field count exceeds header bounds", () => {
    const data = new Uint8Array([
      0x89, 0x48, 0x50, 0x4b, // magic
      0x01,                     // version
      0x00,                     // flags
      0x01,                     // header length = 1 (only room for field count)
      0x05,                     // field count = 5 (but no field data)
      0x00,                     // body: uncompressed length
    ]);
    expect(() => decodePacket(data)).toThrow(TruncatedPacketError);
  });

  it("should throw TruncatedPacketError when custom field name length byte is missing", () => {
    const data = new Uint8Array([
      0x89, 0x48, 0x50, 0x4b, // magic
      0x01,                     // version
      0x00,                     // flags
      0x02,                     // header length = 2
      0x01,                     // field count = 1
      0x10,                     // field type = custom (0x10) — no name length byte, header ends
      0x00,                     // body
    ]);
    expect(() => decodePacket(data)).toThrow(TruncatedPacketError);
  });
});

// ---------------------------------------------------------------------------
// Roundtrip tests
// ---------------------------------------------------------------------------

describe("encode/decode roundtrip", () => {
  it("should roundtrip a minimal packet", () => {
    const body = new Uint8Array([1, 2, 3]);
    const fields: HeaderField[] = [{ type: FIELD_URL, value: "https://x.com" }];
    const flags = encodeFlags(false, false, COMPRESSION_DEFLATE);
    const packet = encodePacket({
      flags,
      fields,
      compressedBody: body,
      uncompressedLength: 100,
    });
    const decoded = decodePacket(packet);
    expect(decoded.version).toBe(0x01);
    expect(decoded.flags.minified).toBe(false);
    expect(decoded.flags.checksum).toBe(false);
    expect(decoded.compressionAlgorithm).toBe("deflate");
    expect(decoded.fields.length).toBe(1);
    expect(decoded.fields[0].value).toBe("https://x.com");
    expect(decoded.compressedBody).toEqual(body);
    expect(decoded.uncompressedLength).toBe(100);
    expect(decoded.crc32).toBeUndefined();
  });

  it("should roundtrip a full packet with all field types and CRC32", () => {
    const body = new TextEncoder().encode("<html><body>Hello World</body></html>");
    const checksum = crc32(body);
    const fields: HeaderField[] = [
      { type: FIELD_URL, value: "https://www.americanas.com.br/produto/123" },
      { type: FIELD_ETAG, value: '"W/abc-def-123"' },
      { type: FIELD_SIGNATURE, value: "hmac-sha256:abcdef1234567890" },
      { type: FIELD_CONTENT_TYPE, value: "text/html; charset=utf-8" },
      { type: FIELD_TIMESTAMP, value: "1711929600000" },
      { type: FIELD_ENCODING, value: "utf-8" },
      { type: FIELD_CUSTOM_START, name: "crawlerId", value: "chrome-ext-v2" },
      { type: FIELD_CUSTOM_START + 1, name: "pageType", value: "product" },
    ];
    const flags = encodeFlags(true, true, COMPRESSION_GZIP);
    const packet = encodePacket({
      flags,
      fields,
      compressedBody: body,
      uncompressedLength: body.length,
      crc32: checksum,
    });

    const decoded = decodePacket(packet);
    expect(decoded.version).toBe(0x01);
    expect(decoded.flags.minified).toBe(true);
    expect(decoded.flags.checksum).toBe(true);
    expect(decoded.compressionAlgorithm).toBe("gzip");
    expect(decoded.fields.length).toBe(8);
    expect(decoded.crc32).toBe(checksum);
    expect(decoded.uncompressedLength).toBe(body.length);
    expect(decoded.compressedBody).toEqual(body);

    // Verify each field
    for (let i = 0; i < fields.length; i++) {
      expect(decoded.fields[i].type).toBe(fields[i].type);
      expect(decoded.fields[i].value).toBe(fields[i].value);
      if (fields[i].name) {
        expect(decoded.fields[i].name).toBe(fields[i].name);
      }
    }
  });

  it("should roundtrip with gzip compression flag", () => {
    const flags = encodeFlags(false, false, COMPRESSION_GZIP);
    const packet = makePacket({ flags, crc32: undefined });
    const decoded = decodePacket(packet);
    expect(decoded.compressionAlgorithm).toBe("gzip");
  });
});

// ---------------------------------------------------------------------------
// decodeHeaders tests
// ---------------------------------------------------------------------------

describe("decodeHeaders", () => {
  it("should return only headers without body data", () => {
    const fields: HeaderField[] = [
      { type: FIELD_URL, value: "https://example.com/page" },
      { type: FIELD_ETAG, value: '"etag-value"' },
    ];
    const packet = makePacket({ fields });
    const headers = decodeHeaders(packet);

    expect(headers.version).toBe(0x01);
    expect(headers.fields.length).toBe(2);
    expect(headers.fields[0].value).toBe("https://example.com/page");
    expect(headers.fields[1].value).toBe('"etag-value"');
    expect(headers.compressionAlgorithm).toBe("deflate");
    // Should not have compressedBody or crc32 in the result
    expect((headers as any).compressedBody).toBeUndefined();
    expect((headers as any).crc32).toBeUndefined();
  });
});
