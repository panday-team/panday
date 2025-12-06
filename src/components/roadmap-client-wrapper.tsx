"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { RoadmapFlow } from "@/components/roadmap-flow";
import { Note } from "@/components/ui/note-taker";
import { logger } from "@/lib/logger";
import type { Roadmap } from "@/data/types/roadmap";
import type { UserProfile, ApprenticeshipLevel } from "@/lib/profile-types";

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

// API response type for profile endpoint
interface ProfileApiResponse {
  id: number;
  clerkUserId: string;
  trade: string;
  currentLevel: string;
  specialization: string | null;
  residencyStatus: string;
  pendingLevelUp: string | null;
  onboardingCompletedAt: string | null;
  tutorialCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function RoadmapClientWrapper({
  roadmap,
  userProfile: initialUserProfile,
  initialCustomNodes,
  userId,
}: RoadmapClientWrapperProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [customNodes, setCustomNodes] = useState(initialCustomNodes);
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useState<
    string | undefined
  >();

  // Local state for userProfile to allow updates without full page refresh
  const [userProfile, setUserProfile] = useState(initialUserProfile);

  // Read initial node ID from URL query params for deep linking
  // URL format: /roadmap?node=foundation-program
  const [initialNodeId, setInitialNodeId] = useState<string | undefined>();

  // Read showTutorial param from URL (set when coming from onboarding or reset-demo)
  const showTutorialOnMount = searchParams.get("showTutorial") === "true";

  // Callback to remove showTutorial param from URL after tutorial is dismissed
  const handleTutorialDismissed = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("showTutorial");
    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.replace(newUrl);
  }, [searchParams, pathname, router]);

  useEffect(() => {
    const nodeParam = searchParams.get("node");
    if (nodeParam) {
      setInitialNodeId(nodeParam);
    }
  }, [searchParams]);

  // Refetch profile when page becomes visible (user navigates back from settings)
  useEffect(() => {
    if (!userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refetch profile to get latest data
        fetch("/api/profile")
          .then((res) => {
            if (res.ok) return res.json() as Promise<ProfileApiResponse>;
            throw new Error("Failed to fetch profile");
          })
          .then((data) => {
            setUserProfile((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                currentLevel: data.currentLevel as ApprenticeshipLevel,
                pendingLevelUp:
                  (data.pendingLevelUp as ApprenticeshipLevel) ?? null,
                tutorialCompletedAt: data.tutorialCompletedAt
                  ? new Date(data.tutorialCompletedAt)
                  : null,
              };
            });
          })
          .catch((error) => {
            logger.error(
              "Failed to refresh profile on visibility change",
              error as Error,
            );
          });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId]);

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

  // Callback to update user profile after level advancement
  const handleProfileUpdate = useCallback((updates: Partial<UserProfile>) => {
    setUserProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <>
      <RoadmapFlow
        roadmap={roadmap}
        userProfile={userProfile}
        customNodes={customNodes}
        onRefreshCustomNodes={refreshCustomNodes}
        newlyCreatedNodeId={newlyCreatedNodeId}
        onNodePanned={() => setNewlyCreatedNodeId(undefined)}
        initialSelectedNodeId={initialNodeId}
        onInitialNodeHandled={() => setInitialNodeId(undefined)}
        onProfileUpdate={handleProfileUpdate}
        showTutorialOnMount={showTutorialOnMount}
        onTutorialDismissed={handleTutorialDismissed}
      />
      <Note id="roadmap-notes" />
    </>
  );
}
