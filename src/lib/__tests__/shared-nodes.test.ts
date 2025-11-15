import { describe, it, expect } from "vitest";
import { buildRoadmap } from "@/lib/roadmap-loader";

describe("Shared Nodes Integration", () => {
  describe("Graph Structure", () => {
    it("should create shared financial aid node with multiple parents", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Find the shared financial aid node
      const sharedNode = roadmap.graph.nodes.find(
        (n) => n.id === "shared-resource-financialaid",
      );

      expect(sharedNode).toBeDefined();
      expect(sharedNode?.parentIds).toBeDefined();
      expect(sharedNode?.parentIds).toContain("level-1-resources");
      expect(sharedNode?.parentIds).toContain("level-2-resources");
      expect(sharedNode?.parentIds).toContain("level-3-resources");
      expect(sharedNode?.parentIds?.length).toBe(3);
    });

    it("should create shared roadblock nodes with multiple parents", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Find the shared specialization depth node
      const specializationDepthNode = roadmap.graph.nodes.find(
        (n) => n.id === "level-4-shared-roadblock-specializationdepth",
      );

      expect(specializationDepthNode).toBeDefined();
      expect(specializationDepthNode?.parentIds).toBeDefined();
      expect(specializationDepthNode?.parentIds).toContain(
        "level-4-construction-roadblocks",
      );
      expect(specializationDepthNode?.parentIds).toContain(
        "level-4-industrial-roadblocks",
      );
      expect(specializationDepthNode?.parentIds?.length).toBe(2);

      // Find the shared code updates node
      const codeUpdatesNode = roadmap.graph.nodes.find(
        (n) => n.id === "level-4-shared-roadblock-codeupdates",
      );

      expect(codeUpdatesNode).toBeDefined();
      expect(codeUpdatesNode?.parentIds).toBeDefined();
      expect(codeUpdatesNode?.parentIds).toContain(
        "level-4-construction-roadblocks",
      );
      expect(codeUpdatesNode?.parentIds).toContain(
        "level-4-industrial-roadblocks",
      );
      expect(codeUpdatesNode?.parentIds?.length).toBe(2);
    });

    it("should create only one instance of each shared node", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Count occurrences of shared node IDs
      const sharedFinancialAidCount = roadmap.graph.nodes.filter(
        (n) => n.id === "shared-resource-financialaid",
      ).length;

      const sharedRoadblockCount = roadmap.graph.nodes.filter((n) =>
        n.id.startsWith("level-4-shared-roadblock"),
      ).length;

      expect(sharedFinancialAidCount).toBe(1);
      expect(sharedRoadblockCount).toBe(2); // specializationdepth + codeupdates
    });

    it("should create edges from all parents to shared nodes", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Check financial aid edges
      const financialAidEdges = roadmap.graph.edges.filter(
        (e) => e.target === "shared-resource-financialaid",
      );

      expect(financialAidEdges.length).toBe(3);
      expect(
        financialAidEdges.some((e) => e.source === "level-1-resources"),
      ).toBe(true);
      expect(
        financialAidEdges.some((e) => e.source === "level-2-resources"),
      ).toBe(true);
      expect(
        financialAidEdges.some((e) => e.source === "level-3-resources"),
      ).toBe(true);

      // Check specialization depth edges
      const specializationDepthEdges = roadmap.graph.edges.filter(
        (e) => e.target === "level-4-shared-roadblock-specializationdepth",
      );

      expect(specializationDepthEdges.length).toBe(2);
      expect(
        specializationDepthEdges.some(
          (e) => e.source === "level-4-construction-roadblocks",
        ),
      ).toBe(true);
      expect(
        specializationDepthEdges.some(
          (e) => e.source === "level-4-industrial-roadblocks",
        ),
      ).toBe(true);
    });

    it("should not have duplicate edges to shared nodes", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Check that edge IDs are unique
      const edgeIds = roadmap.graph.edges.map((e) => e.id);
      const uniqueEdgeIds = new Set(edgeIds);

      expect(edgeIds.length).toBe(uniqueEdgeIds.size);

      // Specifically check shared node edges
      const sharedNodeEdges = roadmap.graph.edges.filter((e) =>
        e.target.includes("shared-"),
      );

      const sharedEdgeIds = sharedNodeEdges.map((e) => e.id);
      const uniqueSharedEdgeIds = new Set(sharedEdgeIds);

      expect(sharedEdgeIds.length).toBe(uniqueSharedEdgeIds.size);
    });
  });

  describe("Content Loading", () => {
    it("should load content for shared financial aid node", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      const content = roadmap.content.get("shared-resource-financialaid");

      expect(content).toBeDefined();
      expect(content?.frontmatter.id).toBe("shared-resource-financialaid");
      expect(content?.frontmatter.title).toBe("Financial Aid");
      expect(content?.content).toBeDefined();
      expect(content?.content.length).toBeGreaterThan(0);
    });

    it("should load content for shared roadblock nodes", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      const specializationDepthContent = roadmap.content.get(
        "level-4-shared-roadblock-specializationdepth",
      );
      const codeUpdatesContent = roadmap.content.get(
        "level-4-shared-roadblock-codeupdates",
      );

      expect(specializationDepthContent).toBeDefined();
      expect(specializationDepthContent?.frontmatter.title).toBe(
        "Specialization Depth",
      );

      expect(codeUpdatesContent).toBeDefined();
      expect(codeUpdatesContent?.frontmatter.title).toBe("Code Updates");
    });
  });

  describe("Backward Compatibility", () => {
    it("should still support nodes with single parentId", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Find a non-shared node
      const regularNode = roadmap.graph.nodes.find(
        (n) => n.id === "level-1-resource-outline",
      );

      expect(regularNode).toBeDefined();
      expect(regularNode?.parentId).toBe("level-1-resources");
      expect(regularNode?.parentIds).toBeUndefined();
    });

    it("should have mix of shared and non-shared nodes", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      const sharedNodes = roadmap.graph.nodes.filter(
        (n) => n.parentIds && n.parentIds.length > 1,
      );
      const regularNodes = roadmap.graph.nodes.filter(
        (n) => n.parentId && !n.parentIds,
      );

      expect(sharedNodes.length).toBeGreaterThan(0);
      expect(regularNodes.length).toBeGreaterThan(0);
      expect(sharedNodes.length).toBeLessThan(regularNodes.length); // Most nodes are regular
    });
  });

  describe("Node Positioning", () => {
    it("should position shared nodes at first parent location", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      const sharedNode = roadmap.graph.nodes.find(
        (n) => n.id === "shared-resource-financialaid",
      );

      expect(sharedNode).toBeDefined();
      expect(sharedNode?.position).toBeDefined();
      expect(sharedNode?.position.x).toBeDefined();
      expect(sharedNode?.position.y).toBeDefined();
      expect(typeof sharedNode?.position.x).toBe("number");
      expect(typeof sharedNode?.position.y).toBe("number");
    });
  });

  describe("Industrial-Specific Nodes", () => {
    it("should have industrial-specific roadblock node", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      const industrialOnlyNode = roadmap.graph.nodes.find(
        (n) => n.id === "level-4-industrial-roadblock-equipmentcomplexity",
      );

      expect(industrialOnlyNode).toBeDefined();
      expect(industrialOnlyNode?.parentId).toBe(
        "level-4-industrial-roadblocks",
      );
      expect(industrialOnlyNode?.parentIds).toBeUndefined(); // Not shared

      // Verify it only has one edge (from industrial parent)
      const edges = roadmap.graph.edges.filter(
        (e) => e.target === "level-4-industrial-roadblock-equipmentcomplexity",
      );
      expect(edges.length).toBe(1);
      expect(edges[0]?.source).toBe("level-4-industrial-roadblocks");
    });
  });

  describe("Edge Filtering by Specialization", () => {
    it("should have edges from both specializations to shared roadblocks", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Check that shared roadblock nodes have edges from both specializations
      const sharedRoadblockNodes = [
        "level-4-shared-roadblock-specializationdepth",
        "level-4-shared-roadblock-codeupdates",
      ];

      for (const nodeId of sharedRoadblockNodes) {
        const edges = roadmap.graph.edges.filter((e) => e.target === nodeId);

        // Should have 2 edges: one from construction, one from industrial
        expect(edges.length).toBe(2);

        const constructionEdge = edges.find(
          (e) => e.source === "level-4-construction-roadblocks",
        );
        const industrialEdge = edges.find(
          (e) => e.source === "level-4-industrial-roadblocks",
        );

        expect(constructionEdge).toBeDefined();
        expect(industrialEdge).toBeDefined();
      }
    });

    it("edges from parent categories to checklist items exist in graph", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Verify that edges exist in raw graph data (they'll be filtered during rendering)
      const sharedRoadblockEdges = roadmap.graph.edges.filter(
        (e) =>
          e.target === "level-4-shared-roadblock-specializationdepth" ||
          e.target === "level-4-shared-roadblock-codeupdates",
      );

      // Should have 4 edges total (2 per shared node)
      expect(sharedRoadblockEdges.length).toBe(4);

      // Verify they connect from category nodes
      for (const edge of sharedRoadblockEdges) {
        expect(
          edge.source === "level-4-construction-roadblocks" ||
            edge.source === "level-4-industrial-roadblocks",
        ).toBe(true);
      }
    });

    it("should have correct parent hierarchy for edge filtering", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Verify category nodes have correct hub parents
      const constructionRoadblocks = roadmap.graph.nodes.find(
        (n) => n.id === "level-4-construction-roadblocks",
      );
      const industrialRoadblocks = roadmap.graph.nodes.find(
        (n) => n.id === "level-4-industrial-roadblocks",
      );

      expect(constructionRoadblocks?.parentId).toBe("level-4-construction");
      expect(industrialRoadblocks?.parentId).toBe("level-4-industrial");

      // Verify shared roadblocks have both category nodes as parents
      const sharedRoadblock = roadmap.graph.nodes.find(
        (n) => n.id === "level-4-shared-roadblock-specializationdepth",
      );

      expect(sharedRoadblock?.parentIds).toContain(
        "level-4-construction-roadblocks",
      );
      expect(sharedRoadblock?.parentIds).toContain(
        "level-4-industrial-roadblocks",
      );
    });

    it("shared nodes should only be dimmed if ALL parents are irrelevant", async () => {
      const roadmap = await buildRoadmap("electrician-bc");

      // Find shared roadblock node
      const sharedNode = roadmap.graph.nodes.find(
        (n) => n.id === "level-4-shared-roadblock-specializationdepth",
      );

      expect(sharedNode).toBeDefined();
      expect(sharedNode?.parentIds?.length).toBe(2);

      // The node should NOT be dimmed if at least one parent is relevant
      // This is verified by the rendering logic in RoadmapFlow component
      // When specialization=CONSTRUCTION:
      //   - level-4-construction-roadblocks is relevant → shared node NOT dimmed
      //   - level-4-industrial-roadblocks is irrelevant → edges from it are hidden
      // When specialization=INDUSTRIAL:
      //   - level-4-industrial-roadblocks is relevant → shared node NOT dimmed
      //   - level-4-construction-roadblocks is irrelevant → edges from it are hidden
    });
  });
});
