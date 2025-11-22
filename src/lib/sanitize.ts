/**
 * XSS Sanitization Module
 *
 * Provides utilities to sanitize user-generated content and prevent XSS attacks.
 * Uses simple regex-based sanitization for server-side operations.
 * For client-side sanitization with DOM manipulation, use dompurify directly.
 */

/**
 * Sanitization profiles for different content types
 */
export const SanitizationProfiles = {
  /**
   * Plain text only - strips ALL HTML tags
   * Use for: titles, labels, identifiers
   */
  TEXT_ONLY: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  /**
   * Basic formatting - allows safe inline formatting tags
   * Use for: descriptions, short content with basic styling
   */
  BASIC_FORMAT: {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "br"],
    ALLOWED_ATTR: [],
  },

  /**
   * Rich content - allows links, lists, and formatting
   * Use for: detailed descriptions, notes, resources
   */
  RICH_CONTENT: {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "br",
      "p",
      "a",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "title"],
    ALLOWED_URI_REGEXP: /^https?:\/\//,
  },
};

/**
 * Sanitize plain text - strips all HTML tags
 *
 * @param input - User input string
 * @returns Sanitized string with all HTML removed
 *
 * @example
 * sanitizePlainText("<script>alert('xss')</script>Hello")
 * // Returns: "Hello"
 */
export function sanitizePlainText(input: string | null | undefined): string {
  if (!input) return "";

  const trimmed = input.trim();
  if (!trimmed) return "";

  // Strip dangerous tags and their content first (script, style, iframe, object, embed)
  let sanitized = trimmed.replace(
    /<(script|style|iframe|object|embed|svg)[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );

  // Strip self-closing dangerous tags
  sanitized = sanitized.replace(
    /<(script|style|iframe|object|embed|svg)[^>]*\/>/gi,
    "",
  );

  // Strip all remaining HTML tags
  return sanitized.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize text with basic formatting support
 *
 * @param input - User input string
 * @returns Sanitized string with safe formatting tags preserved
 *
 * @example
 * sanitizeBasicFormat("Hello <b>world</b><script>alert('xss')</script>")
 * // Returns: "Hello <b>world</b>"
 */
export function sanitizeBasicFormat(input: string | null | undefined): string {
  if (!input) return "";

  const trimmed = input.trim();
  if (!trimmed) return "";

  // Strip dangerous tags and their content first
  let sanitized = trimmed.replace(
    /<(script|style|iframe|object|embed|svg)[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );

  // Strip self-closing dangerous tags
  sanitized = sanitized.replace(
    /<(script|style|iframe|object|embed|svg)[^>]*\/>/gi,
    "",
  );

  // Allow only safe formatting tags (without attributes)
  const allowedTags = ["b", "i", "em", "strong", "u", "br"];

  // Replace tags - keep only allowed tags and strip all attributes
  sanitized = sanitized.replace(
    /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
    (match, tag: string) => {
      const tagLower = tag.toLowerCase();
      if (allowedTags.includes(tagLower)) {
        // Return tag without attributes
        return match.startsWith("</") ? `</${tagLower}>` : `<${tagLower}>`;
      }
      return "";
    },
  );

  return sanitized;
}

/**
 * Sanitize rich content with links and lists
 *
 * @param input - User input string
 * @returns Sanitized string with safe rich content preserved
 *
 * @example
 * sanitizeRichContent('<a href="https://example.com">Link</a><script>alert("xss")</script>')
 * // Returns: '<a href="https://example.com">Link</a>'
 */
export function sanitizeRichContent(input: string | null | undefined): string {
  if (!input) return "";

  const trimmed = input.trim();
  if (!trimmed) return "";

  // Strip dangerous tags and their content first
  let sanitized = trimmed.replace(
    /<(script|style|iframe|object|embed|svg|form|input|meta)[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );

  // Strip self-closing dangerous tags
  sanitized = sanitized.replace(
    /<(script|style|iframe|object|embed|svg|form|input|meta)[^>]*\/>/gi,
    "",
  );

  // Allow safe rich content tags
  const allowedTags = [
    "b",
    "i",
    "em",
    "strong",
    "u",
    "br",
    "p",
    "a",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
  ];

  // Remove all tags except allowed ones, strip all dangerous attributes
  sanitized = sanitized.replace(
    /<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi,
    (match, tag: string, attrs: string) => {
      const tagLower = tag.toLowerCase();
      if (!allowedTags.includes(tagLower)) {
        return "";
      }

      // For closing tags, just return without attributes
      if (match.startsWith("</")) {
        return `</${tagLower}>`;
      }

      // For anchor tags, preserve only https/http href
      if (tagLower === "a" && attrs) {
        const hrefPattern = /href\s*=\s*["'](https?:\/\/[^"']*)["']/i;
        const hrefMatch = hrefPattern.exec(attrs);
        if (hrefMatch?.[1]) {
          return `<a href="${hrefMatch[1]}">`;
        }
        return "<a>";
      }

      // For other tags, strip all attributes
      return `<${tagLower}>`;
    },
  );

  return sanitized;
}

/**
 * Sanitize JSON content recursively
 * Sanitizes all string values in an object while preserving structure
 *
 * @param input - JSON-compatible object
 * @param profile - Sanitization profile to use for string values
 * @returns Sanitized object with all strings cleaned
 *
 * @example
 * sanitizeJsonContent({
 *   title: "<script>xss</script>",
 *   items: ["<b>safe</b>", "<script>bad</script>"]
 * })
 * // Returns: { title: "", items: ["safe", ""] }
 */
export function sanitizeJsonContent(
  input: Record<string, unknown> | null | undefined,
  profile: keyof typeof SanitizationProfiles = "TEXT_ONLY",
): Record<string, unknown> | null {
  if (!input) return null;

  const sanitizer =
    profile === "TEXT_ONLY"
      ? sanitizePlainText
      : profile === "BASIC_FORMAT"
        ? sanitizeBasicFormat
        : sanitizeRichContent;

  const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === "string") {
      return sanitizer(value);
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]),
      );
    }
    return value;
  };

  return sanitizeValue(input) as Record<string, unknown>;
}

/**
 * Type guard to check if a value is a valid JSON object
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}
