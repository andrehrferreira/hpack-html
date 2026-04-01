# Proposal: HTML Minifier

## Why
HTML minification before compression improves compression ratios by 3-6 percentage points (benchmark confirmed). Removing whitespace, comments, and normalizing attributes reduces entropy, allowing DEFLATE to find longer repetitive matches. We need a custom lightweight minifier (~3KB) because html-minifier-terser is 100KB+ and too heavy for browser bundles. The minifier must be safe for arbitrary crawled HTML, including malformed pages.

## What Changes
- New `packages/compressor/src/minifier.ts` module
- Implements 6 safe, high-value transformations: whitespace collapsing, comment removal, boolean attribute collapsing, attribute sorting, optional closing tag removal, optional quote removal
- Preserves content inside `<script>`, `<style>`, `<pre>`, `<code>`, `<textarea>` verbatim
- Preserves conditional comments (`<!--[if ...]>`)
- Handles malformed/partial HTML without crashing

## Impact
- Affected specs: Compression strategy (docs/03-compression-strategy.md)
- Affected code: `packages/compressor/src/minifier.ts`
- Breaking change: NO (greenfield)
- User benefit: 3-6% additional compression on top of DEFLATE, reducing bandwidth for millions of crawled pages
