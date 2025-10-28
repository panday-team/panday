import { describe, it, expect } from "vitest";
import type {
  RoadmapMetadata,
  RoadmapGraph,
  NodeContentFrontmatter,
  NodeContent,
  Roadmap,
  GraphNode,
  GraphEdge,
} from "../roadmap";
import { Position } from "@xyflow/react";

describe("Roadmap Types", () => {
  describe("RoadmapMetadata", () => {
    it("should accept valid metadata structure", () => {
      const metadata: RoadmapMetadata = {
        id: "electrician-bc",
        title: "Construction Electrician",
        province: "British Columbia",
        industry: "Skilled Trades",
        version: "1.0.0",
        lastUpdated: "2025-01-01",
      };

      expect(metadata.id).toBe("electrician-bc");
      expect(metadata.title).toBe("Construction Electrician");
    });
  });

  describe("GraphNode", () => {
    it("should accept node with required fields", () => {
      const node: GraphNode = {
        id: "foundation-program",
        position: { x: 100, y: 200 },
      };

      expect(node.id).toBe("foundation-program");
      expect(node.position.x).toBe(100);
      expect(node.position.y).toBe(200);
    });

    it("should accept node with optional fields", () => {
      const node: GraphNode = {
        id: "level-1-checklist-1",
        position: { x: 150, y: 250 },
        parentId: "level-1",
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };

      expect(node.parentId).toBe("level-1");
      expect(node.sourcePosition).toBe(Position.Right);
      expect(node.targetPosition).toBe(Position.Left);
    });
  });

  describe("GraphEdge", () => {
    it("should accept edge with required fields", () => {
      const edge: GraphEdge = {
        id: "e1-2",
        source: "node-1",
        target: "node-2",
      };

      expect(edge.source).toBe("node-1");
      expect(edge.target).toBe("node-2");
    });

    it("should accept edge with optional fields", () => {
      const edge: GraphEdge = {
        id: "e1-2",
        source: "node-1",
        target: "node-2",
        sourceHandle: "right",
        targetHandle: "left",
        type: "bezier",
      };

      expect(edge.sourceHandle).toBe("right");
      expect(edge.targetHandle).toBe("left");
      expect(edge.type).toBe("bezier");
    });
  });

  describe("RoadmapGraph", () => {
    it("should accept valid graph structure", () => {
      const graph: RoadmapGraph = {
        nodes: [
          { id: "node-1", position: { x: 0, y: 0 } },
          { id: "node-2", position: { x: 100, y: 100 } },
        ],
        edges: [{ id: "e1-2", source: "node-1", target: "node-2" }],
      };

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
    });
  });

  describe("NodeContentFrontmatter", () => {
    it("should accept minimal frontmatter", () => {
      const frontmatter: NodeContentFrontmatter = {
        id: "foundation-program",
        type: "hub",
        title: "Foundation Program",
        nodeType: "hub",
      };

      expect(frontmatter.id).toBe("foundation-program");
      expect(frontmatter.type).toBe("hub");
    });

    it("should accept all node types", () => {
      const types: NodeContentFrontmatter["type"][] = [
        "hub",
        "requirement",
        "portal",
        "checkpoint",
        "terminal",
        "checklist",
      ];

      types.forEach((type) => {
        const frontmatter: NodeContentFrontmatter = {
          id: `${type}-node`,
          type,
          title: `${type} Node`,
          nodeType: type,
        };
        expect(frontmatter.type).toBe(type);
      });
    });

    it("should accept optional fields", () => {
      const frontmatter: NodeContentFrontmatter = {
        id: "level-1",
        type: "requirement",
        title: "Level 1 Training",
        duration: "8 weeks",
        badge: "Required",
        subtitle: "Technical Training",
        glow: true,
        labelPosition: "top",
        showLabelDot: true,
        nodeType: "requirement",
      };

      expect(frontmatter.duration).toBe("8 weeks");
      expect(frontmatter.badge).toBe("Required");
      expect(frontmatter.glow).toBe(true);
    });
  });

  describe("NodeContent", () => {
    it("should combine frontmatter and content", () => {
      const nodeContent: NodeContent = {
        frontmatter: {
          id: "foundation-program",
          type: "hub",
          title: "Foundation Program",
          nodeType: "hub",
        },
        content: "This is the foundation program description.",
      };

      expect(nodeContent.frontmatter.id).toBe("foundation-program");
      expect(nodeContent.content).toContain("foundation program");
    });

    it("should include optional parsed sections", () => {
      const nodeContent: NodeContent = {
        frontmatter: {
          id: "level-1",
          type: "requirement",
          title: "Level 1",
          nodeType: "requirement",
        },
        content: "Content here",
        eligibility: ["Must be 18 years old", "High school diploma"],
        benefits: ["Earn while you learn", "Industry certification"],
        outcomes: ["Complete Level 1 training"],
        resources: [
          { label: "Register", href: "https://example.com" },
          { label: "Guide", href: "https://example.com/guide" },
        ],
      };

      expect(nodeContent.eligibility).toHaveLength(2);
      expect(nodeContent.benefits).toHaveLength(2);
      expect(nodeContent.outcomes).toHaveLength(1);
      expect(nodeContent.resources).toHaveLength(2);
    });
  });

  describe("Roadmap", () => {
    it("should combine metadata, graph, and content", () => {
      const roadmap: Roadmap = {
        metadata: {
          id: "electrician-bc",
          title: "Electrician",
          province: "BC",
          industry: "Trades",
          version: "1.0.0",
          lastUpdated: "2025-01-01",
        },
        graph: {
          nodes: [{ id: "node-1", position: { x: 0, y: 0 } }],
          edges: [],
        },
        content: new Map([
          [
            "node-1",
            {
              frontmatter: {
                id: "node-1",
                type: "hub",
                title: "Start",
                nodeType: "hub",
              },
              content: "Starting point",
            },
          ],
        ]),
      };

      expect(roadmap.metadata.id).toBe("electrician-bc");
      expect(roadmap.graph.nodes).toHaveLength(1);
      expect(roadmap.content.size).toBe(1);
      expect(roadmap.content.get("node-1")?.frontmatter.title).toBe("Start");
    });
  });
});
