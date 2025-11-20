import { describe, it, expect } from "vitest";
import {
  findCustomNodePosition,
  calculateCustomNodePositions,
} from "../custom-node-positioning";

describe("custom-node-positioning", () => {
  describe("findCustomNodePosition", () => {
    it("should place node at minimum distance from parent", () => {
      const parentPos = { x: 0, y: 0 };
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];
      const position = findCustomNodePosition(parentPos, existingNodes, 0);

      // Should be at least MIN_DISTANCE (280px) away
      const distance = Math.sqrt(position.x ** 2 + position.y ** 2);
      expect(distance).toBeGreaterThanOrEqual(280);
    });

    it("should avoid collisions with existing nodes", () => {
      const parentPos = { x: 0, y: 0 };
      const existingNodes = [
        { id: "existing-1", position: { x: 280, y: 0 } }, // Right position occupied
      ];

      const position = findCustomNodePosition(parentPos, existingNodes, 0);

      // Should not be at the occupied position
      const distanceFromExisting = Math.sqrt(
        (position.x - 280) ** 2 + position.y ** 2,
      );
      expect(distanceFromExisting).toBeGreaterThan(60); // COLLISION_PADDING
    });

    it("should offset multiple siblings by angle", () => {
      const parentPos = { x: 100, y: 100 };
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const pos1 = findCustomNodePosition(parentPos, existingNodes, 0);
      const pos2 = findCustomNodePosition(parentPos, existingNodes, 1);
      const pos3 = findCustomNodePosition(parentPos, existingNodes, 2);

      // Each should be at different angles
      const angle1 = Math.atan2(pos1.y - 100, pos1.x - 100);
      const angle2 = Math.atan2(pos2.y - 100, pos2.x - 100);
      const angle3 = Math.atan2(pos3.y - 100, pos3.x - 100);

      expect(angle1).not.toBe(angle2);
      expect(angle2).not.toBe(angle3);
    });

    it("should try increasing radii if collisions occur", () => {
      const parentPos = { x: 0, y: 0 };
      // Fill up first radius (280px) with existing nodes
      const existingNodes = Array.from({ length: 8 }, (_, i) => ({
        id: `node-${i}`,
        position: {
          x: 280 * Math.cos((i * Math.PI) / 4),
          y: 280 * Math.sin((i * Math.PI) / 4),
        },
      }));

      const position = findCustomNodePosition(parentPos, existingNodes, 0);

      // Should be placed at a larger radius (400px or 520px)
      const distance = Math.sqrt(position.x ** 2 + position.y ** 2);
      expect(distance).toBeGreaterThan(350); // Beyond first radius
    });
  });

  describe("calculateCustomNodePositions - Single Parent", () => {
    it("should position custom nodes around single parent", () => {
      const customNodes = [
        { id: "custom-1", parentId: "parent-a" },
        { id: "custom-2", parentId: "parent-a" },
      ];

      const parentPositions = new Map([["parent-a", { x: 0, y: 0 }]]);
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      expect(positions.size).toBe(2);
      expect(positions.has("custom-1")).toBe(true);
      expect(positions.has("custom-2")).toBe(true);

      const pos1 = positions.get("custom-1")!;
      const pos2 = positions.get("custom-2")!;

      // Both should be around parent-a at minimum distance
      const dist1 = Math.sqrt(pos1.x ** 2 + pos1.y ** 2);
      const dist2 = Math.sqrt(pos2.x ** 2 + pos2.y ** 2);

      expect(dist1).toBeGreaterThanOrEqual(280);
      expect(dist2).toBeGreaterThanOrEqual(280);
    });

    it("should avoid collisions between siblings", () => {
      const customNodes = [
        { id: "custom-1", parentId: "parent-a" },
        { id: "custom-2", parentId: "parent-a" },
        { id: "custom-3", parentId: "parent-a" },
      ];

      const parentPositions = new Map([["parent-a", { x: 0, y: 0 }]]);
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      const pos1 = positions.get("custom-1")!;
      const pos2 = positions.get("custom-2")!;
      const pos3 = positions.get("custom-3")!;

      // Check distances between siblings
      const dist12 = Math.sqrt((pos2.x - pos1.x) ** 2 + (pos2.y - pos1.y) ** 2);
      const dist23 = Math.sqrt((pos3.x - pos2.x) ** 2 + (pos3.y - pos2.y) ** 2);
      const dist13 = Math.sqrt((pos3.x - pos1.x) ** 2 + (pos3.y - pos1.y) ** 2);

      // Should have reasonable spacing (at least collision padding)
      expect(dist12).toBeGreaterThan(60);
      expect(dist23).toBeGreaterThan(60);
      expect(dist13).toBeGreaterThan(60);
    });
  });

  describe("calculateCustomNodePositions - Multi-Parent (Centroid)", () => {
    it("should position multi-parent node at centroid of parents", () => {
      const customNodes = [
        { id: "custom-1", parentId: "parent-a,parent-b" }, // Multi-parent
      ];

      const parentPositions = new Map([
        ["parent-a", { x: 0, y: 0 }],
        ["parent-b", { x: 200, y: 0 }],
      ]);
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      const pos = positions.get("custom-1")!;

      // Centroid of (0,0) and (200,0) is (100,0)
      // Node should be positioned around (100,0)
      const centroid = { x: 100, y: 0 };
      const distanceFromCentroid = Math.sqrt(
        (pos.x - centroid.x) ** 2 + (pos.y - centroid.y) ** 2,
      );

      // Should be within reasonable range of centroid (MIN_DISTANCE ± some tolerance)
      expect(distanceFromCentroid).toBeGreaterThan(200); // At least some distance
      expect(distanceFromCentroid).toBeLessThan(500); // But not too far
    });

    it("should handle three parents (triangle centroid)", () => {
      const customNodes = [
        { id: "custom-1", parentId: "parent-a,parent-b,parent-c" },
      ];

      const parentPositions = new Map([
        ["parent-a", { x: 0, y: 0 }],
        ["parent-b", { x: 300, y: 0 }],
        ["parent-c", { x: 150, y: 260 }], // Roughly equilateral triangle
      ]);
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      const pos = positions.get("custom-1")!;

      // Centroid of triangle: ((0+300+150)/3, (0+0+260)/3) = (150, 86.67)
      const centroid = { x: 150, y: 86.67 };
      const distanceFromCentroid = Math.sqrt(
        (pos.x - centroid.x) ** 2 + (pos.y - centroid.y) ** 2,
      );

      // Should be positioned around the centroid
      expect(distanceFromCentroid).toBeGreaterThan(100);
      expect(distanceFromCentroid).toBeLessThan(600);
    });

    it("should handle missing parent positions gracefully", () => {
      const customNodes = [
        { id: "custom-1", parentId: "parent-a,parent-missing" },
      ];

      const parentPositions = new Map([
        ["parent-a", { x: 0, y: 0 }],
        // parent-missing not in map
      ]);
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      // Should still position the node (using only parent-a)
      expect(positions.has("custom-1")).toBe(true);
      const pos = positions.get("custom-1")!;
      expect(pos.x).toBeDefined();
      expect(pos.y).toBeDefined();
    });
  });

  describe("calculateCustomNodePositions - Mixed Scenarios", () => {
    it("should handle mix of single-parent and multi-parent nodes", () => {
      const customNodes = [
        { id: "custom-1", parentId: "parent-a" }, // Single parent
        { id: "custom-2", parentId: "parent-a,parent-b" }, // Multi-parent
        { id: "custom-3", parentId: "parent-b" }, // Single parent
      ];

      const parentPositions = new Map([
        ["parent-a", { x: 0, y: 0 }],
        ["parent-b", { x: 400, y: 0 }],
      ]);
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      expect(positions.size).toBe(3);

      // custom-1 should be near parent-a
      const pos1 = positions.get("custom-1")!;
      const dist1 = Math.sqrt(pos1.x ** 2 + pos1.y ** 2);
      expect(dist1).toBeGreaterThanOrEqual(280);
      expect(dist1).toBeLessThan(600);

      // custom-2 should be near centroid (200, 0)
      const pos2 = positions.get("custom-2")!;
      const distToCentroid = Math.sqrt((pos2.x - 200) ** 2 + pos2.y ** 2);
      expect(distToCentroid).toBeGreaterThan(100);

      // custom-3 should be near parent-b
      const pos3 = positions.get("custom-3")!;
      const dist3 = Math.sqrt((pos3.x - 400) ** 2 + pos3.y ** 2);
      expect(dist3).toBeGreaterThanOrEqual(280);
      expect(dist3).toBeLessThan(600);
    });

    it("should respect existing node positions when placing custom nodes", () => {
      const customNodes = [{ id: "custom-1", parentId: "parent-a" }];

      const parentPositions = new Map([["parent-a", { x: 0, y: 0 }]]);

      // Existing hub/checklist nodes around parent-a
      const existingNodes = [
        { id: "hub-1", position: { x: 280, y: 0 } },
        { id: "checklist-1", position: { x: 198, y: 198 } }, // 45 degrees
      ];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      const pos = positions.get("custom-1")!;

      // Should not collide with existing nodes
      const distToHub = Math.sqrt((pos.x - 280) ** 2 + pos.y ** 2);
      const distToChecklist = Math.sqrt(
        (pos.x - 198) ** 2 + (pos.y - 198) ** 2,
      );

      expect(distToHub).toBeGreaterThan(60);
      expect(distToChecklist).toBeGreaterThan(60);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty custom nodes array", () => {
      const customNodes: Array<{ id: string; parentId: string }> = [];
      const parentPositions = new Map([["parent-a", { x: 0, y: 0 }]]);
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      expect(positions.size).toBe(0);
    });

    it("should handle node with no valid parent positions", () => {
      const customNodes = [{ id: "custom-1", parentId: "nonexistent" }];
      const parentPositions = new Map<string, { x: number; y: number }>();
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      // Should not add position for orphaned node
      expect(positions.has("custom-1")).toBe(false);
    });

    it("should handle extremely close parent positions (collapse scenario)", () => {
      const customNodes = [{ id: "custom-1", parentId: "parent-a,parent-b" }];

      // Parents very close together (should still calculate centroid)
      const parentPositions = new Map([
        ["parent-a", { x: 100, y: 100 }],
        ["parent-b", { x: 105, y: 100 }], // Only 5px apart
      ]);
      const existingNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const positions = calculateCustomNodePositions(
        customNodes,
        parentPositions,
        existingNodes,
      );

      const pos = positions.get("custom-1")!;
      expect(pos).toBeDefined();

      // Centroid should be around (102.5, 100)
      const expectedCentroid = { x: 102.5, y: 100 };
      const distFromCentroid = Math.sqrt(
        (pos.x - expectedCentroid.x) ** 2 + (pos.y - expectedCentroid.y) ** 2,
      );

      expect(distFromCentroid).toBeGreaterThan(200); // Minimum distance
    });
  });
});
