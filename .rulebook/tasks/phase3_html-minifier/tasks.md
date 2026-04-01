## 1. Core Minifier Implementation
- [ ] 1.1 Implement raw content zone detection (`<script>`, `<style>`, `<pre>`, `<code>`, `<textarea>`) to skip minification inside them
- [ ] 1.2 Implement whitespace collapsing (consecutive whitespace -> single space, trim between tags)
- [ ] 1.3 Implement comment removal (strip `<!-- -->` but preserve conditional comments `<!--[if`)
- [ ] 1.4 Implement boolean attribute collapsing (`checked="checked"` -> `checked`)
- [ ] 1.5 Implement attribute sorting (alphabetical order within each tag)
- [ ] 1.6 Implement optional closing tag removal (`</li>`, `</td>`, `</tr>`, `</p>`, `</option>`, `</thead>`, `</tbody>`, `</tfoot>`)
- [ ] 1.7 Implement optional attribute quote removal (safe only: no spaces, quotes, `=`, `>`, backtick in value)

## 2. Safety & Edge Cases
- [ ] 2.1 Handle malformed HTML (unclosed tags, nested errors) without crashing
- [ ] 2.2 Handle partial HTML documents (no `<html>` or `<body>` tags)
- [ ] 2.3 Preserve SVG and MathML foreign content untouched
- [ ] 2.4 Preserve inline event handlers (onclick, etc.) verbatim
- [ ] 2.5 Preserve `<![CDATA[` sections verbatim
- [ ] 2.6 Handle non-ASCII content correctly (CJK, Arabic, Cyrillic, emoji)

## 3. Testing
- [ ] 3.1 Unit tests: whitespace collapsing (inline, block-level, mixed)
- [ ] 3.2 Unit tests: comment removal (regular, conditional IE, nested)
- [ ] 3.3 Unit tests: boolean attributes (all HTML5 boolean attrs)
- [ ] 3.4 Unit tests: attribute sorting (verify alphabetical, verify no content change)
- [ ] 3.5 Unit tests: optional closing tags (all supported tags)
- [ ] 3.6 Unit tests: optional quote removal (safe cases, unsafe cases preserved)
- [ ] 3.7 Unit tests: raw content preservation (script, style, pre, code, textarea)
- [ ] 3.8 Unit tests: malformed HTML (unclosed tags, extra closing tags, nested errors)
- [ ] 3.9 Unit tests: non-ASCII content roundtrip (CJK, emoji, RTL text)
- [ ] 3.10 Unit tests: SVG/MathML passthrough
- [ ] 3.11 Integration test: minify real Americanas.com HTML from benchmark/sample.html
- [ ] 3.12 Benchmark: measure minification speed (<5ms for 100KB) and size reduction (10-20%)
- [ ] 3.13 Verify 95%+ code coverage

## 4. Finalization
- [ ] 4.1 Export `minify(html: string): string` from compressor package
- [ ] 4.2 Verify bundle contribution is <3KB
- [ ] 4.3 Run type-check, lint, all tests passing
