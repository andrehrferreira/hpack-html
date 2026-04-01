/// Lightweight HTML minifier for preprocessing before compression.

final _rawTags = RegExp(r'^(script|style|pre|code|textarea|xmp)$', caseSensitive: false);

const _booleanAttrs = {
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked',
  'controls', 'default', 'defer', 'disabled', 'formnovalidate',
  'hidden', 'inert', 'ismap', 'itemscope', 'loop', 'multiple',
  'muted', 'nomodule', 'novalidate', 'open', 'playsinline',
  'readonly', 'required', 'reversed', 'selected',
};

const _optionalClose = {
  'li', 'dt', 'dd', 'p', 'optgroup', 'option',
  'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'rt', 'rp', 'colgroup', 'caption',
};

bool _canUnquote(String value) {
  if (value.isEmpty) return false;
  return !RegExp(r'[\s"' "'" r'`=<>]').hasMatch(value);
}

String _sortAttributes(String tag) {
  final match = RegExp(r'^(<\s*[a-zA-Z][a-zA-Z0-9-]*)([\s\S]*?)(\/?>)$').firstMatch(tag);
  if (match == null) return tag;

  final prefix = match.group(1)!;
  final attrStr = match.group(2)!;
  final suffix = match.group(3)!;
  if (attrStr.trim().isEmpty) return tag;

  final attrRegex = RegExp(r'''\s+([a-zA-Z_:][\\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?''');
  final attrs = <({String name, String raw})>[];
  for (final m in attrRegex.allMatches(attrStr)) {
    attrs.add((name: m.group(1)!.toLowerCase(), raw: m.group(0)!));
  }

  if (attrs.length <= 1) return tag;

  attrs.sort((a, b) => a.name.compareTo(b.name));
  return prefix + attrs.map((a) => a.raw).join('') + suffix;
}

String _processOpeningTag(String tag) {
  var processed = _sortAttributes(tag);

  // Collapse boolean attributes
  processed = processed.replaceAllMapped(
    RegExp(r'''\s([a-zA-Z_:][\\w:.-]*)=(["'])\1\2''', caseSensitive: false),
    (m) {
      final name = m.group(1)!;
      if (_booleanAttrs.contains(name.toLowerCase())) return ' $name';
      return m.group(0)!;
    },
  );

  // Remove optional quotes
  processed = processed.replaceAllMapped(
    RegExp(r'''\s([a-zA-Z_:][\\w:.-]*)=(["'])([\s\S]*?)\2'''),
    (m) {
      final name = m.group(1)!;
      final value = m.group(3)!;
      if (_booleanAttrs.contains(name.toLowerCase()) &&
          (value == name.toLowerCase() || value.isEmpty)) {
        return ' $name';
      }
      if (_canUnquote(value)) return ' $name=$value';
      return m.group(0)!;
    },
  );

  return processed;
}

/// Minify HTML for improved compression.
String minify(String html) {
  final result = StringBuffer();
  var i = 0;
  final len = html.length;

  while (i < len) {
    // Comments
    if (html.startsWith('<!--', i)) {
      if (html.startsWith('<!--[if', i) || html.startsWith('<!--<![', i)) {
        final endIdx = html.indexOf('-->', i + 4);
        if (endIdx != -1) {
          result.write(html.substring(i, endIdx + 3));
          i = endIdx + 3;
          continue;
        }
      }
      final endIdx = html.indexOf('-->', i + 4);
      if (endIdx != -1) {
        i = endIdx + 3;
        continue;
      }
      result.write(html[i++]);
      continue;
    }

    // CDATA
    if (html.startsWith('<![CDATA[', i)) {
      final endIdx = html.indexOf(']]>', i + 9);
      if (endIdx != -1) {
        result.write(html.substring(i, endIdx + 3));
        i = endIdx + 3;
        continue;
      }
    }

    // Tags
    if (html[i] == '<') {
      final tagEnd = html.indexOf('>', i);
      if (tagEnd == -1) {
        result.write(html.substring(i));
        break;
      }

      final fullTag = html.substring(i, tagEnd + 1);

      // Optional closing tag
      final closeMatch = RegExp(r'^<\/\s*([a-zA-Z][a-zA-Z0-9]*)\s*>$').firstMatch(fullTag);
      if (closeMatch != null && _optionalClose.contains(closeMatch.group(1)!.toLowerCase())) {
        i = tagEnd + 1;
        continue;
      }

      // Raw content zone
      final openMatch = RegExp(r'^<\s*([a-zA-Z][a-zA-Z0-9-]*)').firstMatch(fullTag);
      if (openMatch != null && _rawTags.hasMatch(openMatch.group(1)!)) {
        final tagName = openMatch.group(1)!.toLowerCase();
        result.write(_processOpeningTag(fullTag));
        i = tagEnd + 1;

        final closePattern = RegExp('</$tagName\\s*>', caseSensitive: false);
        final closeIdx = html.substring(i).indexOf(closePattern);
        if (closeIdx != -1) {
          final closeTagMatch = closePattern.firstMatch(html.substring(i + closeIdx))!;
          result.write(html.substring(i, i + closeIdx + closeTagMatch.group(0)!.length));
          i = i + closeIdx + closeTagMatch.group(0)!.length;
        } else {
          result.write(html.substring(i));
          i = len;
        }
        continue;
      }

      if (openMatch != null) {
        result.write(_processOpeningTag(fullTag));
      } else {
        result.write(fullTag);
      }
      i = tagEnd + 1;
      continue;
    }

    // Text: collapse whitespace
    var textEnd = html.indexOf('<', i);
    if (textEnd == -1) textEnd = len;
    final text = html.substring(i, textEnd);
    result.write(text.replaceAll(RegExp(r'\s{2,}'), ' '));
    i = textEnd;
  }

  return result.toString();
}
