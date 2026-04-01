package hpack

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestVarIntRoundtrip(t *testing.T) {
	values := []uint64{0, 1, 127, 128, 300, 16384, 65535, 1048576}
	for _, v := range values {
		encoded := EncodeVarInt(v)
		decoded, n, err := DecodeVarInt(encoded, 0)
		if err != nil {
			t.Fatalf("DecodeVarInt(%d) error: %v", v, err)
		}
		if decoded != v {
			t.Errorf("roundtrip %d: got %d", v, decoded)
		}
		if n != len(encoded) {
			t.Errorf("roundtrip %d: bytesRead %d != len %d", v, n, len(encoded))
		}
	}
}

func TestVarIntErrors(t *testing.T) {
	if _, _, err := DecodeVarInt([]byte{}, 0); err == nil {
		t.Error("expected error for empty data")
	}
	if _, _, err := DecodeVarInt([]byte{0x80}, 0); err == nil {
		t.Error("expected error for truncated varint")
	}
}

func TestPackUnpackRoundtrip(t *testing.T) {
	html := "<h1>Hello World</h1>"
	packed, err := Pack(html, PackOptions{URL: "https://example.com", Checksum: true})
	if err != nil {
		t.Fatal(err)
	}

	result, err := Unpack(packed)
	if err != nil {
		t.Fatal(err)
	}

	if result.URL != "https://example.com" {
		t.Errorf("url: %s", result.URL)
	}
	if result.HTML != html {
		t.Errorf("html mismatch")
	}
	if result.ChecksumValid == nil || !*result.ChecksumValid {
		t.Error("checksum should be valid")
	}
}

func TestPackAllMetadata(t *testing.T) {
	packed, err := Pack("<p>test</p>", PackOptions{
		URL: "https://example.com/page", ETag: `"abc"`, Signature: "sig",
		ContentType: "text/html", Timestamp: 1711929600000, Encoding: "utf-8",
		Custom: map[string]string{"key": "val"}, Checksum: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	r, err := Unpack(packed)
	if err != nil {
		t.Fatal(err)
	}
	if r.URL != "https://example.com/page" { t.Error("url") }
	if r.ETag == nil || *r.ETag != `"abc"` { t.Error("etag") }
	if r.Signature == nil || *r.Signature != "sig" { t.Error("signature") }
	if r.ContentType == nil || *r.ContentType != "text/html" { t.Error("contentType") }
	if r.Timestamp == nil || *r.Timestamp != 1711929600000 { t.Error("timestamp") }
	if r.Encoding == nil || *r.Encoding != "utf-8" { t.Error("encoding") }
	if r.Custom["key"] != "val" { t.Error("custom") }
}

func TestUnicode(t *testing.T) {
	html := "<p>日本語 🌍 مرحبا</p>"
	packed, _ := Pack(html, PackOptions{URL: "https://example.com/日本語", Checksum: true})
	r, _ := Unpack(packed)
	if r.HTML != html { t.Error("html") }
	if r.URL != "https://example.com/日本語" { t.Error("url") }
}

func TestEmptyHTML(t *testing.T) {
	packed, _ := Pack("", PackOptions{URL: "https://example.com", Checksum: true})
	r, _ := Unpack(packed)
	if r.HTML != "" { t.Error("expected empty html") }
}

func TestNoChecksum(t *testing.T) {
	packed, _ := Pack("<p>test</p>", PackOptions{URL: "https://example.com", Checksum: false})
	r, _ := Unpack(packed)
	if r.ChecksumValid != nil { t.Error("expected nil checksum") }
}

func TestHeadersOnly(t *testing.T) {
	packed, _ := Pack("<p>big</p>", PackOptions{URL: "https://example.com"})
	r, _ := UnpackHeaders(packed)
	if r.URL != "https://example.com" { t.Error("url") }
	if r.HTML != "" { t.Error("expected empty html") }
}

func TestInvalidMagic(t *testing.T) {
	packed, _ := Pack("<p>test</p>", PackOptions{URL: "https://example.com"})
	packed[0] = 0x00
	_, err := Unpack(packed)
	if !errors.Is(err, ErrInvalidMagic) {
		t.Errorf("expected ErrInvalidMagic, got %v", err)
	}
}

func TestBadVersion(t *testing.T) {
	packed, _ := Pack("<p>test</p>", PackOptions{URL: "https://example.com"})
	packed[4] = 0x99
	_, err := Unpack(packed)
	var verErr *UnsupportedVersionError
	if !errors.As(err, &verErr) {
		t.Errorf("expected UnsupportedVersionError, got %v", err)
	}
}

func TestTruncated(t *testing.T) {
	_, err := Unpack([]byte{0x89, 0x48, 0x50})
	var trErr *TruncatedPacketError
	if !errors.As(err, &trErr) {
		t.Errorf("expected TruncatedPacketError, got %v", err)
	}
}

func TestCorruptedCRC32(t *testing.T) {
	packed, _ := Pack("<p>test</p>", PackOptions{URL: "https://example.com", Checksum: true})
	packed[len(packed)-1] ^= 0xFF
	packed[len(packed)-2] ^= 0xFF
	_, err := Unpack(packed)
	var csErr *ChecksumMismatchError
	if !errors.As(err, &csErr) {
		t.Errorf("expected ChecksumMismatchError, got %v", err)
	}
}

func TestMissingURL(t *testing.T) {
	_, err := Pack("<p>test</p>", PackOptions{})
	if err == nil {
		t.Error("expected error for missing URL")
	}
}

// ---------------------------------------------------------------------------
// Cross-SDK: validate all canonical test vectors
// ---------------------------------------------------------------------------

type vectorMeta struct {
	URL                  string            `json:"url"`
	ETag                 *string           `json:"etag"`
	Signature            *string           `json:"signature"`
	ContentType          *string           `json:"contentType"`
	Timestamp            *int64            `json:"timestamp"`
	Encoding             *string           `json:"encoding"`
	Custom               map[string]string `json:"custom"`
	Minified             bool              `json:"minified"`
	ChecksumValid        *bool             `json:"checksumValid"`
	HTMLSha256           string            `json:"htmlSha256"`
	CompressionAlgorithm string            `json:"compressionAlgorithm"`
}

func TestCrossSDKVectors(t *testing.T) {
	fixturesDir := filepath.Join("..", "test-vectors", "fixtures")
	entries, err := os.ReadDir(fixturesDir)
	if err != nil {
		t.Skipf("Cannot read fixtures dir: %v", err)
	}

	tested := 0
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".hpack") {
			continue
		}
		name := strings.TrimSuffix(entry.Name(), ".hpack")
		jsonPath := filepath.Join(fixturesDir, name+".json")

		if _, err := os.Stat(jsonPath); os.IsNotExist(err) {
			continue
		}

		t.Run(name, func(t *testing.T) {
			data, err := os.ReadFile(filepath.Join(fixturesDir, entry.Name()))
			if err != nil {
				t.Fatal(err)
			}

			metaBytes, err := os.ReadFile(jsonPath)
			if err != nil {
				t.Fatal(err)
			}
			var meta vectorMeta
			if err := json.Unmarshal(metaBytes, &meta); err != nil {
				t.Fatal(err)
			}

			result, err := Unpack(data)
			if err != nil {
				t.Fatalf("Unpack failed: %v", err)
			}

			if result.URL != meta.URL {
				t.Errorf("url: %s != %s", result.URL, meta.URL)
			}

			assertOptString(t, "etag", result.ETag, meta.ETag)
			assertOptString(t, "signature", result.Signature, meta.Signature)
			assertOptString(t, "contentType", result.ContentType, meta.ContentType)
			assertOptString(t, "encoding", result.Encoding, meta.Encoding)

			if meta.Timestamp != nil {
				if result.Timestamp == nil || *result.Timestamp != *meta.Timestamp {
					t.Errorf("timestamp mismatch")
				}
			}

			if result.Minified != meta.Minified {
				t.Errorf("minified: %v != %v", result.Minified, meta.Minified)
			}

			// Checksum
			if meta.ChecksumValid == nil {
				if result.ChecksumValid != nil {
					t.Errorf("checksumValid: expected nil, got %v", *result.ChecksumValid)
				}
			} else {
				if result.ChecksumValid == nil || *result.ChecksumValid != *meta.ChecksumValid {
					t.Errorf("checksumValid mismatch")
				}
			}

			// SHA256 of HTML (the critical byte-exact check)
			h := sha256.Sum256([]byte(result.HTML))
			htmlHash := hex.EncodeToString(h[:])
			if htmlHash != meta.HTMLSha256 {
				t.Errorf("HTML SHA256: %s != %s", htmlHash[:16], meta.HTMLSha256[:16])
			}

			// Custom fields
			for key, val := range meta.Custom {
				if result.Custom[key] != val {
					t.Errorf("custom.%s: %s != %s", key, result.Custom[key], val)
				}
			}
		})

		tested++
	}

	if tested == 0 {
		t.Skip("No test vectors found")
	}
	t.Logf("Cross-SDK validation: %d vectors passed", tested)
}

func assertOptString(t *testing.T, name string, got *string, expected *string) {
	t.Helper()
	if expected == nil {
		if got != nil {
			t.Errorf("%s: expected nil, got %q", name, *got)
		}
	} else {
		if got == nil || *got != *expected {
			gotStr := "<nil>"
			if got != nil {
				gotStr = *got
			}
			t.Errorf("%s: %s != %s", name, gotStr, *expected)
		}
	}
}

func BenchmarkUnpack(b *testing.B) {
	// Use the largest vector available
	data, err := os.ReadFile(filepath.Join("..", "test-vectors", "fixtures", "real-wikipedia.hpack"))
	if err != nil {
		b.Skip("No real-wikipedia.hpack fixture")
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := Unpack(data)
		if err != nil {
			b.Fatal(err)
		}
	}
}
