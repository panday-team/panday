import { describe, it, expect } from "vitest";
import {
  correctUrl,
  validateAndCorrectResources,
  isTrustedDomain,
} from "../verified-urls";

describe("verified-urls", () => {
  describe("correctUrl", () => {
    it("should correct skilledtradesbc.ca/trade/construction-electrician to /electrician-construction", () => {
      const result = correctUrl(
        "https://skilledtradesbc.ca/trade/construction-electrician",
      );
      expect(result).toBe(
        "https://skilledtradesbc.ca/electrician-construction",
      );
    });

    it("should correct skilledtradesbc.ca/find-training-program to /find-your-trade", () => {
      const result = correctUrl(
        "https://skilledtradesbc.ca/find-training-program",
      );
      expect(result).toBe("https://skilledtradesbc.ca/find-your-trade");
    });

    it("should correct red-seal.ca year-based URLs to main electrician page", () => {
      const result = correctUrl(
        "https://red-seal.ca/eng/trades/electric/2018rs.4.1.shtml",
      );
      expect(result).toBe("https://red-seal.ca/trades/elec-eng.html");
    });

    it("should add https:// prefix if missing", () => {
      const result = correctUrl("skilledtradesbc.ca/electrician-construction");
      expect(result).toBe(
        "https://skilledtradesbc.ca/electrician-construction",
      );
    });

    it("should return valid URLs unchanged", () => {
      const validUrl = "https://skilledtradesbc.ca/electrician-construction";
      const result = correctUrl(validUrl);
      expect(result).toBe(validUrl);
    });

    it("should handle null/undefined gracefully", () => {
      expect(correctUrl(null as unknown as string)).toBe(null);
      expect(correctUrl(undefined as unknown as string)).toBe(undefined);
      expect(correctUrl("")).toBe("");
    });

    it("should correct skilledtradesbc.ca/exams to /get-certified/about-exams", () => {
      const result = correctUrl("https://skilledtradesbc.ca/exams");
      expect(result).toBe(
        "https://skilledtradesbc.ca/get-certified/about-exams",
      );
    });

    it("should correct skilledtradesbc.ca/apprentice to /become-an-apprentice", () => {
      const result = correctUrl("https://skilledtradesbc.ca/apprentice");
      expect(result).toBe("https://skilledtradesbc.ca/become-an-apprentice");
    });

    it("should correct www.red-seal.ca URLs", () => {
      const result = correctUrl("https://www.red-seal.ca/trades/electrician");
      expect(result).toBe("https://red-seal.ca/trades/elec-eng.html");
    });
  });

  describe("validateAndCorrectResources", () => {
    it("should correct URLs in resources array", () => {
      const resources = [
        {
          label: "Electrician Info",
          href: "https://skilledtradesbc.ca/trade/construction-electrician",
        },
        {
          label: "Find Training",
          href: "https://skilledtradesbc.ca/find-training-program",
        },
      ];

      const result = validateAndCorrectResources(resources);

      expect(result).toEqual([
        {
          label: "Electrician Info",
          href: "https://skilledtradesbc.ca/electrician-construction",
        },
        {
          label: "Find Training",
          href: "https://skilledtradesbc.ca/find-your-trade",
        },
      ]);
    });

    it("should return null for null/undefined input", () => {
      expect(validateAndCorrectResources(null)).toBe(null);
      expect(validateAndCorrectResources(undefined)).toBe(null);
    });

    it("should preserve valid URLs", () => {
      const resources = [
        {
          label: "SkilledTradesBC",
          href: "https://skilledtradesbc.ca/electrician-construction",
        },
      ];

      const result = validateAndCorrectResources(resources);

      expect(result).toEqual(resources);
    });

    it("should handle empty arrays", () => {
      const result = validateAndCorrectResources([]);
      expect(result).toEqual([]);
    });
  });

  describe("isTrustedDomain", () => {
    it("should return true for skilledtradesbc.ca", () => {
      expect(isTrustedDomain("https://skilledtradesbc.ca/something")).toBe(
        true,
      );
    });

    it("should return true for www.skilledtradesbc.ca", () => {
      expect(isTrustedDomain("https://www.skilledtradesbc.ca/something")).toBe(
        true,
      );
    });

    it("should return true for portal.skilledtradesbc.ca", () => {
      expect(isTrustedDomain("https://portal.skilledtradesbc.ca")).toBe(true);
    });

    it("should return true for red-seal.ca", () => {
      expect(isTrustedDomain("https://www.red-seal.ca/trades")).toBe(true);
    });

    it("should return true for workbc.ca", () => {
      expect(isTrustedDomain("https://www.workbc.ca/jobs")).toBe(true);
    });

    it("should return true for bcit.ca", () => {
      expect(isTrustedDomain("https://www.bcit.ca/programs")).toBe(true);
    });

    it("should return true for gov.bc.ca", () => {
      expect(isTrustedDomain("https://www2.gov.bc.ca/gov/content/taxes")).toBe(
        true,
      );
    });

    it("should return true for canada.ca", () => {
      expect(
        isTrustedDomain("https://www.canada.ca/en/services/benefits"),
      ).toBe(true);
    });

    it("should return false for untrusted domains", () => {
      expect(isTrustedDomain("https://example.com")).toBe(false);
      expect(isTrustedDomain("https://malicious-site.com")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(isTrustedDomain("not-a-url")).toBe(false);
      expect(isTrustedDomain("")).toBe(false);
    });
  });
});
