import { describe, it, expect } from "vitest";
import {
  MAGIC,
  MAGIC_SIZE,
  VERSION,
  FLAG_MINIFIED,
  FLAG_CHECKSUM,
  FLAG_COMPRESSION_MASK,
  FLAG_COMPRESSION_SHIFT,
  COMPRESSION_DEFLATE,
  COMPRESSION_GZIP,
  COMPRESSION_BROTLI,
  COMPRESSION_ZSTD,
  FIELD_URL,
  FIELD_ETAG,
  FIELD_SIGNATURE,
  FIELD_CONTENT_TYPE,
  FIELD_TIMESTAMP,
  FIELD_ENCODING,
  FIELD_CUSTOM_START,
  FIELD_CUSTOM_END,
  MIN_PACKET_SIZE,
  encodeFlags,
  decodeFlags,
  isCustomField,
} from "../src/format.js";

describe("Magic bytes", () => {
  it("should be 4 bytes", () => {
    expect(MAGIC.length).toBe(4);
    expect(MAGIC_SIZE).toBe(4);
  });

  it("should start with non-ASCII byte 0x89", () => {
    expect(MAGIC[0]).toBe(0x89);
  });

  it('should contain ASCII "HPK" (0x48 0x50 0x4B)', () => {
    expect(MAGIC[1]).toBe(0x48); // H
    expect(MAGIC[2]).toBe(0x50); // P
    expect(MAGIC[3]).toBe(0x4b); // K
  });
});

describe("Version", () => {
  it("should be 0x01", () => {
    expect(VERSION).toBe(0x01);
  });
});

describe("Field type constants", () => {
  it("should have unique known field type IDs", () => {
    const ids = [FIELD_URL, FIELD_ETAG, FIELD_SIGNATURE, FIELD_CONTENT_TYPE, FIELD_TIMESTAMP, FIELD_ENCODING];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have known fields in range 0x01-0x0F", () => {
    const ids = [FIELD_URL, FIELD_ETAG, FIELD_SIGNATURE, FIELD_CONTENT_TYPE, FIELD_TIMESTAMP, FIELD_ENCODING];
    for (const id of ids) {
      expect(id).toBeGreaterThanOrEqual(0x01);
      expect(id).toBeLessThanOrEqual(0x0f);
    }
  });

  it("should have custom field range from 0x10 to 0xFF", () => {
    expect(FIELD_CUSTOM_START).toBe(0x10);
    expect(FIELD_CUSTOM_END).toBe(0xff);
  });
});

describe("Compression algorithm constants", () => {
  it("should have distinct values for each algorithm", () => {
    const ids = [COMPRESSION_DEFLATE, COMPRESSION_GZIP, COMPRESSION_BROTLI, COMPRESSION_ZSTD];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should fit in 2 bits (0-3)", () => {
    expect(COMPRESSION_DEFLATE).toBe(0);
    expect(COMPRESSION_GZIP).toBe(1);
    expect(COMPRESSION_BROTLI).toBe(2);
    expect(COMPRESSION_ZSTD).toBe(3);
  });
});

describe("MIN_PACKET_SIZE", () => {
  it("should be at least magic + version + flags + 1 byte header length", () => {
    expect(MIN_PACKET_SIZE).toBe(7);
  });
});

describe("encodeFlags", () => {
  it("should encode all-false as 0", () => {
    expect(encodeFlags(false, false, COMPRESSION_DEFLATE)).toBe(0);
  });

  it("should set bit 0 for minified", () => {
    const flags = encodeFlags(true, false, COMPRESSION_DEFLATE);
    expect(flags & FLAG_MINIFIED).toBe(FLAG_MINIFIED);
  });

  it("should set bit 1 for checksum", () => {
    const flags = encodeFlags(false, true, COMPRESSION_DEFLATE);
    expect(flags & FLAG_CHECKSUM).toBe(FLAG_CHECKSUM);
  });

  it("should encode compression algorithm in bits 2-3", () => {
    const flags = encodeFlags(false, false, COMPRESSION_GZIP);
    expect((flags & FLAG_COMPRESSION_MASK) >> FLAG_COMPRESSION_SHIFT).toBe(COMPRESSION_GZIP);
  });

  it("should encode all options together", () => {
    const flags = encodeFlags(true, true, COMPRESSION_GZIP);
    expect(flags & FLAG_MINIFIED).toBe(FLAG_MINIFIED);
    expect(flags & FLAG_CHECKSUM).toBe(FLAG_CHECKSUM);
    expect((flags & FLAG_COMPRESSION_MASK) >> FLAG_COMPRESSION_SHIFT).toBe(COMPRESSION_GZIP);
  });

  it("should mask compression to 2 bits", () => {
    const flags = encodeFlags(false, false, 0xff);
    expect((flags & FLAG_COMPRESSION_MASK) >> FLAG_COMPRESSION_SHIFT).toBe(3);
  });
});

describe("decodeFlags", () => {
  it("should decode 0 as all false, deflate", () => {
    expect(decodeFlags(0)).toEqual({
      minified: false,
      checksum: false,
      compression: COMPRESSION_DEFLATE,
    });
  });

  it("should decode minified + checksum + gzip", () => {
    const flags = encodeFlags(true, true, COMPRESSION_GZIP);
    expect(decodeFlags(flags)).toEqual({
      minified: true,
      checksum: true,
      compression: COMPRESSION_GZIP,
    });
  });

  it("should roundtrip all combinations", () => {
    for (const minified of [true, false]) {
      for (const checksum of [true, false]) {
        for (const compression of [COMPRESSION_DEFLATE, COMPRESSION_GZIP, COMPRESSION_BROTLI, COMPRESSION_ZSTD]) {
          const flags = encodeFlags(minified, checksum, compression);
          const decoded = decodeFlags(flags);
          expect(decoded.minified).toBe(minified);
          expect(decoded.checksum).toBe(checksum);
          expect(decoded.compression).toBe(compression);
        }
      }
    }
  });
});

describe("isCustomField", () => {
  it("should return false for known field types (0x01-0x0F)", () => {
    for (let i = 0x00; i <= 0x0f; i++) {
      expect(isCustomField(i)).toBe(false);
    }
  });

  it("should return true for custom field types (0x10-0xFF)", () => {
    expect(isCustomField(0x10)).toBe(true);
    expect(isCustomField(0x80)).toBe(true);
    expect(isCustomField(0xff)).toBe(true);
  });
});
