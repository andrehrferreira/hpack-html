import { describe, it, expect } from "vitest";
import { crc32 } from "../src/crc32.js";

describe("crc32", () => {
  it("should return 0x00000000 for empty input", () => {
    expect(crc32(new Uint8Array([]))).toBe(0x00000000);
  });

  it('should return 0xCBF43926 for ASCII "123456789" (RFC 3720 check value)', () => {
    const data = new TextEncoder().encode("123456789");
    expect(crc32(data)).toBe(0xcbf43926);
  });

  it("should return correct CRC32 for a single byte 0x00", () => {
    expect(crc32(new Uint8Array([0x00]))).toBe(0xd202ef8d);
  });

  it('should return correct CRC32 for "hello"', () => {
    const data = new TextEncoder().encode("hello");
    expect(crc32(data)).toBe(0x3610a686);
  });

  it('should return correct CRC32 for "Hello, World!"', () => {
    const data = new TextEncoder().encode("Hello, World!");
    expect(crc32(data)).toBe(0xec4ac3d0);
  });

  it("should handle binary data with all byte values", () => {
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) data[i] = i;
    const result = crc32(data);
    // Known CRC32 for bytes 0x00-0xFF in sequence
    expect(result).toBe(0x29058c73);
  });

  it("should return an unsigned 32-bit integer (no negative values)", () => {
    const data = new TextEncoder().encode("test");
    const result = crc32(data);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });

  it("should produce different checksums for different inputs", () => {
    const a = crc32(new TextEncoder().encode("abc"));
    const b = crc32(new TextEncoder().encode("abd"));
    expect(a).not.toBe(b);
  });

  it("should produce same checksum for same input (deterministic)", () => {
    const data = new TextEncoder().encode("deterministic");
    expect(crc32(data)).toBe(crc32(data));
  });
});
