import { describe, it, expect } from "vitest";
import {
  calculateNodeProgress,
  calculateMultipleNodeProgress,
  getDirectChildren,
  getDescendantChecklists,
} from "../progress-utils";
import type { GraphNode, NodeContent } from "@/data/types/roadmap";
import type { NodeStatus } from "../node-status";

describe("progress-utils", () => {
  // Test data setup
  const mockGraphNodes: GraphNode[] = [
    {
      id: "hub-1",
      position: { x: 0, y: 0 },
    },
    {
      id: "hub-1-resources",
      position: { x: 100, y: 100 },
      parentId: "hub-1",
    },
    {
      id: "hub-1-actions",
      position: { x: 200, y: 100 },
      parentId: "hub-1",
    },
    {
      id: "checklist-1",
      position: { x: 150, y: 200 },
      parentId: "hub-1-resources",
    },
    {
      id: "checklist-2",
      position: { x: 250, y: 200 },
      parentId: "hub-1-resources",
    },
    {
      id: "checklist-3",
      position: { x: 350, y: 200 },
      parentId: "hub-1-actions",
    },
    {
      id: "terminal-1",
      position: { x: 500, y: 0 },
    },
  ];

  const mockContentMap = new Map<string, NodeContent>([
    [
      "hub-1",
      {
        frontmatter: {
          id: "hub-1",
          type: "hub",
          title: "Hub 1",
          nodeType: "hub",
        },
        content: "Hub content",
        resources: [
          { label: "Resource 1", href: "https://example.com/1" },
          { label: "Resource 2", href: "https://example.com/2" },
        ],
      },
    ],
    [
      "hub-1-resources",
      {
        frontmatter: {
          id: "hub-1-resources",
          type: "category",
          title: "Resources",
          nodeType: "category",
        },
        content: "Resources content",
      },
    ],
    [
      "hub-1-actions",
      {
        frontmatter: {
          id: "hub-1-actions",
          type: "category",
          title: "Actions",
          nodeType: "category",
        },
        content: "Actions content",
      },
    ],
    [
      "checklist-1",
      {
        frontmatter: {
          id: "checklist-1",
          type: "checklist",
          title: "Checklist 1",
          nodeType: "checklist",
        },
        content: "Checklist 1 content",
      },
    ],
    [
      "checklist-2",
      {
        frontmatter: {
          id: "checklist-2",
          type: "checklist",
          title: "Checklist 2",
          nodeType: "checklist",
        },
        content: "Checklist 2 content",
      },
    ],
    [
      "checklist-3",
      {
        frontmatter: {
          id: "checklist-3",
          type: "checklist",
          title: "Checklist 3",
          nodeType: "checklist",
        },
        content: "Checklist 3 content",
      },
    ],
    [
      "terminal-1",
      {
        frontmatter: {
          id: "terminal-1",
          type: "terminal",
          title: "Terminal",
          nodeType: "terminal",
        },
        content: "Terminal content",
      },
    ],
  ]);

  describe("getDirectChildren", () => {
    it("should return direct children of a node", () => {
      const children = getDirectChildren("hub-1", mockGraphNodes);
      expect(children).toHaveLength(2);
      expect(children.map((n) => n.id)).toEqual([
        "hub-1-resources",
        "hub-1-actions",
      ]);
    });

    it("should return empty array for node with no children", () => {
      const children = getDirectChildren("terminal-1", mockGraphNodes);
      expect(children).toHaveLength(0);
    });

    it("should return empty array for non-existent node", () => {
      const children = getDirectChildren("non-existent", mockGraphNodes);
      expect(children).toHaveLength(0);
    });
  });

  describe("getDescendantChecklists", () => {
    it("should return all descendant checklist nodes recursively", () => {
      const checklists = getDescendantChecklists(
        "hub-1",
        mockGraphNodes,
        mockContentMap,
      );
      expect(checklists).toHaveLength(3);
      expect(checklists.map((n) => n.id)).toEqual([
        "checklist-1",
        "checklist-2",
        "checklist-3",
      ]);
    });

    it("should return direct checklist children", () => {
      const checklists = getDescendantChecklists(
        "hub-1-resources",
        mockGraphNodes,
        mockContentMap,
      );
      expect(checklists).toHaveLength(2);
      expect(checklists.map((n) => n.id)).toEqual([
        "checklist-1",
        "checklist-2",
      ]);
    });

    it("should return empty array for node with no checklist descendants", () => {
      const checklists = getDescendantChecklists(
        "terminal-1",
        mockGraphNodes,
        mockContentMap,
      );
      expect(checklists).toHaveLength(0);
    });
  });

  describe("calculateNodeProgress", () => {
    describe("hub nodes", () => {
      it("should count all descendant checklists", () => {
        const nodeStatuses: Record<string, NodeStatus> = {
          "checklist-1": "completed",
          "checklist-2": "in-progress",
          "checklist-3": "base",
        };

        const progress = calculateNodeProgress(
          "hub-1",
          "hub",
          nodeStatuses,
          mockGraphNodes,
          mockContentMap,
        );

        expect(progress).toEqual({
          completed: 1,
          total: 3,
          percentage: 33,
        });
      });

      it("should handle hub with no descendants", () => {
        const emptyHub: GraphNode = {
          id: "empty-hub",
          position: { x: 0, y: 0 },
        };

        const emptyContentMap = new Map<string, NodeContent>([
          [
            "empty-hub",
            {
              frontmatter: {
                id: "empty-hub",
                type: "hub",
                title: "Empty Hub",
                nodeType: "hub",
              },
              content: "Empty hub content",
            },
          ],
        ]);

        const progress = calculateNodeProgress(
          "empty-hub",
          "hub",
          {},
          [emptyHub],
          emptyContentMap,
        );

        expect(progress).toEqual({
          completed: 0,
          total: 0,
          percentage: 0,
        });
      });

      it("should handle all checklists completed", () => {
        const nodeStatuses: Record<string, NodeStatus> = {
          "checklist-1": "completed",
          "checklist-2": "completed",
          "checklist-3": "completed",
        };

        const progress = calculateNodeProgress(
          "hub-1",
          "hub",
          nodeStatuses,
          mockGraphNodes,
          mockContentMap,
        );

        expect(progress).toEqual({
          completed: 3,
          total: 3,
          percentage: 100,
        });
      });
    });

    describe("resources category nodes", () => {
      it("should count direct checklist children and parent resources", () => {
        const nodeStatuses: Record<string, NodeStatus> = {
          "checklist-1": "completed",
          "checklist-2": "base",
        };

        const progress = calculateNodeProgress(
          "hub-1-resources",
          "resources",
          nodeStatuses,
          mockGraphNodes,
          mockContentMap,
        );

        // Resources category nodes always include virtual resources from parent hub
        // 2 checklists + 2 parent resources = 4 total
        expect(progress).toEqual({
          completed: 1,
          total: 4,
          percentage: 25,
        });
      });

      it("should include virtual resource items from parent hub", () => {
        const nodeStatuses: Record<string, NodeStatus> = {
          "checklist-1": "completed",
          "checklist-2": "base",
          "resource-hub-1-0": "completed",
          "resource-hub-1-1": "base",
        };

        const progress = calculateNodeProgress(
          "hub-1-resources",
          "resources",
          nodeStatuses,
          mockGraphNodes,
          mockContentMap,
        );

        // 2 checklists + 2 virtual resources = 4 total
        // 1 completed checklist + 1 completed resource = 2 completed
        expect(progress).toEqual({
          completed: 2,
          total: 4,
          percentage: 50,
        });
      });

      it("should not double-count resources", () => {
        // This test verifies the fix for the duplicate code bug
        const nodeStatuses: Record<string, NodeStatus> = {
          "checklist-1": "completed",
          "checklist-2": "completed",
          "resource-hub-1-0": "completed",
          "resource-hub-1-1": "completed",
        };

        const progress = calculateNodeProgress(
          "hub-1-resources",
          "resources",
          nodeStatuses,
          mockGraphNodes,
          mockContentMap,
        );

        // Should be 4 total (2 checklists + 2 resources), not 6
        expect(progress?.total).toBe(4);
        expect(progress?.completed).toBe(4);
        expect(progress?.percentage).toBe(100);
      });

      it("should handle resources node without parent resources", () => {
        const nodeWithoutResources: GraphNode = {
          id: "hub-2-resources",
          position: { x: 0, y: 0 },
          parentId: "hub-2",
        };

        const contentMapWithoutResources = new Map<string, NodeContent>([
          [
            "hub-2",
            {
              frontmatter: {
                id: "hub-2",
                type: "hub",
                title: "Hub 2",
                nodeType: "hub",
              },
              content: "Hub 2 content",
              // No resources field
            },
          ],
          [
            "hub-2-resources",
            {
              frontmatter: {
                id: "hub-2-resources",
                type: "category",
                title: "Resources",
                nodeType: "category",
              },
              content: "Resources content",
            },
          ],
        ]);

        const progress = calculateNodeProgress(
          "hub-2-resources",
          "resources",
          {},
          [nodeWithoutResources],
          contentMapWithoutResources,
        );

        expect(progress).toEqual({
          completed: 0,
          total: 0,
          percentage: 0,
        });
      });
    });

    describe("actions category nodes", () => {
      it("should count direct checklist children", () => {
        const nodeStatuses: Record<string, NodeStatus> = {
          "checklist-3": "completed",
        };

        const progress = calculateNodeProgress(
          "hub-1-actions",
          "actions",
          nodeStatuses,
          mockGraphNodes,
          mockContentMap,
        );

        expect(progress).toEqual({
          completed: 1,
          total: 1,
          percentage: 100,
        });
      });
    });

    describe("roadblocks category nodes", () => {
      it("should count direct checklist children", () => {
        const roadblockNode: GraphNode = {
          id: "hub-1-roadblocks",
          position: { x: 300, y: 100 },
          parentId: "hub-1",
        };

        const roadblockContentMap = new Map(mockContentMap);
        roadblockContentMap.set("hub-1-roadblocks", {
          frontmatter: {
            id: "hub-1-roadblocks",
            type: "category",
            title: "Roadblocks",
            nodeType: "category",
          },
          content: "Roadblocks content",
        });

        const progress = calculateNodeProgress(
          "hub-1-roadblocks",
          "roadblocks",
          {},
          [...mockGraphNodes, roadblockNode],
          roadblockContentMap,
        );

        expect(progress).toEqual({
          completed: 0,
          total: 0,
          percentage: 0,
        });
      });
    });

    describe("non-trackable nodes", () => {
      it("should return null for terminal nodes", () => {
        const progress = calculateNodeProgress(
          "terminal-1",
          "terminal",
          {},
          mockGraphNodes,
          mockContentMap,
        );

        expect(progress).toBeNull();
      });

      it("should return null for checklist nodes", () => {
        const progress = calculateNodeProgress(
          "checklist-1",
          "checklist",
          {},
          mockGraphNodes,
          mockContentMap,
        );

        expect(progress).toBeNull();
      });

      it("should return null for unknown node types", () => {
        const progress = calculateNodeProgress(
          "some-node",
          "unknown-type",
          {},
          mockGraphNodes,
          mockContentMap,
        );

        expect(progress).toBeNull();
      });
    });

    describe("edge cases", () => {
      it("should handle empty node statuses", () => {
        const progress = calculateNodeProgress(
          "hub-1",
          "hub",
          {},
          mockGraphNodes,
          mockContentMap,
        );

        expect(progress).toEqual({
          completed: 0,
          total: 3,
          percentage: 0,
        });
      });

      it("should handle missing content in contentMap", () => {
        const emptyContentMap = new Map<string, NodeContent>();

        const progress = calculateNodeProgress(
          "hub-1",
          "hub",
          {},
          mockGraphNodes,
          emptyContentMap,
        );

        // Should still work, just won't find any checklists
        expect(progress).toEqual({
          completed: 0,
          total: 0,
          percentage: 0,
        });
      });

      it("should round percentage correctly", () => {
        const nodeStatuses: Record<string, NodeStatus> = {
          "checklist-1": "completed",
          "checklist-2": "base",
          "checklist-3": "base",
        };

        const progress = calculateNodeProgress(
          "hub-1",
          "hub",
          nodeStatuses,
          mockGraphNodes,
          mockContentMap,
        );

        // 1/3 = 33.333... should round to 33
        expect(progress?.percentage).toBe(33);
      });

      it("should treat in-progress nodes as not completed", () => {
        const nodeStatuses: Record<string, NodeStatus> = {
          "checklist-1": "in-progress",
          "checklist-2": "in-progress",
          "checklist-3": "completed",
        };

        const progress = calculateNodeProgress(
          "hub-1",
          "hub",
          nodeStatuses,
          mockGraphNodes,
          mockContentMap,
        );

        expect(progress).toEqual({
          completed: 1,
          total: 3,
          percentage: 33,
        });
      });
    });
  });

  describe("calculateMultipleNodeProgress", () => {
    it("should calculate progress for multiple nodes", () => {
      const nodeStatuses: Record<string, NodeStatus> = {
        "checklist-1": "completed",
        "checklist-2": "base",
        "checklist-3": "completed",
      };

      const progressMap = calculateMultipleNodeProgress(
        ["hub-1", "hub-1-resources", "hub-1-actions"],
        nodeStatuses,
        mockGraphNodes,
        mockContentMap,
      );

      expect(progressMap["hub-1"]).toEqual({
        completed: 2,
        total: 3,
        percentage: 67,
      });

      // Resources node includes 2 checklists + 2 parent resources = 4 total
      expect(progressMap["hub-1-resources"]).toEqual({
        completed: 1,
        total: 4,
        percentage: 25,
      });

      expect(progressMap["hub-1-actions"]).toEqual({
        completed: 1,
        total: 1,
        percentage: 100,
      });
    });

    it("should handle empty node list", () => {
      const progressMap = calculateMultipleNodeProgress(
        [],
        {},
        mockGraphNodes,
        mockContentMap,
      );

      expect(progressMap).toEqual({});
    });

    it("should skip nodes without content", () => {
      const progressMap = calculateMultipleNodeProgress(
        ["non-existent-node"],
        {},
        mockGraphNodes,
        mockContentMap,
      );

      expect(progressMap).toEqual({});
    });

    it("should include null for non-trackable nodes", () => {
      const progressMap = calculateMultipleNodeProgress(
        ["terminal-1", "checklist-1"],
        {},
        mockGraphNodes,
        mockContentMap,
      );

      expect(progressMap["terminal-1"]).toBeNull();
      expect(progressMap["checklist-1"]).toBeNull();
    });
  });
});
