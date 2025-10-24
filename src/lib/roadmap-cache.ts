import type { Roadmap } from "@/data/types/roadmap";
import { buildRoadmap } from "./roadmap-loader";

interface CacheEntry {
  data: Roadmap;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

class RoadmapCache {
  private cache = new Map<string, CacheEntry>();

  async get(roadmapId: string): Promise<Roadmap> {
    const cached = this.cache.get(roadmapId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const data = await buildRoadmap(roadmapId);
    this.cache.set(roadmapId, { data, timestamp: now });

    return data;
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
