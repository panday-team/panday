/**
 * XSS Sanitization Module
 *
 * Provides utilities to sanitize user-generated content and prevent XSS attacks.
 * Uses DOMPurify for HTML sanitization with strict configuration profiles.
 */

import DOMPurify from "isomorphic-dompurify";

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

  return DOMPurify.sanitize(trimmed, SanitizationProfiles.TEXT_ONLY);
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

  return DOMPurify.sanitize(trimmed, SanitizationProfiles.BASIC_FORMAT);
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

  return DOMPurify.sanitize(trimmed, SanitizationProfiles.RICH_CONTENT);
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
