import { describe, it, expect } from "vitest";
import { generateNodeUrl, extractNodeInfo } from "../url-utils";

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
