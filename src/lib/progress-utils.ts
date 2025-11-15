import type { GraphNode, NodeContent, NodeType } from "@/data/types/roadmap";
import type { NodeStatus } from "./node-status";

/**
 * Progress calculation utilities for roadmap nodes
 * Tracks completion percentages for hub and connector nodes
 */

export interface ProgressData {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * Helper to get node type from content map
 */
function getNodeType(
  nodeId: string,
  contentMap: Map<string, NodeContent>
): NodeType | null {
  const content = contentMap.get(nodeId);
  return content?.frontmatter.type ?? null;
}

/**
 * Get all direct children of a node
 */
export function getDirectChildren(
  nodeId: string,
  graphNodes: GraphNode[]
): GraphNode[] {
  return graphNodes.filter((node) => node.parentId === nodeId);
}

/**
 * Get all descendant checklist nodes (recursive)
 * Used for hub nodes to count all checklists across all child connectors
 */
export function getDescendantChecklists(
  nodeId: string,
  graphNodes: GraphNode[],
  contentMap: Map<string, NodeContent>
): GraphNode[] {
  const children = getDirectChildren(nodeId, graphNodes);
  const checklists: GraphNode[] = [];

  for (const child of children) {
    const childType = getNodeType(child.id, contentMap);
    if (childType === "checklist") {
      checklists.push(child);
    } else {
      // Recursively get checklists from child connectors
      const childChecklists = getDescendantChecklists(
        child.id,
        graphNodes,
        contentMap
      );
      checklists.push(...childChecklists);
    }
  }

  return checklists;
}

/**
 * Calculate progress for a node based on its type and children
 * - Hub nodes: Track all descendant checklists
 * - Connector nodes: Track direct checklist children
 * - Other nodes: Return null (no progress tracking)
 */
export function calculateNodeProgress(
  nodeId: string,
  nodeType: string,
  nodeStatuses: Record<string, NodeStatus>,
  graphNodes: GraphNode[],
  contentMap: Map<string, NodeContent>
): ProgressData | null {
  // Only hub and connector nodes have progress
  if (
    nodeType !== "hub" &&
    nodeType !== "resources" &&
    nodeType !== "actions" &&
    nodeType !== "roadblocks"
  ) {
    return null;
  }

  let targetNodes: GraphNode[];

  if (nodeType === "hub") {
    // Hub nodes: count all descendant checklists
    targetNodes = getDescendantChecklists(nodeId, graphNodes, contentMap);
  } else {
    // Connector nodes: count direct checklist children
    targetNodes = getDirectChildren(nodeId, graphNodes).filter((node) => {
      const childType = getNodeType(node.id, contentMap);
      return childType === "checklist";
    });
  }

  const total = targetNodes.length;
  const completed = targetNodes.filter(
    (node) => nodeStatuses[node.id] === "completed"
  ).length;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    total,
    percentage,
  };
}

/**
 * Calculate progress for multiple nodes at once
 * Returns a map of nodeId -> ProgressData
 */
export function calculateMultipleNodeProgress(
  nodeIds: string[],
  nodeStatuses: Record<string, NodeStatus>,
  graphNodes: GraphNode[],
  contentMap: Map<string, NodeContent>
): Record<string, ProgressData | null> {
  const progressMap: Record<string, ProgressData | null> = {};

  for (const nodeId of nodeIds) {
    const nodeType = getNodeType(nodeId, contentMap);
    if (nodeType) {
      progressMap[nodeId] = calculateNodeProgress(
        nodeId,
        nodeType,
        nodeStatuses,
        graphNodes,
        contentMap
      );
    }
  }

  return progressMap;
}
