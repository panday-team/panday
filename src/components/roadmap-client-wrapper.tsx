"use client";

import { useState, useCallback } from "react";
import { RoadmapFlow } from "@/components/roadmap-flow";
import { logger } from "@/lib/logger";
import type { Roadmap } from "@/data/types/roadmap";
import type { UserProfile } from "@/lib/profile-types";

interface RoadmapClientWrapperProps {
  roadmap: Roadmap;
  userProfile: UserProfile | null;
  initialCustomNodes: Array<{
    id: string;
    parentId: string;
    title: string;
    description: string;
    type: string;
    status: string;
  }>;
  userId: string | null;
}

export function RoadmapClientWrapper({
  roadmap,
  userProfile,
  initialCustomNodes,
  userId,
}: RoadmapClientWrapperProps) {
  const [customNodes, setCustomNodes] = useState(initialCustomNodes);
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useState<
    string | undefined
  >();

  const refreshCustomNodes = useCallback(
    async (nodeId?: string) => {
      if (!userId) return;

      try {
        const response = await fetch(
          `/api/custom-nodes?roadmapId=${roadmap.metadata.id}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch custom nodes");
        }

        const data = (await response.json()) as {
          nodes: typeof initialCustomNodes;
        };

        setCustomNodes(data.nodes);

        // Set the newly created node ID for viewport panning
        if (nodeId) {
          setNewlyCreatedNodeId(nodeId);
        }
      } catch (error) {
        logger.error("Failed to refresh custom nodes", error as Error, {
          userId,
          roadmapId: roadmap.metadata.id,
          component: "roadmap-client-wrapper",
        });
        // Don't show alert here - errors are handled at the call site
      }
    },
    [userId, roadmap.metadata.id],
  );

  return (
    <RoadmapFlow
      roadmap={roadmap}
      userProfile={userProfile}
      customNodes={customNodes}
      onRefreshCustomNodes={refreshCustomNodes}
      newlyCreatedNodeId={newlyCreatedNodeId}
      onNodePanned={() => setNewlyCreatedNodeId(undefined)}
    />
  );
}
