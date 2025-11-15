import { describe, it, expect } from "vitest";
import {
  loadRoadmapMetadata,
  loadRoadmapGraph,
  loadNodeContent,
  loadAllNodeContent,
  buildRoadmap,
  getAvailableRoadmaps,
} from "../roadmap-loader";

describe("roadmap-loader", () => {
  describe("loadRoadmapMetadata", () => {
    it("should load metadata for electrician-bc roadmap", async () => {
      const metadata = await loadRoadmapMetadata("electrician-bc");

      expect(metadata).toBeDefined();
      expect(metadata.id).toBe("electrician-bc");
      expect(metadata.title).toBe(
        "Construction Electrician - Red Seal Certification",
      );
      expect(metadata.province).toBe("British Columbia");
      expect(metadata.industry).toBe("Skilled Trades");
    });

    it("should throw error for non-existent roadmap", async () => {
      await expect(loadRoadmapMetadata("non-existent")).rejects.toThrow();
    });
  });

  describe("loadRoadmapGraph", () => {
    it("should load graph structure for electrician-bc", async () => {
      const graph = await loadRoadmapGraph("electrician-bc");

      expect(graph).toBeDefined();
      expect(graph.nodes).toBeInstanceOf(Array);
      expect(graph.edges).toBeInstanceOf(Array);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it("should have valid node structure", async () => {
      const graph = await loadRoadmapGraph("electrician-bc");
      const firstNode = graph.nodes[0];

      expect(firstNode).toHaveProperty("id");
      expect(firstNode).toHaveProperty("position");
      expect(firstNode?.position).toHaveProperty("x");
      expect(firstNode?.position).toHaveProperty("y");
    });

    it("should have valid edge structure", async () => {
      const graph = await loadRoadmapGraph("electrician-bc");
      const firstEdge = graph.edges[0];

      expect(firstEdge).toHaveProperty("id");
      expect(firstEdge).toHaveProperty("source");
      expect(firstEdge).toHaveProperty("target");
    });
  });

  describe("loadNodeContent", () => {
    it("should load content for red-seal-construction node", async () => {
      const content = await loadNodeContent(
        "electrician-bc",
        "red-seal-construction",
      );

      expect(content).toBeDefined();
      expect(content.frontmatter).toBeDefined();
      expect(content.frontmatter.id).toBe("red-seal-construction");
      expect(content.frontmatter.type).toBe("terminal");
      expect(content.content).toBeDefined();
      expect(content.content.length).toBeGreaterThan(0);
    });

    it("should load content for red-seal-industrial node", async () => {
      const content = await loadNodeContent(
        "electrician-bc",
        "red-seal-industrial",
      );

      expect(content).toBeDefined();
      expect(content.frontmatter).toBeDefined();
      expect(content.frontmatter.id).toBe("red-seal-industrial");
      expect(content.frontmatter.type).toBe("terminal");
      expect(content.content).toBeDefined();
      expect(content.content.length).toBeGreaterThan(0);
    });

    it("should throw error for non-existent node", async () => {
      await expect(
        loadNodeContent("electrician-bc", "non-existent-node"),
      ).rejects.toThrow();
    });
  });

  describe("loadAllNodeContent", () => {
    it("should load all node content for electrician-bc", async () => {
      const contentMap = await loadAllNodeContent("electrician-bc");

      expect(contentMap).toBeInstanceOf(Map);
      expect(contentMap.size).toBeGreaterThan(0);
    });

    it("should have content for red-seal nodes", async () => {
      const contentMap = await loadAllNodeContent("electrician-bc");
      const redSealConstructionContent = contentMap.get(
        "red-seal-construction",
      );
      const redSealIndustrialContent = contentMap.get("red-seal-industrial");

      expect(redSealConstructionContent).toBeDefined();
      expect(redSealConstructionContent?.frontmatter.id).toBe(
        "red-seal-construction",
      );
      expect(redSealIndustrialContent).toBeDefined();
      expect(redSealIndustrialContent?.frontmatter.id).toBe(
        "red-seal-industrial",
      );
    });

    it("should have content for all nodes in graph", async () => {
      const [graph, contentMap] = await Promise.all([
        loadRoadmapGraph("electrician-bc"),
        loadAllNodeContent("electrician-bc"),
      ]);

      for (const node of graph.nodes) {
        expect(contentMap.has(node.id)).toBe(true);
      }
    });
  });

  describe("buildRoadmap", () => {
    it("should build complete roadmap with metadata, graph, and content", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      expect(roadmap).toBeDefined();
      expect(roadmap.metadata).toBeDefined();
      expect(roadmap.graph).toBeDefined();
      expect(roadmap.content).toBeDefined();

      expect(roadmap.metadata.id).toBe("electrician-bc");
      expect(roadmap.graph.nodes.length).toBeGreaterThan(0);
      expect(roadmap.content.size).toBeGreaterThan(0);
    });

    it("should have matching nodes between graph and content", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      for (const node of roadmap.graph.nodes) {
        expect(roadmap.content.has(node.id)).toBe(true);
      }
    });
  });

  describe("getAvailableRoadmaps", () => {
    it("should return list of available roadmaps", async () => {
      const roadmaps = await getAvailableRoadmaps();

      expect(roadmaps).toBeInstanceOf(Array);
      expect(roadmaps.length).toBeGreaterThan(0);
      expect(roadmaps).toContain("electrician-bc");
    });
  });
});
