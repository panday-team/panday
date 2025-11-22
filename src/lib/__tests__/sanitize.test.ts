/**
 * Tests for XSS Sanitization Module
 *
 * Covers all attack vectors and sanitization profiles
 */

import { describe, it, expect } from "vitest";
import {
  sanitizePlainText,
  sanitizeBasicFormat,
  sanitizeRichContent,
  sanitizeJsonContent,
  isJsonObject,
  SanitizationProfiles,
} from "../sanitize";

describe("sanitize", () => {
  describe("sanitizePlainText", () => {
    it("should strip all HTML tags", () => {
      expect(sanitizePlainText("<b>Bold</b> text")).toBe("Bold text");
      expect(sanitizePlainText("<script>alert('xss')</script>")).toBe("");
      expect(sanitizePlainText("<a href='#'>Link</a>")).toBe("Link");
    });

    it("should preserve plain text", () => {
      expect(sanitizePlainText("Simple text")).toBe("Simple text");
      expect(sanitizePlainText("Text with 123 numbers")).toBe(
        "Text with 123 numbers",
      );
    });

    it("should handle XSS attack vectors", () => {
      // Script tags
      expect(sanitizePlainText("<script>alert('xss')</script>")).toBe("");
      expect(sanitizePlainText("<script src='evil.js'></script>Hello")).toBe(
        "Hello",
      );

      // Event handlers
      expect(sanitizePlainText("<img onerror='alert(1)'>")).toBe("");
      expect(sanitizePlainText("<div onclick='evil()'>Click</div>")).toBe(
        "Click",
      );

      // Iframes
      expect(sanitizePlainText("<iframe src='evil.com'></iframe>")).toBe("");

      // Data URIs
      expect(
        sanitizePlainText(
          "<img src='data:text/html,<script>alert(1)</script>'>",
        ),
      ).toBe("");

      // JavaScript protocol
      expect(sanitizePlainText("<a href='javascript:alert(1)'>Link</a>")).toBe(
        "Link",
      );

      // Style injection
      expect(
        sanitizePlainText(
          "<p style='background:url(javascript:alert(1))'>Text</p>",
        ),
      ).toBe("Text");
    });

    it("should handle null/undefined/empty inputs", () => {
      expect(sanitizePlainText(null)).toBe("");
      expect(sanitizePlainText(undefined)).toBe("");
      expect(sanitizePlainText("")).toBe("");
      expect(sanitizePlainText("   ")).toBe("");
    });

    it("should trim whitespace", () => {
      expect(sanitizePlainText("  text  ")).toBe("text");
      expect(sanitizePlainText("\n\ttext\n\t")).toBe("text");
    });
  });

  describe("sanitizeBasicFormat", () => {
    it("should allow safe formatting tags", () => {
      expect(sanitizeBasicFormat("<b>Bold</b> text")).toBe("<b>Bold</b> text");
      expect(sanitizeBasicFormat("<i>Italic</i>")).toBe("<i>Italic</i>");
      expect(sanitizeBasicFormat("<em>Emphasis</em>")).toBe(
        "<em>Emphasis</em>",
      );
      expect(sanitizeBasicFormat("<strong>Strong</strong>")).toBe(
        "<strong>Strong</strong>",
      );
      expect(sanitizeBasicFormat("<u>Underline</u>")).toBe("<u>Underline</u>");
      expect(sanitizeBasicFormat("Line 1<br>Line 2")).toBe("Line 1<br>Line 2");
    });

    it("should strip dangerous tags", () => {
      expect(sanitizeBasicFormat("<script>alert('xss')</script>")).toBe("");
      expect(sanitizeBasicFormat("<a href='#'>Link</a>")).toBe("Link");
      expect(sanitizeBasicFormat("<iframe>evil</iframe>")).toBe("");
    });

    it("should remove all attributes", () => {
      expect(sanitizeBasicFormat("<b class='danger'>Bold</b>")).toBe(
        "<b>Bold</b>",
      );
      expect(sanitizeBasicFormat("<i id='bad'>Italic</i>")).toBe(
        "<i>Italic</i>",
      );
    });

    it("should handle mixed safe/unsafe content", () => {
      const input =
        "<b>Safe</b><script>evil()</script><i>Also safe</i><iframe>bad</iframe>";
      const expected = "<b>Safe</b><i>Also safe</i>";
      expect(sanitizeBasicFormat(input)).toBe(expected);
    });

    it("should handle XSS in formatting tags", () => {
      expect(sanitizeBasicFormat("<b onclick='evil()'>Text</b>")).toBe(
        "<b>Text</b>",
      );
      // Self-closing tag without closing tag
      expect(
        sanitizeBasicFormat("<i style='background:url(javascript:alert(1))'>"),
      ).toBe("<i>");
    });

    it("should handle null/undefined/empty inputs", () => {
      expect(sanitizeBasicFormat(null)).toBe("");
      expect(sanitizeBasicFormat(undefined)).toBe("");
      expect(sanitizeBasicFormat("")).toBe("");
    });
  });

  describe("sanitizeRichContent", () => {
    it("should allow rich formatting tags", () => {
      expect(sanitizeRichContent("<p>Paragraph</p>")).toBe("<p>Paragraph</p>");
      expect(sanitizeRichContent("<ul><li>Item</li></ul>")).toBe(
        "<ul><li>Item</li></ul>",
      );
      expect(sanitizeRichContent("<ol><li>Step 1</li></ol>")).toBe(
        "<ol><li>Step 1</li></ol>",
      );
      expect(sanitizeRichContent("<code>const x = 1;</code>")).toBe(
        "<code>const x = 1;</code>",
      );
      expect(sanitizeRichContent("<pre>Code block</pre>")).toBe(
        "<pre>Code block</pre>",
      );
    });

    it("should allow links with https/http only", () => {
      expect(
        sanitizeRichContent('<a href="https://example.com">Link</a>'),
      ).toBe('<a href="https://example.com">Link</a>');
      expect(sanitizeRichContent('<a href="http://example.com">Link</a>')).toBe(
        '<a href="http://example.com">Link</a>',
      );
    });

    it("should strip javascript: protocol links", () => {
      expect(
        sanitizeRichContent('<a href="javascript:alert(1)">Click</a>'),
      ).toBe("<a>Click</a>");
    });

    it("should strip data: URI links", () => {
      expect(
        sanitizeRichContent(
          '<a href="data:text/html,<script>alert(1)</script>">Click</a>',
        ),
      ).toBe("<a>Click</a>");
    });

    it("should strip attributes except href on links", () => {
      // Our regex-based sanitizer only preserves href, not title
      expect(
        sanitizeRichContent(
          '<a href="https://example.com" title="Example">Link</a>',
        ),
      ).toBe('<a href="https://example.com">Link</a>');
    });

    it("should strip dangerous attributes", () => {
      // Opening tags without closing tags
      expect(
        sanitizeRichContent('<a href="https://example.com" onclick="evil()">'),
      ).toBe('<a href="https://example.com">');
      expect(
        sanitizeRichContent('<p style="background:url(javascript:alert(1))">'),
      ).toBe("<p>");
    });

    it("should strip dangerous tags", () => {
      expect(sanitizeRichContent("<script>alert('xss')</script>")).toBe("");
      expect(sanitizeRichContent("<iframe>evil</iframe>")).toBe("");
      // Our sanitizer strips dangerous tags and their content completely
      expect(sanitizeRichContent("<object>evil</object>")).toBe("");
      expect(sanitizeRichContent("<embed>evil</embed>")).toBe("");
    });

    it("should handle complex nested content", () => {
      const input = `
        <p>Introduction</p>
        <ul>
          <li><b>Bold item</b></li>
          <li><a href="https://example.com">Link</a></li>
        </ul>
        <script>evil()</script>
        <pre><code>code block</code></pre>
      `;
      const result = sanitizeRichContent(input);
      expect(result).toContain("<p>Introduction</p>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<b>Bold item</b>");
      expect(result).toContain('<a href="https://example.com">Link</a>');
      expect(result).toContain("<pre><code>code block</code></pre>");
      expect(result).not.toContain("<script>");
    });

    it("should handle null/undefined/empty inputs", () => {
      expect(sanitizeRichContent(null)).toBe("");
      expect(sanitizeRichContent(undefined)).toBe("");
      expect(sanitizeRichContent("")).toBe("");
    });
  });

  describe("sanitizeJsonContent", () => {
    it("should sanitize string values in objects", () => {
      const input = {
        title: "<script>xss</script>Hello",
        description: "<b>Safe</b><script>bad</script>",
      };
      const result = sanitizeJsonContent(input, "TEXT_ONLY");
      expect(result).toEqual({
        title: "Hello",
        description: "Safe", // TEXT_ONLY strips all tags including <b>
      });
    });

    it("should preserve non-string values", () => {
      const input = {
        count: 42,
        enabled: true,
        value: null,
      };
      const result = sanitizeJsonContent(input);
      expect(result).toEqual(input);
    });

    it("should sanitize nested objects", () => {
      const input = {
        user: {
          name: "<script>xss</script>John",
          bio: "<b>Developer</b>",
        },
      };
      const result = sanitizeJsonContent(input, "BASIC_FORMAT");
      expect(result).toEqual({
        user: {
          name: "John",
          bio: "<b>Developer</b>",
        },
      });
    });

    it("should sanitize arrays", () => {
      const input = {
        items: ["<script>xss</script>", "<b>Safe</b>", "Plain text"],
      };
      const result = sanitizeJsonContent(input, "BASIC_FORMAT");
      expect(result).toEqual({
        items: ["", "<b>Safe</b>", "Plain text"],
      });
    });

    it("should handle mixed nested structures", () => {
      const input = {
        metadata: {
          tags: ["<script>bad</script>tag1", "<b>tag2</b>"],
          counts: [1, 2, 3],
          nested: {
            value: "<i>italic</i><script>xss</script>",
          },
        },
      };
      const result = sanitizeJsonContent(input, "BASIC_FORMAT");
      expect(result).toEqual({
        metadata: {
          tags: ["tag1", "<b>tag2</b>"],
          counts: [1, 2, 3],
          nested: {
            value: "<i>italic</i>",
          },
        },
      });
    });

    it("should respect sanitization profile", () => {
      const input = { text: "<b>Bold</b><script>xss</script>" };

      expect(sanitizeJsonContent(input, "TEXT_ONLY")).toEqual({
        text: "Bold", // TEXT_ONLY strips ALL tags including script content
      });
      expect(sanitizeJsonContent(input, "BASIC_FORMAT")).toEqual({
        text: "<b>Bold</b>",
      });
      expect(sanitizeJsonContent(input, "RICH_CONTENT")).toEqual({
        text: "<b>Bold</b>",
      });
    });

    it("should handle null/undefined input", () => {
      expect(sanitizeJsonContent(null)).toBe(null);
      expect(sanitizeJsonContent(undefined)).toBe(null);
    });

    it("should handle empty objects", () => {
      expect(sanitizeJsonContent({})).toEqual({});
    });
  });

  describe("isJsonObject", () => {
    it("should return true for plain objects", () => {
      expect(isJsonObject({})).toBe(true);
      expect(isJsonObject({ key: "value" })).toBe(true);
    });

    it("should return false for non-objects", () => {
      expect(isJsonObject(null)).toBe(false);
      expect(isJsonObject(undefined)).toBe(false);
      expect(isJsonObject("string")).toBe(false);
      expect(isJsonObject(123)).toBe(false);
      expect(isJsonObject(true)).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(isJsonObject([])).toBe(false);
      expect(isJsonObject([1, 2, 3])).toBe(false);
    });

    it("should return false for special objects", () => {
      expect(isJsonObject(new Date())).toBe(false);
      expect(isJsonObject(/regex/)).toBe(false);
    });
  });

  describe("SanitizationProfiles", () => {
    it("should have TEXT_ONLY profile with no tags", () => {
      expect(SanitizationProfiles.TEXT_ONLY.ALLOWED_TAGS).toEqual([]);
      expect(SanitizationProfiles.TEXT_ONLY.ALLOWED_ATTR).toEqual([]);
      expect(SanitizationProfiles.TEXT_ONLY.KEEP_CONTENT).toBe(true);
    });

    it("should have BASIC_FORMAT profile with formatting tags", () => {
      expect(SanitizationProfiles.BASIC_FORMAT.ALLOWED_TAGS).toContain("b");
      expect(SanitizationProfiles.BASIC_FORMAT.ALLOWED_TAGS).toContain("i");
      expect(SanitizationProfiles.BASIC_FORMAT.ALLOWED_TAGS).toContain("br");
      expect(SanitizationProfiles.BASIC_FORMAT.ALLOWED_ATTR).toEqual([]);
    });

    it("should have RICH_CONTENT profile with links and lists", () => {
      expect(SanitizationProfiles.RICH_CONTENT.ALLOWED_TAGS).toContain("a");
      expect(SanitizationProfiles.RICH_CONTENT.ALLOWED_TAGS).toContain("ul");
      expect(SanitizationProfiles.RICH_CONTENT.ALLOWED_TAGS).toContain("code");
      expect(SanitizationProfiles.RICH_CONTENT.ALLOWED_ATTR).toContain("href");
      expect(
        SanitizationProfiles.RICH_CONTENT.ALLOWED_URI_REGEXP,
      ).toBeDefined();
    });
  });

  describe("XSS attack vector edge cases", () => {
    it("should handle HTML entity encoding attempts", () => {
      expect(sanitizePlainText("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe(
        "&lt;script&gt;alert(1)&lt;/script&gt;",
      );
    });

    it("should handle unicode/hex encoding attempts", () => {
      // Our sanitizer strips the script tag and its content
      // The incomplete closing tag remains as text but is harmless
      expect(
        sanitizePlainText("<script>\\u0061\\u006c\\u0065\\u0072\\u0074(1)"),
      ).toBe("\\u0061\\u006c\\u0065\\u0072\\u0074(1)");
    });

    it("should handle nested tags", () => {
      // Our sanitizer removes the script tag and its content
      // The malformed outer tags are also stripped
      expect(
        sanitizePlainText("<<script>script>alert(1)<</script>/script>"),
      ).toBe("");
    });

    it("should handle malformed tags", () => {
      // Our sanitizer strips script tags even when malformed
      expect(sanitizePlainText("<script<>alert(1)</script>")).toBe("");
      // Nested script tag is removed, but malformed outer text remains (harmless)
      expect(sanitizePlainText("<scr<script>ipt>alert(1)")).toBe(
        "ipt>alert(1)",
      );
    });

    it("should handle SVG-based XSS", () => {
      expect(sanitizePlainText("<svg onload='alert(1)'>")).toBe("");
      expect(sanitizePlainText("<svg><script>alert(1)</script></svg>")).toBe(
        "",
      );
    });

    it("should handle form-based XSS", () => {
      expect(
        sanitizePlainText(
          "<form action='javascript:alert(1)'><input type='submit'></form>",
        ),
      ).toBe("");
    });

    it("should handle meta refresh XSS", () => {
      expect(
        sanitizePlainText(
          "<meta http-equiv='refresh' content='0;url=javascript:alert(1)'>",
        ),
      ).toBe("");
    });
  });
});
