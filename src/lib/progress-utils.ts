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
  contentMap: Map<string, NodeContent>,
): NodeType | null {
  const content = contentMap.get(nodeId);
  return content?.frontmatter.type ?? null;
}

/**
 * Get all direct children of a node
 */
export function getDirectChildren(
  nodeId: string,
  graphNodes: GraphNode[],
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
  contentMap: Map<string, NodeContent>,
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
        contentMap,
      );
      checklists.push(...childChecklists);
    }
  }

  return checklists;
}

/**
 * Calculate progress for a node based on its type and children
 * - Hub nodes: Track all descendant checklists
 * - Category/Connector nodes: Track direct checklist children
 * - Other nodes: Return null (no progress tracking)
 */
export function calculateNodeProgress(
  nodeId: string,
  nodeType: string,
  nodeStatuses: Record<string, NodeStatus>,
  graphNodes: GraphNode[],
  contentMap: Map<string, NodeContent>,
): ProgressData | null {
  // Only hub and category/connector nodes have progress
  if (
    nodeType !== "hub" &&
    nodeType !== "category" &&
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
    // Category/Connector nodes: count direct checklist children
    targetNodes = getDirectChildren(nodeId, graphNodes).filter((node) => {
      const childType = getNodeType(node.id, contentMap);
      return childType === "checklist";
    });

    // Special handling for Resources category nodes to include virtual resource items
    if (nodeId.includes("-resources")) {
      const node = graphNodes.find((n) => n.id === nodeId);
      if (node?.parentId) {
        const parentContent = contentMap.get(node.parentId);
        if (parentContent?.resources) {
          // Add resources to the total count
          // Virtual ID convention: resource-{parentId}-{index}
          parentContent.resources.forEach((_, idx) => {
            // We don't add to targetNodes because they are not graph nodes
            // We'll handle the counting manually
          });
        }
      }
    }
  }

  // Calculate base progress from graph nodes
  let total = targetNodes.length;
  let completed = targetNodes.filter(
    (node) => nodeStatuses[node.id] === "completed",
  ).length;

  // Add virtual resource items if applicable
  // Case 1: Resources category node (inherits resources from parent hub)
  if (nodeId.includes("-resources")) {
    const node = graphNodes.find((n) => n.id === nodeId);
    if (node?.parentId) {
      const parentContent = contentMap.get(node.parentId);
      if (parentContent?.resources) {
        total += parentContent.resources.length;
        parentContent.resources.forEach((_, idx) => {
          const resourceId = `resource-${node.parentId}-${idx}`;
          if (nodeStatuses[resourceId] === "completed") {
            completed++;
          }
        });
      }
    }
  }

  // Case 2: Hub node (has its own resources) - NO LONGER APPLIES
  // Hub progress is now just the sum of its descendant checklists.
  // Resources are handled within their own category node.
  /*
  if (nodeType === "hub") {
    const content = contentMap.get(nodeId);
    if (content?.resources) {
      total += content.resources.length;
      content.resources.forEach((_, idx) => {
        const resourceId = `resource-${nodeId}-${idx}`;
        if (nodeStatuses[resourceId] === "completed") {
          completed++;
        }
      });
    }
  }
  */

  // Add virtual resource items if applicable
  // Case 1: Resources category node (inherits resources from parent hub)
  if (nodeId.includes("-resources")) {
    const node = graphNodes.find((n) => n.id === nodeId);
    if (node?.parentId) {
      const parentContent = contentMap.get(node.parentId);
      if (parentContent?.resources) {
        total += parentContent.resources.length;
        parentContent.resources.forEach((_, idx) => {
        parentContent.resources.forEach((_, idx) => {
          const resourceId = `resource-${node.parentId}-${idx}`;
          if (nodeStatuses[resourceId] === "completed") {
            completed++;
          }
        });
      }
    }
  }

  // Case 2: Hub node (has its own resources) - NO LONGER APPLIES
  // Hub progress is now just the sum of its descendant checklists.
  // Resources are handled within their own category node.
  /*
  if (nodeType === "hub") {
    const content = contentMap.get(nodeId);
    if (content?.resources) {
      total += content.resources.length;
      content.resources.forEach((_, idx) => {
        const resourceId = `resource-${nodeId}-${idx}`;
        if (nodeStatuses[resourceId] === "completed") {
          completed++;
        }
      });
    }
  }
  */

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
  contentMap: Map<string, NodeContent>,
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
        contentMap,
      );
    }
  }

  return progressMap;
}
