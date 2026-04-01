use hpack_html::{read_headers, unpack, unpack_with_options, UnpackOptions};
use sha2::Digest;

fn fixture(name: &str) -> Vec<u8> {
    let path = format!("{}/tests/fixtures/{}", env!("CARGO_MANIFEST_DIR"), name);
    std::fs::read(&path).unwrap_or_else(|e| panic!("Failed to read {}: {}", path, e))
}

fn fixture_json(name: &str) -> serde_json::Value {
    let path = format!("{}/tests/fixtures/{}", env!("CARGO_MANIFEST_DIR"), name);
    let data = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("Failed to read {}: {}", path, e));
    serde_json::from_str(&data).unwrap()
}

fn sha256_hex(data: &str) -> String {
    let mut hasher = sha2::Sha256::new();
    hasher.update(data.as_bytes());
    hex::encode(hasher.finalize())
}

// ---------------------------------------------------------------------------
// Real page tests
// ---------------------------------------------------------------------------

#[test]
fn americanas_cached() {
    let data = fixture("americanas-cached.hpack");
    let meta = fixture_json("americanas-cached.json");
    let result = unpack(&data).unwrap();

    assert_eq!(result.url, meta["url"].as_str().unwrap());
    assert_eq!(result.etag.as_deref(), meta["etag"].as_str());
    assert_eq!(result.signature.as_deref(), meta["signature"].as_str());
    assert_eq!(result.content_type.as_deref(), meta["contentType"].as_str());
    assert_eq!(result.encoding.as_deref(), meta["encoding"].as_str());
    assert_eq!(result.checksum_valid, Some(true));
    assert_eq!(result.minified, true);
    assert_eq!(sha256_hex(&result.html), meta["htmlSha256"].as_str().unwrap());
}

#[test]
fn americanas_live() {
    let data = fixture("americanas.hpack");
    let meta = fixture_json("americanas.json");
    let result = unpack(&data).unwrap();

    assert_eq!(result.url, meta["url"].as_str().unwrap());
    assert_eq!(result.checksum_valid, Some(true));
    assert_eq!(sha256_hex(&result.html), meta["htmlSha256"].as_str().unwrap());
    assert!(result.html.contains("<") && result.html.contains(">"));
}

#[test]
fn wikipedia() {
    let data = fixture("wikipedia.hpack");
    let meta = fixture_json("wikipedia.json");
    let result = unpack(&data).unwrap();

    assert_eq!(result.url, meta["url"].as_str().unwrap());
    assert_eq!(result.checksum_valid, Some(true));
    assert_eq!(sha256_hex(&result.html), meta["htmlSha256"].as_str().unwrap());
    assert!(result.html.contains("HTML"));
}

#[test]
fn hackernews() {
    let data = fixture("hackernews.hpack");
    let meta = fixture_json("hackernews.json");
    let result = unpack(&data).unwrap();

    assert_eq!(result.url, meta["url"].as_str().unwrap());
    assert_eq!(result.checksum_valid, Some(true));
    assert_eq!(sha256_hex(&result.html), meta["htmlSha256"].as_str().unwrap());
    assert!(result.html.contains("Hacker News"));
}

// ---------------------------------------------------------------------------
// Synthetic edge case tests
// ---------------------------------------------------------------------------

#[test]
fn minimal_roundtrip() {
    let data = fixture("minimal.hpack");
    let result = unpack(&data).unwrap();

    assert_eq!(result.url, "https://example.com/minimal");
    assert_eq!(result.html, "<h1>Hello World</h1>");
    assert_eq!(result.minified, false);
    assert_eq!(result.checksum_valid, Some(true));
}

#[test]
fn empty_html() {
    let data = fixture("empty.hpack");
    let result = unpack(&data).unwrap();

    assert_eq!(result.url, "https://example.com/empty");
    assert_eq!(result.html, "");
    assert_eq!(result.checksum_valid, Some(true));
}

#[test]
fn unicode_content() {
    let data = fixture("unicode.hpack");
    let result = unpack(&data).unwrap();

    assert_eq!(result.url, "https://example.com/日本語");
    assert!(result.html.contains("日本語"));
    assert!(result.html.contains("🌍"));
    assert!(result.html.contains("مرحبا"));
    assert!(result.html.contains("Привет"));
    assert_eq!(result.checksum_valid, Some(true));
}

#[test]
fn no_checksum() {
    let data = fixture("no-checksum.hpack");
    let result = unpack(&data).unwrap();

    assert_eq!(result.url, "https://example.com/no-checksum");
    assert_eq!(result.html, "<p>test</p>");
    assert_eq!(result.checksum_valid, None);
}

// ---------------------------------------------------------------------------
// Headers only
// ---------------------------------------------------------------------------

#[test]
fn headers_only_real_page() {
    let data = fixture("wikipedia.hpack");
    let meta = fixture_json("wikipedia.json");
    let result = read_headers(&data).unwrap();

    assert_eq!(result.url, meta["url"].as_str().unwrap());
    assert_eq!(result.etag.as_deref(), meta["etag"].as_str());
    assert_eq!(result.html, ""); // body not decompressed
    assert_eq!(result.checksum_valid, None);
}

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

#[test]
fn invalid_magic() {
    let mut data = fixture("minimal.hpack");
    data[0] = 0x00;
    assert!(matches!(
        unpack(&data),
        Err(hpack_html::Error::InvalidMagic)
    ));
}

#[test]
fn bad_version() {
    let mut data = fixture("minimal.hpack");
    data[4] = 0x99;
    assert!(matches!(
        unpack(&data),
        Err(hpack_html::Error::UnsupportedVersion(0x99))
    ));
}

#[test]
fn truncated_packet() {
    assert!(matches!(
        unpack(&[0x89, 0x48, 0x50]),
        Err(hpack_html::Error::TruncatedPacket(_))
    ));
}

#[test]
fn corrupted_crc32() {
    let mut data = fixture("minimal.hpack");
    let len = data.len();
    data[len - 1] ^= 0xFF;
    data[len - 2] ^= 0xFF;
    assert!(matches!(
        unpack(&data),
        Err(hpack_html::Error::ChecksumMismatch { .. })
    ));
}

#[test]
fn skip_checksum_verification() {
    let mut data = fixture("minimal.hpack");
    let len = data.len();
    data[len - 1] ^= 0xFF;
    let opts = UnpackOptions {
        verify_checksum: false,
        headers_only: false,
    };
    let result = unpack_with_options(&data, &opts).unwrap();
    assert_eq!(result.checksum_valid, Some(false));
}

// ---------------------------------------------------------------------------
// Custom fields from real pages
// ---------------------------------------------------------------------------

#[test]
fn custom_fields_from_real_page() {
    let data = fixture("americanas-cached.hpack");
    let result = unpack(&data).unwrap();

    assert_eq!(result.custom.get("source").map(|s| s.as_str()), Some("test-vector"));
    assert_eq!(result.custom.get("page").map(|s| s.as_str()), Some("americanas-cached"));
}
