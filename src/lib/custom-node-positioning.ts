/**
 * Smart positioning algorithm for custom nodes
 * Places nodes in a radial pattern around parent, avoiding collisions
 */

interface Position {
  x: number;
  y: number;
}

interface ExistingNode {
  id: string;
  position: Position;
}

const CUSTOM_NODE_SIZE = 56; // Checklist node size (from CSS)
const HUB_NODE_SIZE = 130; // Hub node size
const MIN_DISTANCE = 280; // Minimum distance from parent center (accounts for hub size + label space)
const COLLISION_PADDING = 60; // Extra space between nodes (increased for smooth animations)

/**
 * Calculate distance between two points
 */
function distance(p1: Position, p2: Position): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Check if a position collides with any existing node
 */
function hasCollision(
  pos: Position,
  existingNodes: ExistingNode[],
  nodeSize: number = CUSTOM_NODE_SIZE,
): boolean {
  for (const node of existingNodes) {
    const dist = distance(pos, node.position);
    // Consider node sizes for collision
    const minSafeDistance = (nodeSize + HUB_NODE_SIZE) / 2 + COLLISION_PADDING;
    if (dist < minSafeDistance) {
      return true;
    }
  }
  return false;
}

/**
 * Find best position for custom node around parent
 * Uses radial placement with collision avoidance
 */
export function findCustomNodePosition(
  parentPos: Position,
  existingNodes: ExistingNode[],
  customNodeIndex: number,
): Position {
  // Try positions in increasing radial distances (more spread out)
  const radiusSteps = [MIN_DISTANCE, MIN_DISTANCE + 120, MIN_DISTANCE + 240];

  // Preferred angles (right, bottom-right, bottom, bottom-left, top-right, top, top-left, left)
  // Start at 0° (right) and go clockwise
  const preferredAngles = [
    0, // Right
    45, // Bottom-right
    90, // Bottom
    135, // Bottom-left
    315, // Top-right
    270, // Top
    225, // Top-left
    180, // Left
  ];

  // Add offset based on custom node index to spread multiple nodes
  const angleOffset = customNodeIndex * 25; // Slight offset per node

  for (const radius of radiusSteps) {
    for (const baseAngle of preferredAngles) {
      const angle = baseAngle + angleOffset;
      const angleRad = (angle * Math.PI) / 180;

      const candidatePos = {
        x: parentPos.x + radius * Math.cos(angleRad),
        y: parentPos.y + radius * Math.sin(angleRad),
      };

      // Check if this position is free
      if (!hasCollision(candidatePos, existingNodes)) {
        return candidatePos;
      }
    }
  }

  // Fallback: place at increasing distance to the right
  // This should rarely happen
  return {
    x: parentPos.x + MIN_DISTANCE + customNodeIndex * 80,
    y: parentPos.y + customNodeIndex * 40,
  };
}

/**
 * Calculate positions for multiple custom nodes attached to same parent
 * Groups them together for better visual cohesion
 */
export function calculateCustomNodePositions(
  customNodes: Array<{
    id: string;
    parentId: string;
  }>,
  parentPositions: Map<string, Position>,
  existingNodes: ExistingNode[],
): Map<string, Position> {
  const positions = new Map<string, Position>();
  const nodesByParent = new Map<string, string[]>();

  // Group custom nodes by parent
  for (const node of customNodes) {
    // Handle multi-parent nodes (use first parent for positioning)
    const parentIds = node.parentId.split(",").map((id) => id.trim());
    const primaryParent = parentIds[0] ?? node.parentId;

    const siblings = nodesByParent.get(primaryParent) ?? [];
    siblings.push(node.id);
    nodesByParent.set(primaryParent, siblings);
  }

  // Position each group of custom nodes
  for (const [parentId, nodeIds] of nodesByParent) {
    const parentPos = parentPositions.get(parentId);
    if (!parentPos) continue;

    // Track all nodes (existing + already positioned custom nodes)
    const allNodes = [...existingNodes];

    nodeIds.forEach((nodeId, index) => {
      const position = findCustomNodePosition(parentPos, allNodes, index);
      positions.set(nodeId, position);

      // Add this node to collision detection for next siblings
      allNodes.push({ id: nodeId, position });
    });
  }

  return positions;
}
