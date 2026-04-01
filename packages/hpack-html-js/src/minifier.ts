/**
 * Lightweight HTML minifier for preprocessing before compression.
 *
 * Designed to be safe for arbitrary crawled HTML, including malformed pages.
 * Only applies high-value, content-preserving transformations.
 * Bundle target: <3KB.
 */

// Tags whose content must never be modified
const RAW_TAGS = /^(script|style|pre|code|textarea|xmp)$/i;

// HTML5 boolean attributes
const BOOLEAN_ATTRS = new Set([
  "allowfullscreen", "async", "autofocus", "autoplay", "checked",
  "controls", "default", "defer", "disabled", "formnovalidate",
  "hidden", "inert", "ismap", "itemscope", "loop", "multiple",
  "muted", "nomodule", "novalidate", "open", "playsinline",
  "readonly", "required", "reversed", "selected",
]);

// Optional closing tags (safe to remove per HTML spec)
const OPTIONAL_CLOSE = new Set([
  "li", "dt", "dd", "p", "optgroup", "option",
  "thead", "tbody", "tfoot", "tr", "td", "th",
  "rt", "rp", "colgroup", "caption",
]);

/**
 * Check if an attribute value is safe to unquote.
 * Safe = no whitespace, no quotes, no `=`, no `>`, no backtick, non-empty.
 */
function canUnquote(value: string): boolean {
  if (value.length === 0) return false;
  return !/[\s"'`=<>]/.test(value);
}

/**
 * Sort attributes alphabetically within a tag.
 * Returns the tag string with sorted attributes.
 */
function sortAttributes(tag: string): string {
  // Match opening tag: <tagName ...attrs... > or <tagName ...attrs... />
  const match = tag.match(/^(<\s*[a-zA-Z][a-zA-Z0-9-]*)([\s\S]*?)(\/?>)$/);
  if (!match) return tag;

  const [, prefix, attrStr, suffix] = match;
  if (!attrStr.trim()) return tag;

  // Parse attributes: name="value", name='value', name=value, name (boolean)
  const attrs: Array<{ name: string; raw: string }> = [];
  const attrRegex = /\s+([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = attrRegex.exec(attrStr)) !== null) {
    attrs.push({ name: m[1].toLowerCase(), raw: m[0] });
  }

  if (attrs.length <= 1) return tag;

  attrs.sort((a, b) => a.name.localeCompare(b.name));
  return prefix + attrs.map((a) => a.raw).join("") + suffix;
}

/**
 * Minify HTML for improved compression.
 *
 * Transformations (all content-preserving):
 * 1. Collapse consecutive whitespace to single space (outside raw tags)
 * 2. Remove HTML comments (preserve conditional comments)
 * 3. Collapse boolean attributes (checked="checked" -> checked)
 * 4. Sort attributes alphabetically
 * 5. Remove optional closing tags
 * 6. Remove optional attribute quotes (where safe)
 */
export function minify(html: string): string {
  let result = "";
  let i = 0;
  const len = html.length;

  while (i < len) {
    // --- Check for comments ---
    if (html.startsWith("<!--", i)) {
      // Preserve conditional comments: <!--[if ...]> ... <![endif]-->
      if (html.startsWith("<!--[if", i) || html.startsWith("<!--<![", i)) {
        const endIdx = html.indexOf("-->", i + 4);
        if (endIdx !== -1) {
          result += html.slice(i, endIdx + 3);
          i = endIdx + 3;
          continue;
        }
      }
      // Remove regular comments
      const endIdx = html.indexOf("-->", i + 4);
      if (endIdx !== -1) {
        i = endIdx + 3;
        continue;
      }
      // Malformed comment (no closing -->): keep as-is
      result += html[i++];
      continue;
    }

    // --- Check for CDATA ---
    if (html.startsWith("<![CDATA[", i)) {
      const endIdx = html.indexOf("]]>", i + 9);
      if (endIdx !== -1) {
        result += html.slice(i, endIdx + 3);
        i = endIdx + 3;
        continue;
      }
    }

    // --- Check for tags ---
    if (html[i] === "<") {
      // Find end of tag
      const tagEnd = html.indexOf(">", i);
      if (tagEnd === -1) {
        // Malformed: no closing >, output rest as-is
        result += html.slice(i);
        break;
      }

      const fullTag = html.slice(i, tagEnd + 1);

      // Check for optional closing tag: </li>, </p>, etc.
      const closeMatch = fullTag.match(/^<\/\s*([a-zA-Z][a-zA-Z0-9]*)\s*>$/);
      if (closeMatch && OPTIONAL_CLOSE.has(closeMatch[1].toLowerCase())) {
        i = tagEnd + 1;
        continue;
      }

      // Check for opening tag of raw content zone
      const openMatch = fullTag.match(/^<\s*([a-zA-Z][a-zA-Z0-9-]*)/);
      if (openMatch && RAW_TAGS.test(openMatch[1])) {
        const tagName = openMatch[1].toLowerCase();
        // Process the opening tag (sort attrs, etc.)
        const processedTag = processOpeningTag(fullTag);
        result += processedTag;
        i = tagEnd + 1;

        // Find matching closing tag and copy content verbatim
        const closePattern = new RegExp(`</${tagName}\\s*>`, "i");
        const closeIdx = html.slice(i).search(closePattern);
        if (closeIdx !== -1) {
          // Copy raw content + closing tag
          const closeTagMatch = html.slice(i + closeIdx).match(closePattern)!;
          result += html.slice(i, i + closeIdx + closeTagMatch[0].length);
          i = i + closeIdx + closeTagMatch[0].length;
        } else {
          // No closing tag found, output rest as-is
          result += html.slice(i);
          i = len;
        }
        continue;
      }

      // Regular opening/self-closing tag: process it
      if (openMatch) {
        result += processOpeningTag(fullTag);
      } else {
        // Closing tag (non-optional) or other tag-like construct
        result += fullTag;
      }
      i = tagEnd + 1;
      continue;
    }

    // --- Text content: collapse whitespace ---
    let textEnd = html.indexOf("<", i);
    if (textEnd === -1) textEnd = len;
    const text = html.slice(i, textEnd);
    // Collapse runs of whitespace to single space
    result += text.replace(/\s{2,}/g, " ");
    i = textEnd;
  }

  return result;
}

/**
 * Process an opening tag: sort attributes, collapse booleans, unquote safe values.
 */
function processOpeningTag(tag: string): string {
  // Sort attributes first
  let processed = sortAttributes(tag);

  // Collapse boolean attributes: checked="checked" -> checked
  processed = processed.replace(
    /\s([a-zA-Z_:][\w:.-]*)=(["'])(\1|)\2/gi,
    (match, name: string) => {
      if (BOOLEAN_ATTRS.has(name.toLowerCase())) {
        return ` ${name}`;
      }
      return match;
    },
  );

  // Remove optional quotes: attr="simple" -> attr=simple (where safe)
  processed = processed.replace(
    /\s([a-zA-Z_:][\w:.-]*)=(["'])([\s\S]*?)\2/g,
    (match, name: string, _quote: string, value: string) => {
      if (BOOLEAN_ATTRS.has(name.toLowerCase()) && (value === name.toLowerCase() || value === "")) {
        return ` ${name}`;
      }
      if (canUnquote(value)) {
        return ` ${name}=${value}`;
      }
      return match;
    },
  );

  return processed;
}
