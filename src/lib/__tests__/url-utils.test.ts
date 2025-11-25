import { describe, it, expect } from "vitest";
import {
  generateNodeUrl,
  extractNodeInfo,
  headingToAnchor,
} from "../url-utils";

describe("URL Utils", () => {
  describe("generateNodeUrl", () => {
    it("should generate URL with all parameters", () => {
      const url = generateNodeUrl({
        roadmapId: "electrician-bc",
        nodeId: "foundation-program",
        nodeType: "hub",
      });

      expect(url).toBe(
        "/roadmap?roadmap=electrician-bc&node=foundation-program&type=hub",
      );
    });

    it("should generate URL without node type", () => {
      const url = generateNodeUrl({
        roadmapId: "electrician-bc",
        nodeId: "level-1",
      });

      expect(url).toBe("/roadmap?roadmap=electrician-bc&node=level-1");
    });

    it("should include section anchor when provided", () => {
      const url = generateNodeUrl({
        roadmapId: "electrician-bc",
        nodeId: "level-2",
        section: "Technical Training Curriculum",
      });

      expect(url).toBe(
        "/roadmap?roadmap=electrician-bc&node=level-2#technical-training-curriculum",
      );
    });

    it("should include chunk index when provided", () => {
      const url = generateNodeUrl({
        roadmapId: "electrician-bc",
        nodeId: "level-1",
        chunkIndex: 3,
      });

      expect(url).toBe("/roadmap?roadmap=electrician-bc&node=level-1&chunk=3");
    });

    it("should handle both section and chunk index", () => {
      const url = generateNodeUrl({
        roadmapId: "electrician-bc",
        nodeId: "level-3",
        nodeType: "hub",
        section: "Prerequisites",
        chunkIndex: 2,
      });

      expect(url).toBe(
        "/roadmap?roadmap=electrician-bc&node=level-3&type=hub&chunk=2#prerequisites",
      );
    });
  });

  describe("headingToAnchor", () => {
    it("should convert heading to URL-safe anchor", () => {
      expect(headingToAnchor("Technical Training Curriculum")).toBe(
        "technical-training-curriculum",
      );
    });

    it("should handle special characters", () => {
      expect(headingToAnchor("AC Circuits (Inductance & Capacitance)")).toBe(
        "ac-circuits-inductance-capacitance",
      );
    });

    it("should handle multiple spaces and dashes", () => {
      expect(headingToAnchor("Before   You   Begin")).toBe("before-you-begin");
    });

    it("should handle leading and trailing dashes", () => {
      expect(headingToAnchor("- Section Name -")).toBe("section-name");
    });
  });

  describe("extractNodeInfo", () => {
    it("should extract node information from metadata", () => {
      const metadata = {
        node_id: "foundation-program",
        type: "hub",
        title: "Electrician Foundation",
      };

      const result = extractNodeInfo(metadata);

      expect(result).toEqual({
        nodeId: "foundation-program",
        nodeType: "hub",
        title: "Electrician Foundation",
      });
    });

    it("should handle missing metadata fields", () => {
      const metadata = {};

      const result = extractNodeInfo(metadata);

      expect(result).toEqual({
        nodeId: "unknown",
        nodeType: undefined,
        title: undefined,
      });
    });

    it("should prefer node_id over id", () => {
      const metadata = {
        node_id: "preferred-id",
        id: "fallback-id",
      };

      const result = extractNodeInfo(metadata);

      expect(result.nodeId).toBe("preferred-id");
    });
  });
});
