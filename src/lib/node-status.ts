/**
 * Node status management using localStorage
 *
 * TODO: Replace localStorage with user account database once auth system is integrated.
 * This should be linked to user profile and synced across devices.
 * Required changes:
 * - Move status from localStorage to Prisma database (UserProgress model)
 * - Add userId association via Clerk
 * - Implement API endpoints for status updates
 * - Add real-time sync for multi-device support
 */

export type NodeStatus = "base" | "in-progress" | "completed";

const STORAGE_KEY_PREFIX = "roadmap-node-status";

function getStorageKey(roadmapId: string): string {
  return `${STORAGE_KEY_PREFIX}-${roadmapId}`;
}

export function getNodeStatus(roadmapId: string, nodeId: string): NodeStatus {
  if (typeof window === "undefined") return "base";

  try {
    const stored = localStorage.getItem(getStorageKey(roadmapId));
    if (!stored) return "base";

    const statusMap = JSON.parse(stored) as Record<string, NodeStatus>;
    return statusMap[nodeId] ?? "base";
  } catch (error) {
    console.error("Failed to get node status:", error);
    return "base";
  }
}

export function setNodeStatus(
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
    console.error("Failed to set node status:", error);
  }
}

export function getAllNodeStatuses(
  roadmapId: string,
): Record<string, NodeStatus> {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(getStorageKey(roadmapId));
    return stored ? (JSON.parse(stored) as Record<string, NodeStatus>) : {};
  } catch (error) {
    console.error("Failed to get all node statuses:", error);
    return {};
  }
}
