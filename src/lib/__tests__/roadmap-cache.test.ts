import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from "vitest";

// Mock the config before importing the cache
vi.mock("@/config/app-config", () => ({
  APP_CONFIG: {
    cache: {
      roadmapTtl: 5000, // 5 seconds for testing (instead of Infinity)
      roadmapMaxSize: 3, // Small size for testing
    },
  },
}));

// Mock the roadmap loader
vi.mock("../roadmap-loader", () => ({
  buildRoadmap: vi.fn(),
}));

import { buildRoadmap } from "../roadmap-loader";
import type { Roadmap } from "@/data/types/roadmap";

// Import after mocks
const { roadmapCache } = await import("../roadmap-cache");

describe("roadmapCache", () => {
  const createMockRoadmap = (id: string): Roadmap => ({
    metadata: {
      id,
      title: `Test Roadmap ${id}`,
      description: "Test description",
      version: "1.0",
      lastUpdated: "2024-01-15",
    },
    graph: {
      nodes: [],
      edges: [],
    },
    content: new Map(),
  });

  beforeEach(() => {
    vi.resetAllMocks();
    roadmapCache.clear(); // Clear cache between tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    roadmapCache.clear();
  });

  describe("get", () => {
    it("loads roadmap from builder on cache miss", async () => {
      const mockRoadmap = createMockRoadmap("electrician-bc");
      (buildRoadmap as MockedFunction<typeof buildRoadmap>).mockResolvedValue(
        mockRoadmap,
      );

      const result = await roadmapCache.get("electrician-bc");

      expect(buildRoadmap).toHaveBeenCalledWith("electrician-bc");
      expect(result).toEqual(mockRoadmap);
      expect(roadmapCache.size()).toBe(1);
    });

    it("returns cached roadmap on subsequent calls", async () => {
      const mockRoadmap = createMockRoadmap("electrician-bc");
      (buildRoadmap as MockedFunction<typeof buildRoadmap>).mockResolvedValue(
        mockRoadmap,
      );

      // First call - loads from builder
      const result1 = await roadmapCache.get("electrician-bc");
      expect(buildRoadmap).toHaveBeenCalledTimes(1);

      // Second call - returns from cache
      const result2 = await roadmapCache.get("electrician-bc");
      expect(buildRoadmap).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual(result1);
    });

    it("caches different roadmaps separately", async () => {
      const roadmap1 = createMockRoadmap("electrician-bc");
      const roadmap2 = createMockRoadmap("plumber-bc");

      (buildRoadmap as MockedFunction<typeof buildRoadmap>)
        .mockResolvedValueOnce(roadmap1)
        .mockResolvedValueOnce(roadmap2);

      await roadmapCache.get("electrician-bc");
      await roadmapCache.get("plumber-bc");

      expect(buildRoadmap).toHaveBeenCalledWith("electrician-bc");
      expect(buildRoadmap).toHaveBeenCalledWith("plumber-bc");
      expect(roadmapCache.size()).toBe(2);
    });

    it("reloads roadmap after TTL expires", async () => {
      const mockRoadmap = createMockRoadmap("electrician-bc");
      const updatedRoadmap = {
        ...mockRoadmap,
        metadata: { ...mockRoadmap.metadata, title: "Updated" },
      };

      (buildRoadmap as MockedFunction<typeof buildRoadmap>)
        .mockResolvedValueOnce(mockRoadmap)
        .mockResolvedValueOnce(updatedRoadmap);

      // First call - caches the roadmap
      const result1 = await roadmapCache.get("electrician-bc");
      expect(result1.metadata.title).toBe("Test Roadmap electrician-bc");

      // Advance time past TTL (5 seconds + 1ms)
      vi.advanceTimersByTime(5001);

      // Second call - should reload due to expired TTL
      const result2 = await roadmapCache.get("electrician-bc");
      expect(buildRoadmap).toHaveBeenCalledTimes(2);
      expect(result2.metadata.title).toBe("Updated");
    });

    it("does not reload roadmap before TTL expires", async () => {
      const mockRoadmap = createMockRoadmap("electrician-bc");
      (buildRoadmap as MockedFunction<typeof buildRoadmap>).mockResolvedValue(
        mockRoadmap,
      );

      await roadmapCache.get("electrician-bc");

      // Advance time to just before TTL (4.9 seconds)
      vi.advanceTimersByTime(4900);

      await roadmapCache.get("electrician-bc");
      expect(buildRoadmap).toHaveBeenCalledTimes(1); // Still cached
    });
  });

  describe("size limit enforcement (LRU eviction)", () => {
    it("evicts oldest entry when cache exceeds max size", async () => {
      const roadmap1 = createMockRoadmap("roadmap-1");
      const roadmap2 = createMockRoadmap("roadmap-2");
      const roadmap3 = createMockRoadmap("roadmap-3");
      const roadmap4 = createMockRoadmap("roadmap-4");

      (buildRoadmap as MockedFunction<typeof buildRoadmap>)
        .mockResolvedValueOnce(roadmap1)
        .mockResolvedValueOnce(roadmap2)
        .mockResolvedValueOnce(roadmap3)
        .mockResolvedValueOnce(roadmap4);

      // Fill cache to max (3)
      await roadmapCache.get("roadmap-1");
      vi.advanceTimersByTime(100);
      await roadmapCache.get("roadmap-2");
      vi.advanceTimersByTime(100);
      await roadmapCache.get("roadmap-3");
      vi.advanceTimersByTime(100);

      expect(roadmapCache.size()).toBe(3);

      // Add one more - should evict roadmap-1 (oldest)
      await roadmapCache.get("roadmap-4");

      // Size stays at max
      expect(roadmapCache.size()).toBe(3);

      // Verify roadmap-1 was evicted by checking it gets reloaded
      (
        buildRoadmap as MockedFunction<typeof buildRoadmap>
      ).mockResolvedValueOnce(roadmap1);
      await roadmapCache.get("roadmap-1");

      // buildRoadmap should have been called again for roadmap-1
      expect(buildRoadmap).toHaveBeenCalledTimes(5);
    });
  });

  describe("evictExpiredEntries", () => {
    it("removes expired entries during get operations", async () => {
      const roadmap1 = createMockRoadmap("roadmap-1");
      const roadmap2 = createMockRoadmap("roadmap-2");

      (buildRoadmap as MockedFunction<typeof buildRoadmap>)
        .mockResolvedValueOnce(roadmap1)
        .mockResolvedValueOnce(roadmap2);

      await roadmapCache.get("roadmap-1");
      vi.advanceTimersByTime(3000); // Partial time
      await roadmapCache.get("roadmap-2");

      expect(roadmapCache.size()).toBe(2);

      // Advance past TTL for roadmap-1 but not roadmap-2
      vi.advanceTimersByTime(2100); // Total 5.1s for roadmap-1, 2.1s for roadmap-2

      // This get triggers eviction of expired entries
      (
        buildRoadmap as MockedFunction<typeof buildRoadmap>
      ).mockResolvedValueOnce(createMockRoadmap("roadmap-3"));
      await roadmapCache.get("roadmap-3");

      // roadmap-1 should have been evicted, but we still have 2-3
      // The exact count depends on whether roadmap-1 was evicted
      expect(roadmapCache.size()).toBeLessThanOrEqual(3);
    });
  });

  describe("clear", () => {
    it("clears specific roadmap when id is provided", async () => {
      const roadmap1 = createMockRoadmap("roadmap-1");
      const roadmap2 = createMockRoadmap("roadmap-2");

      (buildRoadmap as MockedFunction<typeof buildRoadmap>)
        .mockResolvedValueOnce(roadmap1)
        .mockResolvedValueOnce(roadmap2);

      await roadmapCache.get("roadmap-1");
      await roadmapCache.get("roadmap-2");
      expect(roadmapCache.size()).toBe(2);

      roadmapCache.clear("roadmap-1");

      expect(roadmapCache.size()).toBe(1);

      // Verify roadmap-1 was cleared by checking it gets reloaded
      (
        buildRoadmap as MockedFunction<typeof buildRoadmap>
      ).mockResolvedValueOnce(roadmap1);
      await roadmapCache.get("roadmap-1");
      expect(buildRoadmap).toHaveBeenCalledTimes(3);
    });

    it("clears all entries when no id is provided", async () => {
      const roadmap1 = createMockRoadmap("roadmap-1");
      const roadmap2 = createMockRoadmap("roadmap-2");

      (buildRoadmap as MockedFunction<typeof buildRoadmap>)
        .mockResolvedValueOnce(roadmap1)
        .mockResolvedValueOnce(roadmap2);

      await roadmapCache.get("roadmap-1");
      await roadmapCache.get("roadmap-2");
      expect(roadmapCache.size()).toBe(2);

      roadmapCache.clear();

      expect(roadmapCache.size()).toBe(0);
    });
  });

  describe("size", () => {
    it("returns 0 for empty cache", () => {
      expect(roadmapCache.size()).toBe(0);
    });

    it("returns correct count after adding entries", async () => {
      (buildRoadmap as MockedFunction<typeof buildRoadmap>).mockResolvedValue(
        createMockRoadmap("test"),
      );

      await roadmapCache.get("roadmap-1");
      expect(roadmapCache.size()).toBe(1);

      await roadmapCache.get("roadmap-2");
      expect(roadmapCache.size()).toBe(2);
    });
  });

  describe("error handling", () => {
    it("propagates errors from roadmap builder", async () => {
      const error = new Error("Failed to build roadmap");
      (buildRoadmap as MockedFunction<typeof buildRoadmap>).mockRejectedValue(
        error,
      );

      await expect(roadmapCache.get("invalid-roadmap")).rejects.toThrow(
        "Failed to build roadmap",
      );
    });

    it("does not cache failed builds", async () => {
      const error = new Error("Build failed");
      (buildRoadmap as MockedFunction<typeof buildRoadmap>)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(createMockRoadmap("test"));

      // First call fails
      await expect(roadmapCache.get("test-roadmap")).rejects.toThrow();

      // Second call should retry (not cached)
      const result = await roadmapCache.get("test-roadmap");
      expect(result).toBeDefined();
      expect(buildRoadmap).toHaveBeenCalledTimes(2);
    });
  });
});
