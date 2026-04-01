import { describe, it, expect } from "vitest";
import { encodeVarInt, decodeVarInt, VARINT_MAX } from "../src/varint.js";

describe("encodeVarInt", () => {
  it("should encode 0 as a single byte 0x00", () => {
    expect(encodeVarInt(0)).toEqual(new Uint8Array([0x00]));
  });

  it("should encode 1 as a single byte 0x01", () => {
    expect(encodeVarInt(1)).toEqual(new Uint8Array([0x01]));
  });

  it("should encode 127 as a single byte 0x7F", () => {
    expect(encodeVarInt(127)).toEqual(new Uint8Array([0x7f]));
  });

  it("should encode 128 as two bytes 0x80 0x01", () => {
    expect(encodeVarInt(128)).toEqual(new Uint8Array([0x80, 0x01]));
  });

  it("should encode 300 as two bytes 0xAC 0x02", () => {
    expect(encodeVarInt(300)).toEqual(new Uint8Array([0xac, 0x02]));
  });

  it("should encode 16384 as three bytes 0x80 0x80 0x01", () => {
    expect(encodeVarInt(16384)).toEqual(new Uint8Array([0x80, 0x80, 0x01]));
  });

  it("should encode large value 2097152 (2^21) correctly", () => {
    const encoded = encodeVarInt(2097152);
    expect(encoded).toEqual(new Uint8Array([0x80, 0x80, 0x80, 0x01]));
  });

  it("should encode VARINT_MAX (2^49 - 1) in 7 bytes", () => {
    const encoded = encodeVarInt(VARINT_MAX);
    expect(encoded.length).toBe(7);
    // All bytes should have continuation bit set except the last
    for (let i = 0; i < 6; i++) {
      expect(encoded[i] & 0x80).toBe(0x80);
    }
    expect(encoded[6] & 0x80).toBe(0);
  });

  it("should throw RangeError for negative values", () => {
    expect(() => encodeVarInt(-1)).toThrow(RangeError);
  });

  it("should throw RangeError for non-integer values", () => {
    expect(() => encodeVarInt(1.5)).toThrow(RangeError);
  });

  it("should throw RangeError for NaN", () => {
    expect(() => encodeVarInt(NaN)).toThrow(RangeError);
  });

  it("should throw RangeError for values exceeding VARINT_MAX", () => {
    expect(() => encodeVarInt(VARINT_MAX + 1)).toThrow(RangeError);
  });
});

describe("decodeVarInt", () => {
  it("should decode single byte 0x00 as 0", () => {
    const result = decodeVarInt(new Uint8Array([0x00]), 0);
    expect(result).toEqual({ value: 0, bytesRead: 1 });
  });

  it("should decode single byte 0x7F as 127", () => {
    const result = decodeVarInt(new Uint8Array([0x7f]), 0);
    expect(result).toEqual({ value: 127, bytesRead: 1 });
  });

  it("should decode two bytes 0x80 0x01 as 128", () => {
    const result = decodeVarInt(new Uint8Array([0x80, 0x01]), 0);
    expect(result).toEqual({ value: 128, bytesRead: 2 });
  });

  it("should decode two bytes 0xAC 0x02 as 300", () => {
    const result = decodeVarInt(new Uint8Array([0xac, 0x02]), 0);
    expect(result).toEqual({ value: 300, bytesRead: 2 });
  });

  it("should decode three bytes for 16384", () => {
    const result = decodeVarInt(new Uint8Array([0x80, 0x80, 0x01]), 0);
    expect(result).toEqual({ value: 16384, bytesRead: 3 });
  });

  it("should decode from a non-zero offset", () => {
    // Prefix bytes + VarInt(300) at offset 3
    const data = new Uint8Array([0xff, 0xff, 0xff, 0xac, 0x02, 0xff]);
    const result = decodeVarInt(data, 3);
    expect(result).toEqual({ value: 300, bytesRead: 2 });
  });

  it("should throw RangeError for negative offset", () => {
    expect(() => decodeVarInt(new Uint8Array([0x00]), -1)).toThrow(RangeError);
  });

  it("should throw RangeError for offset beyond data", () => {
    expect(() => decodeVarInt(new Uint8Array([0x00]), 1)).toThrow(RangeError);
  });

  it("should throw RangeError for offset on empty array", () => {
    expect(() => decodeVarInt(new Uint8Array([]), 0)).toThrow(RangeError);
  });

  it("should throw RangeError for truncated VarInt (continuation bit set but no next byte)", () => {
    expect(() => decodeVarInt(new Uint8Array([0x80]), 0)).toThrow(RangeError);
  });

  it("should throw RangeError for VarInt exceeding 7 bytes", () => {
    // 8 bytes all with continuation bit
    const data = new Uint8Array([0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01]);
    expect(() => decodeVarInt(data, 0)).toThrow(RangeError);
  });
});

describe("VarInt roundtrip", () => {
  const testValues = [0, 1, 63, 64, 127, 128, 255, 256, 300, 16383, 16384, 65535, 1048576, 2097152, 268435456, VARINT_MAX];

  for (const value of testValues) {
    it(`should roundtrip value ${value}`, () => {
      const encoded = encodeVarInt(value);
      const decoded = decodeVarInt(encoded, 0);
      expect(decoded.value).toBe(value);
      expect(decoded.bytesRead).toBe(encoded.length);
    });
  }
});
