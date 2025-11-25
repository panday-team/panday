/**
 * URL generation utilities for roadmap node deep linking
 */

export interface NodeUrlOptions {
  roadmapId: string;
  nodeId: string;
  nodeType?: string;
  /** Optional section heading to scroll to (will be converted to anchor) */
  section?: string;
  /** Optional chunk index for precise highlighting */
  chunkIndex?: number;
}

/**
 * Convert a heading to a URL-safe anchor slug
 */
export function headingToAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a deep link URL for a specific roadmap node
 * Optionally includes section anchor for scroll-to-section behavior
 */
export function generateNodeUrl(options: NodeUrlOptions): string {
  const { roadmapId, nodeId, nodeType, section, chunkIndex } = options;

  // Base URL for the roadmap page
  const baseUrl = `/roadmap`;

  // Create query parameters
  const params = new URLSearchParams();
  params.set("roadmap", roadmapId);
  params.set("node", nodeId);

  if (nodeType) {
    params.set("type", nodeType);
  }

  // Add chunk index for precise highlighting (optional)
  if (chunkIndex !== undefined) {
    params.set("chunk", chunkIndex.toString());
  }

  // Build URL with optional hash anchor for section
  let url = `${baseUrl}?${params.toString()}`;

  if (section) {
    const anchor = headingToAnchor(section);
    url += `#${anchor}`;
  }

  return url;
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
