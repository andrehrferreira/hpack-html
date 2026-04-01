use hpack_html::{read_headers, unpack, unpack_with_options, UnpackOptions};
use sha2::Digest;
use std::fs;
use std::path::Path;

fn fixtures_dir() -> String {
    format!("{}/tests/fixtures", env!("CARGO_MANIFEST_DIR"))
}

fn fixture(name: &str) -> Vec<u8> {
    let path = format!("{}/{}", fixtures_dir(), name);
    fs::read(&path).unwrap_or_else(|e| panic!("Failed to read {}: {}", path, e))
}

fn fixture_json(name: &str) -> serde_json::Value {
    let path = format!("{}/{}", fixtures_dir(), name);
    let data = fs::read_to_string(&path).unwrap_or_else(|e| panic!("Failed to read {}: {}", path, e));
    serde_json::from_str(&data).unwrap()
}

fn sha256_hex(data: &str) -> String {
    let mut hasher = sha2::Sha256::new();
    hasher.update(data.as_bytes());
    hex::encode(hasher.finalize())
}

// ---------------------------------------------------------------------------
// Dynamic test: validate ALL vectors that have a .json file
// ---------------------------------------------------------------------------

#[test]
fn validate_all_vectors() {
    let dir = fixtures_dir();
    let entries: Vec<_> = fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("Cannot read fixtures dir {}: {}", dir, e))
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "hpack"))
        .collect();

    assert!(!entries.is_empty(), "No .hpack fixtures found in {}", dir);

    let mut passed = 0;
    let mut tested = 0;

    for entry in &entries {
        let hpack_path = entry.path();
        let name = hpack_path.file_stem().unwrap().to_str().unwrap();
        let json_path = Path::new(&dir).join(format!("{}.json", name));

        if !json_path.exists() {
            continue;
        }

        tested += 1;
        let data = fs::read(&hpack_path).unwrap();
        let meta: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&json_path).unwrap()).unwrap();

        let result = unpack(&data).unwrap_or_else(|e| {
            panic!("Failed to unpack {}: {}", name, e);
        });

        // URL
        assert_eq!(
            result.url,
            meta["url"].as_str().unwrap(),
            "{}: url mismatch",
            name
        );

        // ETag
        let expected_etag = meta["etag"].as_str();
        assert_eq!(result.etag.as_deref(), expected_etag, "{}: etag mismatch", name);

        // Signature
        let expected_sig = meta["signature"].as_str();
        assert_eq!(result.signature.as_deref(), expected_sig, "{}: signature mismatch", name);

        // ContentType
        let expected_ct = meta["contentType"].as_str();
        assert_eq!(result.content_type.as_deref(), expected_ct, "{}: contentType mismatch", name);

        // Timestamp
        let expected_ts = meta["timestamp"].as_u64();
        assert_eq!(result.timestamp, expected_ts, "{}: timestamp mismatch", name);

        // Encoding
        let expected_enc = meta["encoding"].as_str();
        assert_eq!(result.encoding.as_deref(), expected_enc, "{}: encoding mismatch", name);

        // Minified
        assert_eq!(
            result.minified,
            meta["minified"].as_bool().unwrap(),
            "{}: minified mismatch",
            name
        );

        // Checksum
        let expected_checksum = if meta["checksumValid"].is_null() {
            None
        } else {
            Some(meta["checksumValid"].as_bool().unwrap())
        };
        assert_eq!(result.checksum_valid, expected_checksum, "{}: checksumValid mismatch", name);

        // HTML SHA256 (the critical byte-exact check)
        let html_hash = sha256_hex(&result.html);
        assert_eq!(
            html_hash,
            meta["htmlSha256"].as_str().unwrap(),
            "{}: HTML SHA256 mismatch (decompressed content differs)",
            name
        );

        // Custom fields
        if let Some(expected_custom) = meta["custom"].as_object() {
            for (key, val) in expected_custom {
                assert_eq!(
                    result.custom.get(key).map(|s| s.as_str()),
                    val.as_str(),
                    "{}: custom.{} mismatch",
                    name,
                    key
                );
            }
        }

        passed += 1;
    }

    assert!(tested > 0, "No vectors with .json metadata found");
    eprintln!("Cross-SDK validation: {}/{} vectors passed", passed, tested);
}

// ---------------------------------------------------------------------------
// Headers-only test
// ---------------------------------------------------------------------------

#[test]
fn headers_only() {
    let dir = fixtures_dir();
    let json_path = Path::new(&dir).join("all-fields.json");
    if !json_path.exists() {
        return;
    }

    let data = fixture("all-fields.hpack");
    let meta = fixture_json("all-fields.json");
    let result = read_headers(&data).unwrap();

    assert_eq!(result.url, meta["url"].as_str().unwrap());
    assert_eq!(result.etag.as_deref(), meta["etag"].as_str());
    assert_eq!(result.signature.as_deref(), meta["signature"].as_str());
    assert_eq!(result.html, "");
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
