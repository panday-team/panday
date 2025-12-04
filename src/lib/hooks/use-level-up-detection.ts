import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphNode, NodeContent } from "@/data/types/roadmap";
import type { NodeStatus } from "@/lib/node-status";
import { calculateNodeProgress, type ProgressData } from "@/lib/progress-utils";
import {
  type ApprenticeshipLevel,
  type ElectricianSpecialization,
  getCurrentLevelNodeId,
  getNextLevelProgression,
} from "@/lib/profile-types";

export interface LevelUpState {
  isLevelComplete: boolean;
  completedNodeId: string | null;
  completedNodeTitle: string | null;
  progress: ProgressData | null;
}

interface UseLevelUpDetectionOptions {
  userCurrentLevel: ApprenticeshipLevel | null;
  specialization: ElectricianSpecialization | null;
  nodeStatuses: Record<string, NodeStatus>;
  graphNodes: GraphNode[];
  contentMap: Map<string, NodeContent>;
  enabled?: boolean;
}

/**
 * Hook to detect when a user completes all checklists for their current level
 * Returns state indicating if level-up celebration should be shown
 */
export function useLevelUpDetection({
  userCurrentLevel,
  specialization,
  nodeStatuses,
  graphNodes,
  contentMap,
  enabled = true,
}: UseLevelUpDetectionOptions): LevelUpState & {
  clearLevelUp: () => void;
  checkLevelCompletion: () => void;
} {
  const [levelUpState, setLevelUpState] = useState<LevelUpState>({
    isLevelComplete: false,
    completedNodeId: null,
    completedNodeTitle: null,
    progress: null,
  });

  // Track which levels we've already shown celebration for (to avoid repeated triggers)
  const celebratedLevelsRef = useRef<Set<string>>(new Set());

  // Track previous progress to detect completion moment
  const prevProgressRef = useRef<number | null>(null);

  const clearLevelUp = useCallback(() => {
    setLevelUpState({
      isLevelComplete: false,
      completedNodeId: null,
      completedNodeTitle: null,
      progress: null,
    });
  }, []);

  const checkLevelCompletion = useCallback(() => {
    if (!enabled || !userCurrentLevel) {
      return;
    }

    // Get the node ID for the user's current level
    const currentLevelNodeId = getCurrentLevelNodeId(
      userCurrentLevel,
      specialization ?? undefined,
    );

    if (!currentLevelNodeId) {
      return;
    }

    // Check if we already celebrated this level
    const celebrationKey = `${userCurrentLevel}-${currentLevelNodeId}`;
    if (celebratedLevelsRef.current.has(celebrationKey)) {
      return;
    }

    // Get the content for the current level node
    const nodeContent = contentMap.get(currentLevelNodeId);
    if (!nodeContent) {
      return;
    }

    // Calculate progress for the current level hub node
    const progress = calculateNodeProgress(
      currentLevelNodeId,
      nodeContent.frontmatter.type,
      nodeStatuses,
      graphNodes,
      contentMap,
    );

    if (!progress || progress.total === 0) {
      return;
    }

    // Check if just completed (100% now, but wasn't before)
    const isNowComplete = progress.percentage === 100;
    const wasNotComplete =
      prevProgressRef.current !== null && prevProgressRef.current < 100;

    // Update previous progress
    prevProgressRef.current = progress.percentage;

    // Only trigger if this is the moment of completion
    if (isNowComplete && wasNotComplete) {
      // Mark as celebrated to avoid repeat triggers
      celebratedLevelsRef.current.add(celebrationKey);

      setLevelUpState({
        isLevelComplete: true,
        completedNodeId: currentLevelNodeId,
        completedNodeTitle: nodeContent.frontmatter.title,
        progress,
      });
    }
  }, [
    enabled,
    userCurrentLevel,
    specialization,
    nodeStatuses,
    graphNodes,
    contentMap,
  ]);

  // Check for level completion whenever nodeStatuses change
  useEffect(() => {
    checkLevelCompletion();
  }, [checkLevelCompletion]);

  // Initialize previous progress on mount
  useEffect(() => {
    if (!enabled || !userCurrentLevel) {
      return;
    }

    const currentLevelNodeId = getCurrentLevelNodeId(
      userCurrentLevel,
      specialization ?? undefined,
    );

    if (!currentLevelNodeId) {
      return;
    }

    const nodeContent = contentMap.get(currentLevelNodeId);
    if (!nodeContent) {
      return;
    }

    const progress = calculateNodeProgress(
      currentLevelNodeId,
      nodeContent.frontmatter.type,
      nodeStatuses,
      graphNodes,
      contentMap,
    );

    if (progress) {
      prevProgressRef.current = progress.percentage;

      // If already 100% on mount, mark as celebrated to avoid immediate trigger
      if (progress.percentage === 100) {
        const celebrationKey = `${userCurrentLevel}-${currentLevelNodeId}`;
        celebratedLevelsRef.current.add(celebrationKey);
      }
    }
    // Only run on mount, not on every dependency change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...levelUpState,
    clearLevelUp,
    checkLevelCompletion,
  };
}

/**
 * Get information about the next level for display purposes
 */
export function useNextLevelInfo(
  currentLevel: ApprenticeshipLevel | null,
  specialization: ElectricianSpecialization | null,
) {
  if (!currentLevel) {
    return null;
  }

  const progression = getNextLevelProgression(
    currentLevel,
    specialization ?? undefined,
  );

  return progression;
}
