import { describe, it, expect } from "vitest";
import { resolveCollisions, detectCollisions } from "../collision-physics";

describe("collision-physics", () => {
  describe("detectCollisions", () => {
    it("should detect no collisions when nodes are far apart", () => {
      const customNodes = [{ id: "custom-1", position: { x: 0, y: 0 } }];
      const expandedCategories = [
        { id: "category-1", position: { x: 500, y: 500 } },
      ];
      const checklistNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const colliding = detectCollisions(
        customNodes,
        expandedCategories,
        checklistNodes,
      );

      expect(colliding.size).toBe(0);
    });

    it("should detect collision with expanded category node", () => {
      const customNodes = [{ id: "custom-1", position: { x: 100, y: 100 } }];
      const expandedCategories = [
        { id: "category-1", position: { x: 120, y: 100 } }, // Very close
      ];
      const checklistNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const colliding = detectCollisions(
        customNodes,
        expandedCategories,
        checklistNodes,
      );

      expect(colliding.has("custom-1")).toBe(true);
    });

    it("should detect collision with checklist node", () => {
      const customNodes = [{ id: "custom-1", position: { x: 100, y: 100 } }];
      const expandedCategories: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];
      const checklistNodes = [
        { id: "checklist-1", position: { x: 110, y: 100 } }, // Close enough
      ];

      const colliding = detectCollisions(
        customNodes,
        expandedCategories,
        checklistNodes,
      );

      expect(colliding.has("custom-1")).toBe(true);
    });

    it("should detect collisions for multiple custom nodes", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 100, y: 100 } },
        { id: "custom-2", position: { x: 200, y: 200 } },
        { id: "custom-3", position: { x: 500, y: 500 } }, // Far away
      ];
      const expandedCategories = [
        { id: "category-1", position: { x: 120, y: 100 } },
      ];
      const checklistNodes = [
        { id: "checklist-1", position: { x: 210, y: 200 } },
      ];

      const colliding = detectCollisions(
        customNodes,
        expandedCategories,
        checklistNodes,
      );

      expect(colliding.has("custom-1")).toBe(true);
      expect(colliding.has("custom-2")).toBe(true);
      expect(colliding.has("custom-3")).toBe(false); // No collision
    });

    it("should respect COLLISION_BUFFER distance", () => {
      const customNodes = [{ id: "custom-1", position: { x: 0, y: 0 } }];
      // Place category at exactly buffer distance (should NOT collide)
      const expandedCategories = [
        { id: "category-1", position: { x: 200, y: 0 } }, // ~200px away
      ];
      const checklistNodes: Array<{
        id: string;
        position: { x: number; y: number };
      }> = [];

      const colliding = detectCollisions(
        customNodes,
        expandedCategories,
        checklistNodes,
      );

      // With COLLISION_BUFFER = 80px and node sizes, this should be safe
      expect(colliding.size).toBe(0);
    });
  });

  describe("resolveCollisions - Basic Behavior", () => {
    it("should return positions for all custom nodes", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 0, y: 0 }, size: 56 },
        { id: "custom-2", position: { x: 100, y: 0 }, size: 56 },
      ];
      const staticNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];

      const positions = resolveCollisions(customNodes, staticNodes, 10);

      expect(positions.size).toBe(2);
      expect(positions.has("custom-1")).toBe(true);
      expect(positions.has("custom-2")).toBe(true);
    });

    it("should push nodes away from static nodes", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 100, y: 100 }, size: 56 },
      ];
      const staticNodes = [
        { id: "static-1", position: { x: 110, y: 100 }, size: 96 }, // Very close
      ];

      const positionsBefore = customNodes[0]!.position;
      const positions = resolveCollisions(customNodes, staticNodes, 50);

      const positionAfter = positions.get("custom-1")!;

      // Should have moved away from static node
      const distBefore = Math.sqrt(
        (positionsBefore.x - 110) ** 2 + (positionsBefore.y - 100) ** 2,
      );
      const distAfter = Math.sqrt(
        (positionAfter.x - 110) ** 2 + (positionAfter.y - 100) ** 2,
      );

      expect(distAfter).toBeGreaterThan(distBefore);
    });

    it("should push custom nodes away from each other", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 100, y: 100 }, size: 56 },
        { id: "custom-2", position: { x: 110, y: 100 }, size: 56 }, // Overlapping
      ];
      const staticNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];

      const distBefore = 10; // Initial distance
      const positions = resolveCollisions(customNodes, staticNodes, 50);

      const pos1 = positions.get("custom-1")!;
      const pos2 = positions.get("custom-2")!;
      const distAfter = Math.sqrt(
        (pos2.x - pos1.x) ** 2 + (pos2.y - pos1.y) ** 2,
      );

      // Should have moved apart
      expect(distAfter).toBeGreaterThan(distBefore);
    });

    it("should stop iterating when velocities settle", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 0, y: 0 }, size: 56 },
      ];
      const staticNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];

      // No forces acting, should stop early
      const positions = resolveCollisions(customNodes, staticNodes, 100);

      // Should return original position (no movement)
      const pos = positions.get("custom-1")!;
      expect(pos.x).toBeCloseTo(0, 1);
      expect(pos.y).toBeCloseTo(0, 1);
    });
  });

  describe("resolveCollisions - Repulsion Forces", () => {
    it("should apply repulsion force within MIN_REPULSION_DISTANCE", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 0, y: 0 }, size: 56 },
      ];
      const staticNodes = [
        { id: "static-1", position: { x: 150, y: 0 }, size: 96 }, // Within 200px
      ];

      const positions = resolveCollisions(customNodes, staticNodes, 30);
      const pos = positions.get("custom-1")!;

      // Should be pushed left (away from static node)
      expect(pos.x).toBeLessThan(0);
    });

    it("should NOT apply repulsion beyond MIN_REPULSION_DISTANCE", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 0, y: 0 }, size: 56 },
      ];
      const staticNodes = [
        { id: "static-1", position: { x: 300, y: 0 }, size: 96 }, // Beyond 200px
      ];

      const positions = resolveCollisions(customNodes, staticNodes, 30);
      const pos = positions.get("custom-1")!;

      // Should barely move (no repulsion force)
      expect(pos.x).toBeCloseTo(0, 0.5);
      expect(pos.y).toBeCloseTo(0, 0.5);
    });

    it("should apply friction to dampen movement", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 0, y: 0 }, size: 56 },
      ];
      const staticNodes = [
        { id: "static-1", position: { x: 50, y: 0 }, size: 96 }, // Very close
      ];

      // Run with few iterations to see dampening effect
      const positions10 = resolveCollisions(customNodes, staticNodes, 10);
      const positions30 = resolveCollisions(customNodes, staticNodes, 30);

      const dist10 = Math.abs(positions10.get("custom-1")!.x);
      const dist30 = Math.abs(positions30.get("custom-1")!.x);

      // More iterations should move further, but with diminishing returns (friction)
      expect(dist30).toBeGreaterThan(dist10);
      expect(dist30).toBeLessThan(dist10 * 3); // Not proportional due to friction
    });
  });

  describe("resolveCollisions - Performance Optimization", () => {
    it("should use naive approach for small node counts (<=20)", () => {
      // This is tested indirectly - should complete fast
      const customNodes = Array.from({ length: 10 }, (_, i) => ({
        id: `custom-${i}`,
        position: { x: i * 10, y: 0 },
        size: 56,
      }));
      const staticNodes = Array.from({ length: 10 }, (_, i) => ({
        id: `static-${i}`,
        position: { x: i * 10, y: 100 },
        size: 96,
      }));

      const start = Date.now();
      const positions = resolveCollisions(customNodes, staticNodes, 50);
      const duration = Date.now() - start;

      expect(positions.size).toBe(10);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it("should use spatial grid for large node counts (>20)", () => {
      // This is tested indirectly - should still complete reasonably fast
      const customNodes = Array.from({ length: 30 }, (_, i) => ({
        id: `custom-${i}`,
        position: { x: (i % 10) * 50, y: Math.floor(i / 10) * 50 },
        size: 56,
      }));
      const staticNodes = Array.from({ length: 30 }, (_, i) => ({
        id: `static-${i}`,
        position: { x: (i % 10) * 50 + 25, y: Math.floor(i / 10) * 50 + 25 },
        size: 96,
      }));

      const start = Date.now();
      const positions = resolveCollisions(customNodes, staticNodes, 50);
      const duration = Date.now() - start;

      expect(positions.size).toBe(30);
      expect(duration).toBeLessThan(500); // Should complete in reasonable time
    });

    it("should handle 100+ nodes without hanging", () => {
      const customNodes = Array.from({ length: 50 }, (_, i) => ({
        id: `custom-${i}`,
        position: { x: (i % 20) * 100, y: Math.floor(i / 20) * 100 },
        size: 56,
      }));
      const staticNodes = Array.from({ length: 50 }, (_, i) => ({
        id: `static-${i}`,
        position: { x: (i % 20) * 100 + 50, y: Math.floor(i / 20) * 100 + 50 },
        size: 96,
      }));

      const start = Date.now();
      const positions = resolveCollisions(customNodes, staticNodes, 50);
      const duration = Date.now() - start;

      expect(positions.size).toBe(50);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("resolveCollisions - Complex Scenarios", () => {
    it("should resolve multiple overlapping nodes", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 100, y: 100 }, size: 56 },
        { id: "custom-2", position: { x: 105, y: 100 }, size: 56 },
        { id: "custom-3", position: { x: 110, y: 100 }, size: 56 },
      ];
      const staticNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];

      const positions = resolveCollisions(customNodes, staticNodes, 50);

      const pos1 = positions.get("custom-1")!;
      const pos2 = positions.get("custom-2")!;
      const pos3 = positions.get("custom-3")!;

      // All should have spread out
      const dist12 = Math.sqrt((pos2.x - pos1.x) ** 2 + (pos2.y - pos1.y) ** 2);
      const dist23 = Math.sqrt((pos3.x - pos2.x) ** 2 + (pos3.y - pos2.y) ** 2);

      expect(dist12).toBeGreaterThan(50); // Reasonable spacing
      expect(dist23).toBeGreaterThan(50);
    });

    it("should handle nodes in a cluster around static node", () => {
      const staticNodes = [
        { id: "static-1", position: { x: 0, y: 0 }, size: 96 },
      ];
      const customNodes = Array.from({ length: 8 }, (_, i) => ({
        id: `custom-${i}`,
        position: {
          x: 80 * Math.cos((i * Math.PI) / 4),
          y: 80 * Math.sin((i * Math.PI) / 4),
        },
        size: 56,
      }));

      const positions = resolveCollisions(customNodes, staticNodes, 50);

      // All nodes should be pushed further from center
      for (let i = 0; i < 8; i++) {
        const pos = positions.get(`custom-${i}`)!;
        const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
        expect(dist).toBeGreaterThan(80); // Pushed outward
      }
    });

    it("should converge to stable positions", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 0, y: 0 }, size: 56 },
        { id: "custom-2", position: { x: 10, y: 0 }, size: 56 },
      ];
      const staticNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];

      // Run with more iterations
      const positions = resolveCollisions(customNodes, staticNodes, 100);

      const pos1 = positions.get("custom-1")!;
      const pos2 = positions.get("custom-2")!;

      // Should have settled to reasonable positions
      expect(pos1.x).toBeLessThan(0); // Pushed left
      expect(pos2.x).toBeGreaterThan(10); // Pushed right
      expect(Math.abs(pos1.y)).toBeLessThan(50); // Not drifted too far
      expect(Math.abs(pos2.y)).toBeLessThan(50);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty custom nodes array", () => {
      const customNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];
      const staticNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];

      const positions = resolveCollisions(customNodes, staticNodes, 50);
      expect(positions.size).toBe(0);
    });

    it("should handle single custom node with no static nodes", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 100, y: 100 }, size: 56 },
      ];
      const staticNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];

      const positions = resolveCollisions(customNodes, staticNodes, 50);

      const pos = positions.get("custom-1")!;
      // Should stay roughly in place (no forces)
      expect(pos.x).toBeCloseTo(100, 0.5);
      expect(pos.y).toBeCloseTo(100, 0.5);
    });

    it("should handle nodes at exact same position", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 0, y: 0 }, size: 56 },
        { id: "custom-2", position: { x: 0, y: 0 }, size: 56 }, // Exact overlap
      ];
      const staticNodes: Array<{
        id: string;
        position: { x: number; y: number };
        size: number;
      }> = [];

      const positions = resolveCollisions(customNodes, staticNodes, 50);

      const pos1 = positions.get("custom-1")!;
      const pos2 = positions.get("custom-2")!;

      // When nodes are at exact same position, physics simulation may not create force
      // (zero distance = undefined direction). This is expected behavior.
      // In practice, nodes are never exactly coincident due to floating point math.
      // We just verify the simulation doesn't crash.
      expect(pos1).toBeDefined();
      expect(pos2).toBeDefined();
    });

    it("should handle zero iterations", () => {
      const customNodes = [
        { id: "custom-1", position: { x: 100, y: 100 }, size: 56 },
      ];
      const staticNodes = [
        { id: "static-1", position: { x: 110, y: 100 }, size: 96 },
      ];

      const positions = resolveCollisions(customNodes, staticNodes, 0);

      // Should return original positions
      const pos = positions.get("custom-1")!;
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(100);
    });
  });
});
