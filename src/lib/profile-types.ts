/**
 * User profile types and constants for onboarding and personalization
 */

export const TRADES = {
  ELECTRICIAN: "electrician",
  EXPLORING: "exploring",
  OTHER: "other",
} as const;

export type Trade = (typeof TRADES)[keyof typeof TRADES];

export const APPRENTICESHIP_LEVELS = {
  NOT_STARTED: "not-started",
  FOUNDATION: "foundation",
  LEVEL_1: "level-1",
  LEVEL_2: "level-2",
  LEVEL_3: "level-3",
  LEVEL_4: "level-4",
  RED_SEAL: "red-seal",
} as const;

export type ApprenticeshipLevel =
  (typeof APPRENTICESHIP_LEVELS)[keyof typeof APPRENTICESHIP_LEVELS];

export const ENTRY_PATHS = {
  FOUNDATION: "foundation",
  ACE_IT: "ace-it",
  DIRECT_ENTRY: "direct-entry",
  EXPLORING: "exploring",
} as const;

export type EntryPath = (typeof ENTRY_PATHS)[keyof typeof ENTRY_PATHS];

export const RESIDENCY_STATUS = {
  CITIZEN: "citizen",
  PERMANENT_RESIDENT: "permanent-resident",
  OTHER: "other",
} as const;

export type ResidencyStatus =
  (typeof RESIDENCY_STATUS)[keyof typeof RESIDENCY_STATUS];

export interface UserProfile {
  id: number;
  clerkUserId: string;
  trade: Trade;
  currentLevel: ApprenticeshipLevel;
  entryPath: EntryPath;
  residencyStatus: ResidencyStatus;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProfileInput {
  trade: Trade;
  currentLevel: ApprenticeshipLevel;
  entryPath: EntryPath;
  residencyStatus: ResidencyStatus;
}

export interface UpdateUserProfileInput {
  trade?: Trade;
  currentLevel?: ApprenticeshipLevel;
  entryPath?: EntryPath;
  residencyStatus?: ResidencyStatus;
}

/**
 * Trade metadata for UI display
 */
export const TRADE_METADATA: Record<
  Trade,
  { label: string; description: string; icon: string }
> = {
  [TRADES.ELECTRICIAN]: {
    label: "Electrician",
    description: "Construction or industrial electrical work",
    icon: "⚡",
  },
  [TRADES.EXPLORING]: {
    label: "Exploring Options",
    description: "Still deciding which trade to pursue",
    icon: "🔍",
  },
  [TRADES.OTHER]: {
    label: "Other Trade",
    description: "Another skilled trade (coming soon)",
    icon: "🛠️",
  },
};

/**
 * Apprenticeship level metadata for UI display
 */
export const LEVEL_METADATA: Record<
  ApprenticeshipLevel,
  { label: string; shortLabel: string; description: string }
> = {
  [APPRENTICESHIP_LEVELS.NOT_STARTED]: {
    label: "Not Started",
    shortLabel: "Start",
    description: "Haven't begun apprenticeship yet",
  },
  [APPRENTICESHIP_LEVELS.FOUNDATION]: {
    label: "Foundation Program",
    shortLabel: "Foundation",
    description: "Completing foundation training",
  },
  [APPRENTICESHIP_LEVELS.LEVEL_1]: {
    label: "Level 1",
    shortLabel: "L1",
    description: "First year of apprenticeship",
  },
  [APPRENTICESHIP_LEVELS.LEVEL_2]: {
    label: "Level 2",
    shortLabel: "L2",
    description: "Second year of apprenticeship",
  },
  [APPRENTICESHIP_LEVELS.LEVEL_3]: {
    label: "Level 3",
    shortLabel: "L3",
    description: "Third year of apprenticeship",
  },
  [APPRENTICESHIP_LEVELS.LEVEL_4]: {
    label: "Level 4",
    shortLabel: "L4",
    description: "Final year of apprenticeship",
  },
  [APPRENTICESHIP_LEVELS.RED_SEAL]: {
    label: "Red Seal Certified",
    shortLabel: "Red Seal",
    description: "Completed Red Seal certification",
  },
};

/**
 * Entry path metadata for UI display
 */
export const ENTRY_PATH_METADATA: Record<
  EntryPath,
  { label: string; description: string }
> = {
  [ENTRY_PATHS.FOUNDATION]: {
    label: "Foundation Program",
    description: "16-week pre-apprenticeship program before Level 1",
  },
  [ENTRY_PATHS.ACE_IT]: {
    label: "ACE-IT Program",
    description: "Accelerated program combining high school and apprenticeship",
  },
  [ENTRY_PATHS.DIRECT_ENTRY]: {
    label: "Direct Entry",
    description: "Start directly at Level 1 with employer sponsorship",
  },
  [ENTRY_PATHS.EXPLORING]: {
    label: "Still Deciding",
    description: "Exploring different entry paths",
  },
};

/**
 * Residency status metadata for UI display
 */
export const RESIDENCY_STATUS_METADATA: Record<
  ResidencyStatus,
  { label: string; description: string; eligible: boolean }
> = {
  [RESIDENCY_STATUS.CITIZEN]: {
    label: "Canadian Citizen",
    description: "I am a Canadian citizen",
    eligible: true,
  },
  [RESIDENCY_STATUS.PERMANENT_RESIDENT]: {
    label: "Permanent Resident",
    description: "I have permanent resident (PR) status",
    eligible: true,
  },
  [RESIDENCY_STATUS.OTHER]: {
    label: "Other",
    description: "Work permit, student visa, or other status",
    eligible: false,
  },
};

/**
 * Get all levels that should be marked as completed based on current level
 */
export function getCompletedLevels(
  currentLevel: ApprenticeshipLevel,
): string[] {
  const levelOrder = [
    APPRENTICESHIP_LEVELS.NOT_STARTED,
    APPRENTICESHIP_LEVELS.FOUNDATION,
    APPRENTICESHIP_LEVELS.LEVEL_1,
    APPRENTICESHIP_LEVELS.LEVEL_2,
    APPRENTICESHIP_LEVELS.LEVEL_3,
    APPRENTICESHIP_LEVELS.LEVEL_4,
    APPRENTICESHIP_LEVELS.RED_SEAL,
  ];

  const currentIndex = levelOrder.indexOf(currentLevel);
  if (currentIndex <= 0) return [];

  return levelOrder.slice(0, currentIndex);
}

/**
 * Get roadmap node IDs that should be dimmed based on entry path
 */
export function getIrrelevantPaths(entryPath: EntryPath): string[] {
  const pathMap: Record<EntryPath, string[]> = {
    [ENTRY_PATHS.FOUNDATION]: ["ace-it", "direct-entry"],
    [ENTRY_PATHS.ACE_IT]: ["foundation-program", "direct-entry"],
    [ENTRY_PATHS.DIRECT_ENTRY]: ["foundation-program", "ace-it"],
    [ENTRY_PATHS.EXPLORING]: [], // Show all paths
  };

  return pathMap[entryPath] ?? [];
}

/**
 * Get the node ID corresponding to user's current level
 */
export function getCurrentLevelNodeId(
  currentLevel: ApprenticeshipLevel,
): string | null {
  const levelNodeMap: Record<ApprenticeshipLevel, string | null> = {
    [APPRENTICESHIP_LEVELS.NOT_STARTED]: null,
    [APPRENTICESHIP_LEVELS.FOUNDATION]: "foundation-program",
    [APPRENTICESHIP_LEVELS.LEVEL_1]: "level-1",
    [APPRENTICESHIP_LEVELS.LEVEL_2]: "level-2",
    [APPRENTICESHIP_LEVELS.LEVEL_3]: "level-3",
    [APPRENTICESHIP_LEVELS.LEVEL_4]: "level-4-construction", // Default to construction
    [APPRENTICESHIP_LEVELS.RED_SEAL]: "red-seal-certification",
  };

  return levelNodeMap[currentLevel] ?? null;
}

/**
 * Check if user is eligible for apprenticeship programs
 */
export function isEligibleForApprenticeship(
  residencyStatus: ResidencyStatus,
): boolean {
  return RESIDENCY_STATUS_METADATA[residencyStatus].eligible;
}
