"""Validate all test vectors against the Python decompressor.
Usage: python packages/test-vectors/validate-py.py
"""

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "hpack-html-py"))

from hpack_html import unpack

FIXTURES = Path(__file__).parent / "fixtures"


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main():
    hpack_files = sorted(FIXTURES.glob("*.hpack"))
    passed = 0
    failed = 0

    print("Validating test vectors (Python decompressor)\n")

    for hpack_path in hpack_files:
        name = hpack_path.stem
        json_path = hpack_path.with_suffix(".json")
        print(f"  {name:<20}", end="")

        if not json_path.exists():
            print("SKIP (no .json)")
            continue

        expected = json.loads(json_path.read_text(encoding="utf-8"))
        data = hpack_path.read_bytes()
        result = unpack(data)

        errors = []
        if result.url != expected["url"]:
            errors.append(f"url: {result.url} != {expected['url']}")
        if (result.etag or None) != expected.get("etag"):
            errors.append("etag mismatch")
        if (result.signature or None) != expected.get("signature"):
            errors.append("signature mismatch")
        if (result.content_type or None) != expected.get("contentType"):
            errors.append("contentType mismatch")
        if (result.timestamp or None) != expected.get("timestamp"):
            errors.append("timestamp mismatch")
        if (result.encoding or None) != expected.get("encoding"):
            errors.append("encoding mismatch")
        if result.minified != expected["minified"]:
            errors.append("minified mismatch")

        expected_cs = expected.get("checksumValid")
        if (result.checksum_valid if result.checksum_valid is not None else None) != expected_cs:
            errors.append("checksumValid mismatch")

        html_hash = sha256_hex(result.html)
        if html_hash != expected["htmlSha256"]:
            errors.append(f"SHA256: {html_hash[:16]}... != {expected['htmlSha256'][:16]}...")

        if expected.get("custom"):
            for key, val in expected["custom"].items():
                if result.custom is None or result.custom.get(key) != val:
                    errors.append(f"custom.{key} mismatch")

        if not errors:
            print("OK")
            passed += 1
        else:
            print(f"FAIL  {', '.join(errors)}")
            failed += 1

    print(f"\nResult: {passed} passed, {failed} failed")
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
