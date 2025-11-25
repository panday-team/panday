import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import {
  calculateViewportForNode,
  getDefaultViewport,
  type Viewport,
} from "../viewport-utils";
import type { RoadmapGraph } from "@/data/types/roadmap";

describe("viewport-utils", () => {
  const mockNodes: RoadmapGraph["nodes"] = [
    { id: "foundation-program", position: { x: 500, y: 300 } },
    { id: "level-1", position: { x: 500, y: 600 } },
    { id: "level-2", position: { x: 500, y: 900 } },
    { id: "level-3", position: { x: 500, y: 1200 } },
    { id: "level-4", position: { x: 500, y: 1500 } },
    { id: "red-seal", position: { x: 500, y: 1800 } },
    // Child node (has parentId) - should be excluded from viewport calculations
    { id: "level-1-safety", position: { x: 600, y: 650 }, parentId: "level-1" },
    {
      id: "level-1-resources",
      position: { x: 400, y: 650 },
      parentId: "level-1",
    },
  ];

  describe("calculateViewportForNode", () => {
    beforeEach(() => {
      // Mock window dimensions for client-side calculations
      vi.stubGlobal("window", {
        innerWidth: 1920,
        innerHeight: 1080,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("returns fallback viewport when nodeId is null", () => {
      const result = calculateViewportForNode(null, mockNodes);

      expect(result).toEqual({ x: 850, y: 400, zoom: 0.8 });
    });

    it("returns fallback viewport when node is not found", () => {
      const result = calculateViewportForNode("non-existent-node", mockNodes);

      expect(result).toEqual({ x: 850, y: 400, zoom: 0.8 });
    });

    it("returns fallback viewport when node is a child node (has parentId)", () => {
      // Child nodes should be excluded from viewport calculations
      const result = calculateViewportForNode("level-1-safety", mockNodes);

      expect(result).toEqual({ x: 850, y: 400, zoom: 0.8 });
    });

    it("calculates viewport to center on main node (foundation-program)", () => {
      const result = calculateViewportForNode("foundation-program", mockNodes);

      // viewport.x = -node.x * zoom + centerX
      // viewport.x = -500 * 0.8 + 960 = -400 + 960 = 560
      // viewport.y = -node.y * zoom + centerY + verticalOffset
      // viewport.y = -300 * 0.8 + 540 + 120 = -240 + 540 + 120 = 420
      expect(result).toEqual({
        x: 560,
        y: 420,
        zoom: 0.8,
      });
    });

    it("calculates viewport to center on level-1 node", () => {
      const result = calculateViewportForNode("level-1", mockNodes);

      // viewport.x = -500 * 0.8 + 960 = 560
      // viewport.y = -600 * 0.8 + 540 + 120 = -480 + 660 = 180
      expect(result).toEqual({
        x: 560,
        y: 180,
        zoom: 0.8,
      });
    });

    it("calculates viewport to center on red-seal node", () => {
      const result = calculateViewportForNode("red-seal", mockNodes);

      // viewport.x = -500 * 0.8 + 960 = 560
      // viewport.y = -1800 * 0.8 + 540 + 120 = -1440 + 660 = -780
      expect(result).toEqual({
        x: 560,
        y: -780,
        zoom: 0.8,
      });
    });

    it("uses custom fallback viewport when provided", () => {
      const customFallback: Viewport = { x: 100, y: 200, zoom: 1.0 };
      const result = calculateViewportForNode(null, mockNodes, customFallback);

      expect(result).toEqual(customFallback);
    });

    it("uses custom fallback when node not found", () => {
      const customFallback: Viewport = { x: 100, y: 200, zoom: 1.0 };
      const result = calculateViewportForNode(
        "missing-node",
        mockNodes,
        customFallback,
      );

      expect(result).toEqual(customFallback);
    });

    it("uses default screen dimensions when window is undefined (SSR)", () => {
      // Remove window global to simulate SSR
      vi.unstubAllGlobals();

      const result = calculateViewportForNode("foundation-program", mockNodes);

      // viewport.x = -500 * 0.8 + 960 = 560 (default centerX = 960)
      // viewport.y = -300 * 0.8 + 540 + 120 = 420 (default centerY = 540)
      expect(result).toEqual({
        x: 560,
        y: 420,
        zoom: 0.8,
      });
    });

    it("adapts to different screen sizes", () => {
      // Test with smaller screen
      vi.stubGlobal("window", {
        innerWidth: 1280,
        innerHeight: 720,
      });

      const result = calculateViewportForNode("foundation-program", mockNodes);

      // viewport.x = -500 * 0.8 + 640 = -400 + 640 = 240
      // viewport.y = -300 * 0.8 + 360 + 120 = -240 + 480 = 240
      expect(result).toEqual({
        x: 240,
        y: 240,
        zoom: 0.8,
      });
    });

    it("handles empty nodes array", () => {
      const result = calculateViewportForNode("foundation-program", []);

      expect(result).toEqual({ x: 850, y: 400, zoom: 0.8 });
    });
  });

  describe("getDefaultViewport", () => {
    it("returns the default viewport configuration", () => {
      const result = getDefaultViewport();

      expect(result).toEqual({
        x: 850,
        y: 400,
        zoom: 0.8,
      });
    });

    it("returns a new object each time (not the same reference)", () => {
      const result1 = getDefaultViewport();
      const result2 = getDefaultViewport();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("viewport math correctness", () => {
    beforeEach(() => {
      vi.stubGlobal("window", {
        innerWidth: 1920,
        innerHeight: 1080,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("positions node at center of viewport", () => {
      // For a node at (500, 300) with zoom 0.8:
      // The node's screen position should be at the center of the viewport
      const result = calculateViewportForNode("foundation-program", mockNodes);

      // Verify the math:
      // screenX = nodeX * zoom + viewport.x = 500 * 0.8 + 560 = 960 (center)
      // screenY = nodeY * zoom + viewport.y - verticalOffset
      //         = 300 * 0.8 + 420 - 120 = 540 (center)
      const nodeX = 500;
      const nodeY = 300;
      const zoom = 0.8;

      const screenX = nodeX * zoom + result.x;
      const screenY = nodeY * zoom + (result.y - 120); // Remove vertical offset

      expect(screenX).toBe(960); // centerX
      expect(screenY).toBe(540); // centerY
    });
  });
});
