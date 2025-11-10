/**
 * URL generation utilities for roadmap node deep linking
 */

export interface NodeUrlOptions {
  roadmapId: string;
  nodeId: string;
  nodeType?: string;
}

/**
 * Generate a deep link URL for a specific roadmap node
 */
export function generateNodeUrl(options: NodeUrlOptions): string {
  const { roadmapId, nodeId, nodeType } = options;

  // Base URL for the roadmap page
  const baseUrl = `/roadmap`;

  // Create query parameters
  const params = new URLSearchParams();
  params.set("roadmap", roadmapId);
  params.set("node", nodeId);

  if (nodeType) {
    params.set("type", nodeType);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate a human-readable URL path for a node
 */
export function generateNodePath(options: NodeUrlOptions): string {
  const { roadmapId, nodeId, nodeType } = options;

  // Create a slug from the node ID for better readability
  const slug = nodeId.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (nodeType) {
    return `/roadmap/${roadmapId}/${nodeType}/${slug}`;
  }

  return `/roadmap/${roadmapId}/${slug}`;
}

/**
 * Extract node information from metadata to generate URLs
 */
export function extractNodeInfo(metadata: Record<string, unknown>): {
  nodeId: string;
  nodeType?: string;
  title?: string;
} {
  return {
    nodeId:
      (metadata.node_id as string) || (metadata.id as string) || "unknown",
    nodeType: (metadata.type as string) || (metadata.nodeType as string),
    title: metadata.title as string,
  };
}
