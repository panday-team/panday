/**
 * Viewport calculation utilities for React Flow
 * Provides dynamic viewport positioning based on graph node positions
 */

import type { RoadmapGraph } from "@/data/types/roadmap";

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Calculate viewport position to center a specific node
 *
 * @param nodeId - ID of the node to center on (must be a main node, not a child)
 * @param nodes - Array of all nodes from the roadmap graph
 * @param fallback - Fallback viewport if node not found
 * @returns Viewport coordinates and zoom level
 *
 * @remarks
 * Viewport transformation in React Flow:
 * - viewport (x,y) represents the top-left corner position
 * - To center a node at position (nodeX, nodeY) with zoom Z:
 *   viewportX = -nodeX * Z + screenWidth/2
 *   viewportY = -nodeY * Z + screenHeight/2
 */
export function calculateViewportForNode(
  nodeId: string | null,
  nodes: RoadmapGraph["nodes"],
  fallback: Viewport = { x: 850, y: 400, zoom: 0.8 },
): Viewport {
  if (!nodeId) return fallback;

  // Find the main node (nodes without parentId are main path nodes)
  const node = nodes.find((n) => n.id === nodeId && !n.parentId);
  if (!node) return fallback;

  const zoom = 0.8;

  // Use window dimensions if available (client-side), otherwise use reasonable defaults
  // These defaults work well for typical desktop screens (1920x1080)
  const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 960;
  const centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 540;

  return {
    x: -node.position.x * zoom + centerX,
    y: -node.position.y * zoom + centerY,
    zoom,
  };
}

/**
 * Get default overview viewport
 * This is used when no specific node is targeted (e.g., unauthenticated users)
 */
export function getDefaultViewport(): Viewport {
  return { x: 850, y: 400, zoom: 0.8 };
}
