import { describe, it, expect } from "vitest";
import { minify } from "../src/minifier.js";

describe("whitespace collapsing", () => {
  it("should collapse multiple spaces to single space", () => {
    expect(minify("<p>hello    world</p>")).toBe("<p>hello world");
  });

  it("should collapse newlines and tabs", () => {
    expect(minify("<p>hello\n\t\t  world</p>")).toBe("<p>hello world");
  });

  it("should collapse whitespace between tags", () => {
    expect(minify("<div>   <span>hi</span>   </div>")).toBe("<div> <span>hi</span> </div>");
  });

  it("should preserve single spaces", () => {
    expect(minify("<p>hello world</p>")).toBe("<p>hello world");
  });
});

describe("comment removal", () => {
  it("should remove regular HTML comments", () => {
    expect(minify("<!-- comment --><p>hi</p>")).toBe("<p>hi");
  });

  it("should remove multiple comments", () => {
    expect(minify("<!-- a --><p><!-- b -->hi<!-- c --></p>")).toBe("<p>hi");
  });

  it("should preserve conditional comments", () => {
    const input = "<!--[if IE]><p>IE only</p><![endif]-->";
    expect(minify(input)).toBe(input);
  });

  it("should preserve downlevel conditional comments", () => {
    const input = "<!--<![if !IE]><p>not IE</p><!--<![endif]-->";
    // The first one is preserved, the second is a regular comment
    expect(minify(input)).toContain("<!--<![if !IE]>");
  });

  it("should handle malformed comments (no closing -->)", () => {
    // Should not crash, outputs character by character
    expect(minify("<!-- unclosed")).toBe("<!-- unclosed");
  });
});

describe("boolean attribute collapsing", () => {
  it('should collapse checked="checked" to checked', () => {
    expect(minify('<input checked="checked">')).toBe("<input checked>");
  });

  it("should collapse disabled=\"disabled\"", () => {
    expect(minify('<button disabled="disabled">Go</button>')).toBe("<button disabled>Go</button>");
  });

  it("should collapse selected with empty value", () => {
    expect(minify('<option selected="">text</option>')).toBe("<option selected>text");
  });

  it("should not collapse non-boolean attributes", () => {
    expect(minify('<input type="text">')).toBe("<input type=text>");
  });
});

describe("attribute sorting", () => {
  it("should sort attributes alphabetically", () => {
    expect(minify('<div style="x" class="y" id="z">')).toBe('<div class=y id=z style=x>');
  });

  it("should handle single attribute (no change)", () => {
    expect(minify('<div class="foo">')).toBe("<div class=foo>");
  });

  it("should handle no attributes", () => {
    expect(minify("<div>")).toBe("<div>");
  });
});

describe("optional closing tag removal", () => {
  it("should remove </li>", () => {
    expect(minify("<li>item</li>")).toBe("<li>item");
  });

  it("should remove </p>", () => {
    expect(minify("<p>paragraph</p>")).toBe("<p>paragraph");
  });

  it("should remove </td> and </tr>", () => {
    expect(minify("<tr><td>cell</td></tr>")).toBe("<tr><td>cell");
  });

  it("should remove </option>", () => {
    expect(minify("<option>a</option><option>b</option>")).toBe("<option>a<option>b");
  });

  it("should remove </thead>, </tbody>, </tfoot>", () => {
    expect(minify("<thead></thead><tbody></tbody><tfoot></tfoot>")).toBe("<thead><tbody><tfoot>");
  });

  it("should NOT remove </div>", () => {
    expect(minify("<div>content</div>")).toBe("<div>content</div>");
  });

  it("should NOT remove </span>", () => {
    expect(minify("<span>text</span>")).toBe("<span>text</span>");
  });
});

describe("optional attribute quote removal", () => {
  it("should remove quotes for simple values", () => {
    expect(minify('<div class="foo">')).toBe("<div class=foo>");
  });

  it("should keep quotes for values with spaces", () => {
    expect(minify('<div class="foo bar">')).toBe('<div class="foo bar">');
  });

  it("should keep quotes for values with special chars", () => {
    expect(minify('<a href="https://example.com?a=1&b=2">')).toBe('<a href="https://example.com?a=1&b=2">');
  });

  it("should keep quotes for empty values", () => {
    expect(minify('<div data-x="">')).toBe('<div data-x="">');
  });
});

describe("raw content preservation", () => {
  it("should preserve script content verbatim", () => {
    const input = '<script>  var x = 1;  \n  var y = 2;  </script>';
    const result = minify(input);
    expect(result).toContain("  var x = 1;  \n  var y = 2;  ");
  });

  it("should preserve style content verbatim", () => {
    const input = "<style>  .a { color: red; }  </style>";
    const result = minify(input);
    expect(result).toContain("  .a { color: red; }  ");
  });

  it("should preserve pre content verbatim", () => {
    const input = "<pre>  line 1\n  line 2  </pre>";
    const result = minify(input);
    expect(result).toContain("  line 1\n  line 2  ");
  });

  it("should preserve code content verbatim", () => {
    const input = "<code>  function(){}  </code>";
    const result = minify(input);
    expect(result).toContain("  function(){}  ");
  });

  it("should preserve textarea content verbatim", () => {
    const input = "<textarea>  hello\n  world  </textarea>";
    const result = minify(input);
    expect(result).toContain("  hello\n  world  ");
  });

  it("should handle script with no closing tag (malformed)", () => {
    const input = "<script>var x = 1;";
    const result = minify(input);
    expect(result).toContain("var x = 1;");
  });
});

describe("CDATA preservation", () => {
  it("should preserve CDATA sections", () => {
    const input = "<![CDATA[  some data  ]]>";
    expect(minify(input)).toBe(input);
  });
});

describe("edge cases", () => {
  it("should handle empty string", () => {
    expect(minify("")).toBe("");
  });

  it("should handle string with only whitespace", () => {
    expect(minify("   \n\t  ")).toBe(" ");
  });

  it("should handle non-ASCII content (CJK)", () => {
    const input = "<p>日本語テスト</p>";
    expect(minify(input)).toBe("<p>日本語テスト");
  });

  it("should handle emoji content", () => {
    const input = "<p>Hello 🌍 World 🚀</p>";
    expect(minify(input)).toBe("<p>Hello 🌍 World 🚀");
  });

  it("should handle Arabic RTL text", () => {
    const input = "<p>مرحبا بالعالم</p>";
    expect(minify(input)).toBe("<p>مرحبا بالعالم");
  });

  it("should handle self-closing tags", () => {
    expect(minify('<img src="x.png" alt="a" />')).toBe("<img alt=a src=x.png/>");
  });

  it("should handle malformed tag (no closing >)", () => {
    expect(minify("<div class=foo")).toBe("<div class=foo");
  });

  it("should handle deeply nested HTML", () => {
    const input = "<div><div><div><p>deep</p></div></div></div>";
    expect(minify(input)).toBe("<div><div><div><p>deep</div></div></div>");
  });

  it("should handle SVG content (pass through tags)", () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>';
    const result = minify(input);
    expect(result).toContain("circle");
    expect(result).toContain("svg");
  });
});
