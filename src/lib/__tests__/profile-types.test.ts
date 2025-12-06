import { describe, it, expect } from "vitest";
import {
  APPRENTICESHIP_LEVELS,
  ELECTRICIAN_SPECIALIZATION,
  RESIDENCY_STATUS,
  getCompletedLevels,
  getIrrelevantNodes,
  getCurrentLevelNodeId,
  isEligibleForApprenticeship,
  getNextLevelProgression,
  shouldTriggerLevelUp,
} from "../profile-types";

describe("profile-types utilities", () => {
  describe("getCompletedLevels", () => {
    it("should return empty array for NOT_STARTED level", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.NOT_STARTED);
      expect(result).toEqual([]);
    });

    it("should return [NOT_STARTED] for ACE_IT level", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.ACE_IT);
      expect(result).toEqual([APPRENTICESHIP_LEVELS.NOT_STARTED]);
    });

    it("should return [NOT_STARTED, ACE_IT] for DIRECT_ENTRY level", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.DIRECT_ENTRY);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.ACE_IT,
      ]);
    });

    it("should return entry paths and NOT_STARTED for FOUNDATION level", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.FOUNDATION);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.ACE_IT,
        APPRENTICESHIP_LEVELS.DIRECT_ENTRY,
      ]);
    });

    it("should return all entry paths for LEVEL_1", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.LEVEL_1);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.ACE_IT,
        APPRENTICESHIP_LEVELS.DIRECT_ENTRY,
        APPRENTICESHIP_LEVELS.FOUNDATION,
      ]);
    });

    it("should return all previous levels for LEVEL_2", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.LEVEL_2);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.ACE_IT,
        APPRENTICESHIP_LEVELS.DIRECT_ENTRY,
        APPRENTICESHIP_LEVELS.FOUNDATION,
        APPRENTICESHIP_LEVELS.LEVEL_1,
      ]);
    });

    it("should return all previous levels for LEVEL_3", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.LEVEL_3);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.ACE_IT,
        APPRENTICESHIP_LEVELS.DIRECT_ENTRY,
        APPRENTICESHIP_LEVELS.FOUNDATION,
        APPRENTICESHIP_LEVELS.LEVEL_1,
        APPRENTICESHIP_LEVELS.LEVEL_2,
      ]);
    });

    it("should return all previous levels for LEVEL_4", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.LEVEL_4);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.ACE_IT,
        APPRENTICESHIP_LEVELS.DIRECT_ENTRY,
        APPRENTICESHIP_LEVELS.FOUNDATION,
        APPRENTICESHIP_LEVELS.LEVEL_1,
        APPRENTICESHIP_LEVELS.LEVEL_2,
        APPRENTICESHIP_LEVELS.LEVEL_3,
      ]);
    });

    it("should return all levels except RED_SEAL for RED_SEAL", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.RED_SEAL);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.ACE_IT,
        APPRENTICESHIP_LEVELS.DIRECT_ENTRY,
        APPRENTICESHIP_LEVELS.FOUNDATION,
        APPRENTICESHIP_LEVELS.LEVEL_1,
        APPRENTICESHIP_LEVELS.LEVEL_2,
        APPRENTICESHIP_LEVELS.LEVEL_3,
        APPRENTICESHIP_LEVELS.LEVEL_4,
      ]);
    });
  });

  describe("getIrrelevantNodes", () => {
    it("should return industrial nodes for CONSTRUCTION specialization", () => {
      const result = getIrrelevantNodes(
        ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
      );
      expect(result).toEqual(["level-4-industrial", "red-seal-industrial"]);
    });

    it("should return construction nodes for INDUSTRIAL specialization", () => {
      const result = getIrrelevantNodes(ELECTRICIAN_SPECIALIZATION.INDUSTRIAL);
      expect(result).toEqual(["level-4-construction", "red-seal-construction"]);
    });

    it("should return empty array for UNDECIDED specialization", () => {
      const result = getIrrelevantNodes(ELECTRICIAN_SPECIALIZATION.UNDECIDED);
      expect(result).toEqual([]);
    });
  });

  describe("getCurrentLevelNodeId", () => {
    it("should return null for NOT_STARTED level", () => {
      const result = getCurrentLevelNodeId(APPRENTICESHIP_LEVELS.NOT_STARTED);
      expect(result).toBeNull();
    });

    it("should return foundation-program for FOUNDATION level", () => {
      const result = getCurrentLevelNodeId(APPRENTICESHIP_LEVELS.FOUNDATION);
      expect(result).toBe("foundation-program");
    });

    it("should return level-1 for LEVEL_1", () => {
      const result = getCurrentLevelNodeId(APPRENTICESHIP_LEVELS.LEVEL_1);
      expect(result).toBe("level-1");
    });

    it("should return level-2 for LEVEL_2", () => {
      const result = getCurrentLevelNodeId(APPRENTICESHIP_LEVELS.LEVEL_2);
      expect(result).toBe("level-2");
    });

    it("should return level-3 for LEVEL_3", () => {
      const result = getCurrentLevelNodeId(APPRENTICESHIP_LEVELS.LEVEL_3);
      expect(result).toBe("level-3");
    });

    it("should return level-4-construction for LEVEL_4 (defaults to construction)", () => {
      const result = getCurrentLevelNodeId(APPRENTICESHIP_LEVELS.LEVEL_4);
      expect(result).toBe("level-4-construction");
    });

    it("should return level-4-construction for LEVEL_4 with CONSTRUCTION specialization", () => {
      const result = getCurrentLevelNodeId(
        APPRENTICESHIP_LEVELS.LEVEL_4,
        ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
      );
      expect(result).toBe("level-4-construction");
    });

    it("should return level-4-industrial for LEVEL_4 with INDUSTRIAL specialization", () => {
      const result = getCurrentLevelNodeId(
        APPRENTICESHIP_LEVELS.LEVEL_4,
        ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
      );
      expect(result).toBe("level-4-industrial");
    });

    it("should return level-4-construction for LEVEL_4 with UNDECIDED specialization", () => {
      const result = getCurrentLevelNodeId(
        APPRENTICESHIP_LEVELS.LEVEL_4,
        ELECTRICIAN_SPECIALIZATION.UNDECIDED,
      );
      expect(result).toBe("level-4-construction");
    });

    it("should return red-seal-construction for RED_SEAL without specialization (defaults to construction)", () => {
      const result = getCurrentLevelNodeId(APPRENTICESHIP_LEVELS.RED_SEAL);
      expect(result).toBe("red-seal-construction");
    });

    it("should return red-seal-construction for RED_SEAL with CONSTRUCTION specialization", () => {
      const result = getCurrentLevelNodeId(
        APPRENTICESHIP_LEVELS.RED_SEAL,
        ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
      );
      expect(result).toBe("red-seal-construction");
    });

    it("should return red-seal-industrial for RED_SEAL with INDUSTRIAL specialization", () => {
      const result = getCurrentLevelNodeId(
        APPRENTICESHIP_LEVELS.RED_SEAL,
        ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
      );
      expect(result).toBe("red-seal-industrial");
    });
  });

  describe("isEligibleForApprenticeship", () => {
    it("should return true for CITIZEN status", () => {
      const result = isEligibleForApprenticeship(RESIDENCY_STATUS.CITIZEN);
      expect(result).toBe(true);
    });

    it("should return true for PERMANENT_RESIDENT status", () => {
      const result = isEligibleForApprenticeship(
        RESIDENCY_STATUS.PERMANENT_RESIDENT,
      );
      expect(result).toBe(true);
    });

    it("should return false for OTHER status", () => {
      const result = isEligibleForApprenticeship(RESIDENCY_STATUS.OTHER);
      expect(result).toBe(false);
    });
  });

  describe("getNextLevelProgression", () => {
    it("should return Level 1 for entry paths (ACE_IT)", () => {
      const result = getNextLevelProgression(APPRENTICESHIP_LEVELS.ACE_IT);
      expect(result.nextLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_1);
      expect(result.nextNodeId).toBe("level-1");
      expect(result.isFinalLevel).toBe(false);
    });

    it("should return Level 1 for entry paths (FOUNDATION)", () => {
      const result = getNextLevelProgression(APPRENTICESHIP_LEVELS.FOUNDATION);
      expect(result.nextLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_1);
      expect(result.nextNodeId).toBe("level-1");
      expect(result.isFinalLevel).toBe(false);
    });

    it("should return Level 1 for entry paths (DIRECT_ENTRY)", () => {
      const result = getNextLevelProgression(
        APPRENTICESHIP_LEVELS.DIRECT_ENTRY,
      );
      expect(result.nextLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_1);
      expect(result.nextNodeId).toBe("level-1");
      expect(result.isFinalLevel).toBe(false);
    });

    it("should return null for NOT_STARTED level", () => {
      const result = getNextLevelProgression(APPRENTICESHIP_LEVELS.NOT_STARTED);
      expect(result.nextLevel).toBeNull();
      expect(result.nextNodeId).toBeNull();
      expect(result.isFinalLevel).toBe(false);
    });

    it("should return Level 2 for Level 1", () => {
      const result = getNextLevelProgression(APPRENTICESHIP_LEVELS.LEVEL_1);
      expect(result.nextLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_2);
      expect(result.nextNodeId).toBe("level-2");
      expect(result.isFinalLevel).toBe(false);
    });

    it("should return Level 3 for Level 2", () => {
      const result = getNextLevelProgression(APPRENTICESHIP_LEVELS.LEVEL_2);
      expect(result.nextLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_3);
      expect(result.nextNodeId).toBe("level-3");
      expect(result.isFinalLevel).toBe(false);
    });

    it("should return Level 4 for Level 3", () => {
      const result = getNextLevelProgression(APPRENTICESHIP_LEVELS.LEVEL_3);
      expect(result.nextLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_4);
      expect(result.isFinalLevel).toBe(false);
    });

    it("should return Level 4 construction node for Level 3 with construction specialization", () => {
      const result = getNextLevelProgression(
        APPRENTICESHIP_LEVELS.LEVEL_3,
        ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
      );
      expect(result.nextNodeId).toBe("level-4-construction");
    });

    it("should return Level 4 industrial node for Level 3 with industrial specialization", () => {
      const result = getNextLevelProgression(
        APPRENTICESHIP_LEVELS.LEVEL_3,
        ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
      );
      expect(result.nextNodeId).toBe("level-4-industrial");
    });

    it("should return Red Seal for Level 4", () => {
      const result = getNextLevelProgression(APPRENTICESHIP_LEVELS.LEVEL_4);
      expect(result.nextLevel).toBe(APPRENTICESHIP_LEVELS.RED_SEAL);
      expect(result.isFinalLevel).toBe(true);
    });

    it("should return Red Seal construction node for Level 4 with construction specialization", () => {
      const result = getNextLevelProgression(
        APPRENTICESHIP_LEVELS.LEVEL_4,
        ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
      );
      expect(result.nextNodeId).toBe("red-seal-construction");
    });

    it("should return Red Seal industrial node for Level 4 with industrial specialization", () => {
      const result = getNextLevelProgression(
        APPRENTICESHIP_LEVELS.LEVEL_4,
        ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
      );
      expect(result.nextNodeId).toBe("red-seal-industrial");
    });

    it("should return null next level for Red Seal (final level)", () => {
      const result = getNextLevelProgression(APPRENTICESHIP_LEVELS.RED_SEAL);
      expect(result.nextLevel).toBeNull();
      expect(result.nextNodeId).toBeNull();
      expect(result.isFinalLevel).toBe(true);
    });
  });

  describe("shouldTriggerLevelUp", () => {
    it("should return true when completed node matches current level node", () => {
      const result = shouldTriggerLevelUp(
        "level-1",
        APPRENTICESHIP_LEVELS.LEVEL_1,
      );
      expect(result).toBe(true);
    });

    it("should return false when completed node does not match current level node", () => {
      const result = shouldTriggerLevelUp(
        "level-2",
        APPRENTICESHIP_LEVELS.LEVEL_1,
      );
      expect(result).toBe(false);
    });

    it("should handle specialization for Level 4", () => {
      const result = shouldTriggerLevelUp(
        "level-4-industrial",
        APPRENTICESHIP_LEVELS.LEVEL_4,
        ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
      );
      expect(result).toBe(true);
    });

    it("should return false for wrong specialization node", () => {
      const result = shouldTriggerLevelUp(
        "level-4-construction",
        APPRENTICESHIP_LEVELS.LEVEL_4,
        ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
      );
      expect(result).toBe(false);
    });

    it("should handle foundation program correctly", () => {
      const result = shouldTriggerLevelUp(
        "foundation-program",
        APPRENTICESHIP_LEVELS.FOUNDATION,
      );
      expect(result).toBe(true);
    });
  });
});
