"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { RoadmapFlow } from "@/components/roadmap-flow";
import { Note } from "@/components/ui/note-taker";
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
  const searchParams = useSearchParams();
  const [customNodes, setCustomNodes] = useState(initialCustomNodes);
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useState<
    string | undefined
  >();

  // Read initial node ID from URL query params for deep linking
  // URL format: /roadmap?node=foundation-program
  const [initialNodeId, setInitialNodeId] = useState<string | undefined>();

  useEffect(() => {
    const nodeParam = searchParams.get("node");
    if (nodeParam) {
      setInitialNodeId(nodeParam);
    }
  }, [searchParams]);

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
    <div className="flex h-screen">
      <div className="flex-1">
        <RoadmapFlow
          roadmap={roadmap}
          userProfile={userProfile}
          customNodes={customNodes}
          onRefreshCustomNodes={refreshCustomNodes}
          newlyCreatedNodeId={newlyCreatedNodeId}
          onNodePanned={() => setNewlyCreatedNodeId(undefined)}
          initialSelectedNodeId={initialNodeId}
          onInitialNodeHandled={() => setInitialNodeId(undefined)}
        />
      </div>
      <div className="w-80 border-l border-border bg-card">
        <div className="p-4 h-full">
          <Note
            id="roadmap-notes"
            onSave={async (content) => {
              // TODO: Implement note saving to backend
              console.log('Saving note:', content);
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 1000));
            }}
          />
        </div>
      </div>
    </div>
  );
}

