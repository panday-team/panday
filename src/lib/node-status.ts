/**
 * Node status management with database persistence and localStorage cache
 *
 * Uses a hybrid approach:
 * - localStorage for instant UI updates and offline capability
 * - Database (via API) for persistence and cross-device sync
 */

import { logger } from "@/lib/logger";

export type NodeStatus = "base" | "in-progress" | "completed";

const STORAGE_KEY_PREFIX = "roadmap-node-status";

function getStorageKey(roadmapId: string): string {
  return `${STORAGE_KEY_PREFIX}-${roadmapId}`;
}

/**
 * Fetch all node statuses from the database for a roadmap
 */
export async function fetchNodeStatuses(
  roadmapId: string,
): Promise<Record<string, NodeStatus>> {
  try {
    const response = await fetch(
      `/api/node-progress?roadmapId=${encodeURIComponent(roadmapId)}`,
    );

    if (!response.ok) {
      if (response.status === 401) {
        logger.info("User not authenticated, using localStorage only");
        return getLocalNodeStatuses(roadmapId);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, NodeStatus>;

    // Update localStorage cache with server data
    if (typeof window !== "undefined") {
      localStorage.setItem(getStorageKey(roadmapId), JSON.stringify(data));
    }

    return data;
  } catch (error) {
    logger.error("Failed to fetch node statuses from API", error as Error, {
      roadmapId,
    });
    // Fallback to localStorage
    return getLocalNodeStatuses(roadmapId);
  }
}

/**
 * Update node status in both database and localStorage
 */
export async function setNodeStatus(
  roadmapId: string,
  nodeId: string,
  status: NodeStatus,
): Promise<void> {
  // Update localStorage immediately for instant UI feedback
  updateLocalNodeStatus(roadmapId, nodeId, status);

  // Persist to database in the background
  try {
    const response = await fetch("/api/node-progress", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roadmapId,
        nodeId,
        status,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        logger.info("User not authenticated, using localStorage only");
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    logger.info("Node status updated in database", {
      roadmapId,
      nodeId,
      status,
    });
  } catch (error) {
    logger.error("Failed to update node status in database", error as Error, {
      roadmapId,
      nodeId,
      status,
    });
    // Status is still saved in localStorage, so UI remains consistent
  }
}

/**
 * Get node statuses from localStorage only (internal helper)
 */
function getLocalNodeStatuses(roadmapId: string): Record<string, NodeStatus> {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(getStorageKey(roadmapId));
    return stored ? (JSON.parse(stored) as Record<string, NodeStatus>) : {};
  } catch (error) {
    logger.error("Failed to get node statuses from localStorage", error as Error);
    return {};
  }
}

/**
 * Update localStorage only (internal helper)
 */
function updateLocalNodeStatus(
  roadmapId: string,
  nodeId: string,
  status: NodeStatus,
): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(getStorageKey(roadmapId));
    const statusMap: Record<string, NodeStatus> = stored
      ? (JSON.parse(stored) as Record<string, NodeStatus>)
      : {};

    if (status === "base") {
      delete statusMap[nodeId];
    } else {
      statusMap[nodeId] = status;
    }

    localStorage.setItem(getStorageKey(roadmapId), JSON.stringify(statusMap));
  } catch (error) {
    logger.error("Failed to update localStorage", error as Error);
  }
}

/**
 * @deprecated Use fetchNodeStatuses instead
 */
export function getAllNodeStatuses(
  roadmapId: string,
): Record<string, NodeStatus> {
  return getLocalNodeStatuses(roadmapId);
}
