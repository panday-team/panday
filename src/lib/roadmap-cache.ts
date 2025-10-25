import type { Roadmap } from "@/data/types/roadmap";
import { buildRoadmap } from "./roadmap-loader";

interface CacheEntry {
  data: Roadmap;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 10;

class RoadmapCache {
  private cache = new Map<string, CacheEntry>();

  async get(roadmapId: string): Promise<Roadmap> {
    this.evictExpiredEntries();
    this.enforceSizeLimit();

    const cached = this.cache.get(roadmapId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const data = await buildRoadmap(roadmapId);
    this.cache.set(roadmapId, { data, timestamp: now });

    return data;
  }

  private evictExpiredEntries(): void {
    const now = Date.now();
    for (const [id, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= CACHE_TTL_MS) {
        this.cache.delete(id);
      }
    }
  }

  private enforceSizeLimit(): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp,
      )[0]?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  clear(roadmapId?: string): void {
    if (roadmapId) {
      this.cache.delete(roadmapId);
    } else {
      this.cache.clear();
    }
  }

  size(): number {
    return this.cache.size;
  }
}

export const roadmapCache = new RoadmapCache();
