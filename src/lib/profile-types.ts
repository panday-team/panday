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

export const ELECTRICIAN_SPECIALIZATION = {
  CONSTRUCTION: "construction",
  INDUSTRIAL: "industrial",
  UNDECIDED: "undecided",
} as const;

export type ElectricianSpecialization =
  (typeof ELECTRICIAN_SPECIALIZATION)[keyof typeof ELECTRICIAN_SPECIALIZATION];

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
  specialization: ElectricianSpecialization;
  residencyStatus: ResidencyStatus;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProfileInput {
  trade: Trade;
  currentLevel: ApprenticeshipLevel;
  specialization: ElectricianSpecialization;
  residencyStatus: ResidencyStatus;
}

export interface UpdateUserProfileInput {
  trade?: Trade;
  currentLevel?: ApprenticeshipLevel;
  specialization?: ElectricianSpecialization;
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
 * Electrician specialization metadata for UI display
 */
export const SPECIALIZATION_METADATA: Record<
  ElectricianSpecialization,
  { label: string; description: string; redSealCode: string }
> = {
  [ELECTRICIAN_SPECIALIZATION.CONSTRUCTION]: {
    label: "Construction Electrician",
    description:
      "Install and maintain electrical systems in residential, commercial, and institutional buildings (309A - 3 year program)",
    redSealCode: "309A",
  },
  [ELECTRICIAN_SPECIALIZATION.INDUSTRIAL]: {
    label: "Industrial Electrician",
    description:
      "Work with high-voltage equipment and electrical controls in industrial facilities like factories and plants (442A - 4 year program)",
    redSealCode: "442A",
  },
  [ELECTRICIAN_SPECIALIZATION.UNDECIDED]: {
    label: "Undecided",
    description: "Still exploring which specialization to pursue",
    redSealCode: "N/A",
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
 * Get roadmap node IDs that should be dimmed based on specialization choice
 */
export function getIrrelevantNodes(
  specialization: ElectricianSpecialization,
): string[] {
  const specializationMap: Record<ElectricianSpecialization, string[]> = {
    [ELECTRICIAN_SPECIALIZATION.CONSTRUCTION]: [
      "level-4-industrial",
      "level-4-industrial-req-1",
      "level-4-industrial-req-2",
      "level-4-industrial-req-3",
    ],
    [ELECTRICIAN_SPECIALIZATION.INDUSTRIAL]: [
      "level-4-construction",
      "level-4-construction-req-1",
      "level-4-construction-req-2",
      "level-4-construction-req-3",
    ],
    [ELECTRICIAN_SPECIALIZATION.UNDECIDED]: [], // Show all paths
  };

  return specializationMap[specialization] ?? [];
}

/**
 * Get the node ID corresponding to user's current level
 */
export function getCurrentLevelNodeId(
  currentLevel: ApprenticeshipLevel,
  specialization?: ElectricianSpecialization,
): string | null {
  // For Level 4, use specialization to determine which node
  if (currentLevel === APPRENTICESHIP_LEVELS.LEVEL_4 && specialization) {
    if (specialization === ELECTRICIAN_SPECIALIZATION.INDUSTRIAL) {
      return "level-4-industrial";
    }
    if (specialization === ELECTRICIAN_SPECIALIZATION.CONSTRUCTION) {
      return "level-4-construction";
    }
    // For undecided, default to construction
    return "level-4-construction";
  }

  const levelNodeMap: Record<ApprenticeshipLevel, string | null> = {
    [APPRENTICESHIP_LEVELS.NOT_STARTED]: null,
    [APPRENTICESHIP_LEVELS.FOUNDATION]: "foundation-program",
    [APPRENTICESHIP_LEVELS.LEVEL_1]: "level-1",
    [APPRENTICESHIP_LEVELS.LEVEL_2]: "level-2",
    [APPRENTICESHIP_LEVELS.LEVEL_3]: "level-3",
    [APPRENTICESHIP_LEVELS.LEVEL_4]: "level-4-construction", // Default fallback
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
