## 1. Core Minifier Implementation
- [x] 1.1 Implement raw content zone detection (`<script>`, `<style>`, `<pre>`, `<code>`, `<textarea>`) to skip minification inside them
- [x] 1.2 Implement whitespace collapsing (consecutive whitespace -> single space)
- [x] 1.3 Implement comment removal (strip `<!-- -->` but preserve conditional comments `<!--[if`)
- [x] 1.4 Implement boolean attribute collapsing (`checked="checked"` -> `checked`)
- [x] 1.5 Implement attribute sorting (alphabetical order within each tag)
- [x] 1.6 Implement optional closing tag removal (`</li>`, `</td>`, `</tr>`, `</p>`, `</option>`, `</thead>`, `</tbody>`, `</tfoot>`)
- [x] 1.7 Implement optional attribute quote removal (safe only: no spaces, quotes, `=`, `>`, backtick in value)

## 2. Safety & Edge Cases
- [x] 2.1 Handle malformed HTML (unclosed tags, no closing >) without crashing
- [x] 2.2 Handle partial HTML documents (no `<html>` or `<body>` tags)
- [x] 2.3 Preserve SVG content (tags pass through, attributes processed)
- [x] 2.4 Preserve `<![CDATA[` sections verbatim
- [x] 2.5 Handle non-ASCII content correctly (CJK, Arabic, emoji)

## 3. Testing
- [x] 3.1 Unit tests: whitespace collapsing (inline, newlines/tabs, between tags, single spaces) <!-- 4 tests -->
- [x] 3.2 Unit tests: comment removal (regular, multiple, conditional IE, downlevel, malformed) <!-- 5 tests -->
- [x] 3.3 Unit tests: boolean attributes (checked, disabled, selected, non-boolean preserved) <!-- 4 tests -->
- [x] 3.4 Unit tests: attribute sorting (multiple attrs, single, none) <!-- 3 tests -->
- [x] 3.5 Unit tests: optional closing tags (li, p, td, tr, option, thead/tbody/tfoot, NOT div/span) <!-- 7 tests -->
- [x] 3.6 Unit tests: optional quote removal (safe, spaces, special chars, empty) <!-- 4 tests -->
- [x] 3.7 Unit tests: raw content preservation (script, style, pre, code, textarea, malformed) <!-- 6 tests -->
- [x] 3.8 Unit tests: CDATA preservation <!-- 1 test -->
- [x] 3.9 Unit tests: edge cases (empty, whitespace-only, CJK, emoji, Arabic, self-closing, malformed, nested, SVG) <!-- 9 tests -->
- [x] 3.10 All 43 tests passing

## 4. Finalization
- [x] 4.1 Export `minify(html: string): string` from compressor package
- [x] 4.2 Run all 141 tests passing across core + compressor
