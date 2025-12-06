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
  ACE_IT: "ace-it",
  DIRECT_ENTRY: "direct-entry",
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
  tutorialCompletedAt: Date | null;
  pendingLevelUp: ApprenticeshipLevel | null; // Set when user clicks "Stay Here" after completing a level
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
    label: "Not Started Yet",
    shortLabel: "Start",
    description: "Researching options, haven't enrolled in any program",
  },
  [APPRENTICESHIP_LEVELS.ACE_IT]: {
    label: "ACE IT Program",
    shortLabel: "ACE IT",
    description: "High school accelerated credit enrollment program",
  },
  [APPRENTICESHIP_LEVELS.DIRECT_ENTRY]: {
    label: "Direct Entry",
    shortLabel: "Direct",
    description: "Registered apprentice starting with an employer sponsor",
  },
  [APPRENTICESHIP_LEVELS.FOUNDATION]: {
    label: "Foundation Program",
    shortLabel: "Foundation",
    description: "Completing pre-apprenticeship foundation training",
  },
  [APPRENTICESHIP_LEVELS.LEVEL_1]: {
    label: "Level 1",
    shortLabel: "L1",
    description: "First year of apprenticeship training",
  },
  [APPRENTICESHIP_LEVELS.LEVEL_2]: {
    label: "Level 2",
    shortLabel: "L2",
    description: "Second year of apprenticeship training",
  },
  [APPRENTICESHIP_LEVELS.LEVEL_3]: {
    label: "Level 3",
    shortLabel: "L3",
    description: "Third year of apprenticeship training",
  },
  [APPRENTICESHIP_LEVELS.LEVEL_4]: {
    label: "Level 4",
    shortLabel: "L4",
    description: "Final year of apprenticeship training",
  },
  [APPRENTICESHIP_LEVELS.RED_SEAL]: {
    label: "Red Seal Certified",
    shortLabel: "Red Seal",
    description: "Already completed Red Seal certification",
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
    APPRENTICESHIP_LEVELS.ACE_IT,
    APPRENTICESHIP_LEVELS.DIRECT_ENTRY,
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
 * Get roadmap node IDs that should be dimmed based on specialization choice and current level
 */
export function getIrrelevantNodes(
  specialization: ElectricianSpecialization,
  currentLevel?: ApprenticeshipLevel,
): string[] {
  const irrelevantNodes: string[] = [];

  // Grey out irrelevant Level 4 specialization paths and their Red Seal endpoints
  const specializationMap: Record<ElectricianSpecialization, string[]> = {
    [ELECTRICIAN_SPECIALIZATION.CONSTRUCTION]: [
      "level-4-industrial",
      "red-seal-industrial",
    ],
    [ELECTRICIAN_SPECIALIZATION.INDUSTRIAL]: [
      "level-4-construction",
      "red-seal-construction",
    ],
    [ELECTRICIAN_SPECIALIZATION.UNDECIDED]: [], // Show all paths
  };

  irrelevantNodes.push(...(specializationMap[specialization] ?? []));

  // Grey out irrelevant entry paths based on current level
  if (currentLevel) {
    if (currentLevel === APPRENTICESHIP_LEVELS.ACE_IT) {
      // User in ACE IT - grey out other entry paths
      irrelevantNodes.push("direct-entry", "foundation-program");
    } else if (currentLevel === APPRENTICESHIP_LEVELS.DIRECT_ENTRY) {
      // User in Direct Entry - grey out other entry paths
      irrelevantNodes.push("ace-it-program", "foundation-program");
    } else if (currentLevel === APPRENTICESHIP_LEVELS.FOUNDATION) {
      // User in Foundation - grey out other entry paths
      irrelevantNodes.push("ace-it-program", "direct-entry");
    } else if (currentLevel === APPRENTICESHIP_LEVELS.LEVEL_1) {
      // User at Level 1 took Direct Entry - grey out other entry paths
      irrelevantNodes.push("ace-it-program", "foundation-program");
    } else if (currentLevel !== APPRENTICESHIP_LEVELS.NOT_STARTED) {
      // User at Level 2+ has passed entry stage - grey out all entry paths
      irrelevantNodes.push(
        "ace-it-program",
        "direct-entry",
        "foundation-program",
      );
    }
  }

  return irrelevantNodes;
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

  // For Red Seal, use specialization to determine which certification
  if (currentLevel === APPRENTICESHIP_LEVELS.RED_SEAL && specialization) {
    if (specialization === ELECTRICIAN_SPECIALIZATION.INDUSTRIAL) {
      return "red-seal-industrial";
    }
    if (specialization === ELECTRICIAN_SPECIALIZATION.CONSTRUCTION) {
      return "red-seal-construction";
    }
    // For undecided, default to construction
    return "red-seal-construction";
  }

  const levelNodeMap: Record<ApprenticeshipLevel, string | null> = {
    [APPRENTICESHIP_LEVELS.NOT_STARTED]: null,
    [APPRENTICESHIP_LEVELS.ACE_IT]: "ace-it-program",
    [APPRENTICESHIP_LEVELS.DIRECT_ENTRY]: "direct-entry",
    [APPRENTICESHIP_LEVELS.FOUNDATION]: "foundation-program",
    [APPRENTICESHIP_LEVELS.LEVEL_1]: "level-1",
    [APPRENTICESHIP_LEVELS.LEVEL_2]: "level-2",
    [APPRENTICESHIP_LEVELS.LEVEL_3]: "level-3",
    [APPRENTICESHIP_LEVELS.LEVEL_4]: "level-4-construction", // Default fallback
    [APPRENTICESHIP_LEVELS.RED_SEAL]: "red-seal-construction", // Default fallback
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

/**
 * Level progression mapping - defines which level comes after a given level
 * Takes into account specialization for Level 4 transitions
 */
export interface LevelProgression {
  nextLevel: ApprenticeshipLevel | null;
  nextNodeId: string | null;
  isFinalLevel: boolean;
  celebrationMessage: string;
}

/**
 * Get the next level progression based on current level and specialization
 */
export function getNextLevelProgression(
  currentLevel: ApprenticeshipLevel,
  specialization?: ElectricianSpecialization,
): LevelProgression {
  // Entry paths all lead to Level 1
  if (
    currentLevel === APPRENTICESHIP_LEVELS.ACE_IT ||
    currentLevel === APPRENTICESHIP_LEVELS.DIRECT_ENTRY ||
    currentLevel === APPRENTICESHIP_LEVELS.FOUNDATION
  ) {
    return {
      nextLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
      nextNodeId: "level-1",
      isFinalLevel: false,
      celebrationMessage: "You're ready to start Level 1!",
    };
  }

  // Not started leads to exploring entry paths (no auto-advance)
  if (currentLevel === APPRENTICESHIP_LEVELS.NOT_STARTED) {
    return {
      nextLevel: null,
      nextNodeId: null,
      isFinalLevel: false,
      celebrationMessage: "Time to choose your entry path!",
    };
  }

  // Level 1 → Level 2
  if (currentLevel === APPRENTICESHIP_LEVELS.LEVEL_1) {
    return {
      nextLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
      nextNodeId: "level-2",
      isFinalLevel: false,
      celebrationMessage: "Level 1 complete! Onward to Level 2!",
    };
  }

  // Level 2 → Level 3
  if (currentLevel === APPRENTICESHIP_LEVELS.LEVEL_2) {
    return {
      nextLevel: APPRENTICESHIP_LEVELS.LEVEL_3,
      nextNodeId: "level-3",
      isFinalLevel: false,
      celebrationMessage: "Level 2 complete! Level 3 awaits!",
    };
  }

  // Level 3 → Level 4 (specialization-dependent)
  if (currentLevel === APPRENTICESHIP_LEVELS.LEVEL_3) {
    const isIndustrial =
      specialization === ELECTRICIAN_SPECIALIZATION.INDUSTRIAL;
    return {
      nextLevel: APPRENTICESHIP_LEVELS.LEVEL_4,
      nextNodeId: isIndustrial ? "level-4-industrial" : "level-4-construction",
      isFinalLevel: false,
      celebrationMessage: "Level 3 complete! Final year begins!",
    };
  }

  // Level 4 → Red Seal (specialization-dependent)
  if (currentLevel === APPRENTICESHIP_LEVELS.LEVEL_4) {
    const isIndustrial =
      specialization === ELECTRICIAN_SPECIALIZATION.INDUSTRIAL;
    return {
      nextLevel: APPRENTICESHIP_LEVELS.RED_SEAL,
      nextNodeId: isIndustrial
        ? "red-seal-industrial"
        : "red-seal-construction",
      isFinalLevel: true,
      celebrationMessage:
        "All training complete! You're ready for your Red Seal exam!",
    };
  }

  // Red Seal is the final level
  if (currentLevel === APPRENTICESHIP_LEVELS.RED_SEAL) {
    return {
      nextLevel: null,
      nextNodeId: null,
      isFinalLevel: true,
      celebrationMessage:
        "Congratulations! You've achieved Red Seal certification!",
    };
  }

  // Fallback
  return {
    nextLevel: null,
    nextNodeId: null,
    isFinalLevel: false,
    celebrationMessage: "Keep up the great work!",
  };
}

/**
 * Get the node ID that corresponds to a given level
 * Used to check if a hub node completion should trigger level advancement
 */
export function getNodeIdForLevel(
  level: ApprenticeshipLevel,
  specialization?: ElectricianSpecialization,
): string | null {
  return getCurrentLevelNodeId(level, specialization);
}

/**
 * Check if completing a specific node should trigger level-up celebration
 * Returns the user's current level if the node matches their current level
 */
export function shouldTriggerLevelUp(
  completedNodeId: string,
  userCurrentLevel: ApprenticeshipLevel,
  specialization?: ElectricianSpecialization,
): boolean {
  const currentLevelNodeId = getCurrentLevelNodeId(
    userCurrentLevel,
    specialization,
  );
  return completedNodeId === currentLevelNodeId;
}

/**
 * Check if the user needs to choose a specialization before advancing to the next level
 * This is required when advancing from Level 3 to Level 4 with an "undecided" specialization
 */
export function requiresSpecializationChoice(
  currentLevel: ApprenticeshipLevel,
  specialization?: ElectricianSpecialization,
): boolean {
  return (
    currentLevel === APPRENTICESHIP_LEVELS.LEVEL_3 &&
    specialization === ELECTRICIAN_SPECIALIZATION.UNDECIDED
  );
}
