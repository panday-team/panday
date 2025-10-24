import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    });

    it("should merge Tailwind classes correctly", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });

    it("should handle undefined and null values", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("should handle arrays", () => {
      expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
    });

    it("should handle objects", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("should merge conflicting Tailwind utilities", () => {
      expect(cn("text-sm", "text-lg")).toBe("text-lg");
      expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });

    it("should handle multiple conflicting utilities", () => {
      expect(cn("p-2 p-4", "p-6")).toBe("p-6");
    });

    it("should preserve non-conflicting utilities", () => {
      const result = cn("flex items-center", "justify-between");
      expect(result).toContain("flex");
      expect(result).toContain("items-center");
      expect(result).toContain("justify-between");
    });
  });
});
