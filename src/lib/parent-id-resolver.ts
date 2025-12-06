/**
 * Utility for resolving human-readable parent node names to actual node IDs.
 * Used by both the chat AI tools and the custom-nodes API to ensure consistent mapping.
 */

import stringSimilarity from "string-similarity";
import { loadRoadmapGraph } from "@/lib/roadmap-loader";
import { logger } from "@/lib/logger";

/**
 * Common aliases for node IDs that the AI or users might use
 */
const PARENT_ID_OVERRIDES: Record<string, string> = {
  // Level nodes
  "Level 1": "level-1",
  "Level 2": "level-2",
  "Level 3": "level-3",

  // Foundation program variations
  Foundation: "foundation-program",
  "Foundation Program": "foundation-program",

  // Direct entry variations
  "Direct Entry": "direct-entry",

  // ACE-IT program variations (common AI outputs)
  "ACE-IT": "ace-it-program",
  "ACE IT": "ace-it-program",
  ACEIT: "ace-it-program",
  "Ace-It": "ace-it-program",
  "Ace It": "ace-it-program",
  "ace-it": "ace-it-program",
  "ace it": "ace-it-program",
  "ACE-IT Program": "ace-it-program",
  "ACE IT Program": "ace-it-program",
};

/**
 * Specialization-dependent node IDs that need user profile context
 */
type SpecializationType = "construction" | "industrial" | null;

interface ResolveOptions {
  roadmapId?: string;
  specialization?: SpecializationType;
}

/**
 * Resolve a single parent ID to its canonical form
 */
async function resolveSingleParentId(
  requestedId: string,
  nodeIds: string[],
  specialization: SpecializationType,
): Promise<string[]> {
  // Check for exact match first
  if (nodeIds.includes(requestedId)) {
    return [requestedId];
  }

  // Check static overrides
  const override = PARENT_ID_OVERRIDES[requestedId];
  if (override) {
    logger.info(
      `Mapped parentId "${requestedId}" to "${override}" via overrides`,
    );
    return [override];
  }

  // Handle Level 4 with specialization awareness
  if (requestedId.toLowerCase() === "level 4" || requestedId === "level-4") {
    if (!specialization) {
      logger.info(`Level 4 → Multi-parent (no specialization)`);
      return ["level-4-industrial", "level-4-construction"];
    } else if (specialization === "industrial") {
      logger.info(
        `Level 4 → level-4-industrial (user specialization: industrial)`,
      );
      return ["level-4-industrial"];
    } else {
      logger.info(
        `Level 4 → level-4-construction (user specialization: ${specialization})`,
      );
      return ["level-4-construction"];
    }
  }

  // Handle Red Seal with specialization awareness
  if (requestedId.toLowerCase() === "red seal") {
    if (!specialization) {
      logger.info(`Red Seal → Multi-parent (no specialization)`);
      return ["red-seal-industrial", "red-seal-construction"];
    } else if (specialization === "industrial") {
      logger.info(
        `Red Seal → red-seal-industrial (user specialization: industrial)`,
      );
      return ["red-seal-industrial"];
    } else {
      logger.info(
        `Red Seal → red-seal-construction (user specialization: ${specialization})`,
      );
      return ["red-seal-construction"];
    }
  }

  // Fuzzy match as last resort
  const matches = stringSimilarity.findBestMatch(requestedId, nodeIds);
  if (matches.bestMatch.rating > 0.25) {
    logger.info(
      `Fuzzy matched parentId "${requestedId}" to "${matches.bestMatch.target}"`,
    );
    return [matches.bestMatch.target];
  }

  // No match found
  return [];
}

/**
 * Resolve parent ID(s) to canonical node IDs.
 * Supports comma-separated multiple parents.
 *
 * @param parentId - The parent ID(s) to resolve (can be comma-separated)
 * @param options - Resolution options including roadmapId and user specialization
 * @returns Resolved parent ID (comma-separated if multiple)
 */
export async function resolveParentId(
  parentId: string,
  options: ResolveOptions = {},
): Promise<string> {
  const { roadmapId = "electrician-bc", specialization = null } = options;

  // Load the roadmap graph to get valid node IDs
  const graph = await loadRoadmapGraph(roadmapId);
  const nodeIds = graph.nodes.map((n) => n.id);

  // Process each requested parent ID
  const requestedIds = parentId.split(",").map((p) => p.trim());
  const resolvedIds: string[] = [];

  for (const requestedId of requestedIds) {
    const resolved = await resolveSingleParentId(
      requestedId,
      nodeIds,
      specialization,
    );

    if (resolved.length > 0) {
      resolvedIds.push(...resolved);
    } else {
      logger.warn(`Could not resolve parentId "${requestedId}"`);
    }
  }

  // Deduplicate and return
  const uniqueIds = [...new Set(resolvedIds)];

  // If nothing resolved, fall back to direct-entry
  if (uniqueIds.length === 0) {
    logger.warn(`No parent IDs resolved, falling back to "direct-entry"`);
    return "direct-entry";
  }

  return uniqueIds.join(",");
}
