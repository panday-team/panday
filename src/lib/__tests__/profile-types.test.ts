import { describe, it, expect } from "vitest";
import {
  APPRENTICESHIP_LEVELS,
  ENTRY_PATHS,
  RESIDENCY_STATUS,
  getCompletedLevels,
  getIrrelevantPaths,
  getCurrentLevelNodeId,
  isEligibleForApprenticeship,
} from "../profile-types";

describe("profile-types utilities", () => {
  describe("getCompletedLevels", () => {
    it("should return empty array for NOT_STARTED level", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.NOT_STARTED);
      expect(result).toEqual([]);
    });

    it("should return [NOT_STARTED] for FOUNDATION level", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.FOUNDATION);
      expect(result).toEqual([APPRENTICESHIP_LEVELS.NOT_STARTED]);
    });

    it("should return [NOT_STARTED, FOUNDATION] for LEVEL_1", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.LEVEL_1);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.FOUNDATION,
      ]);
    });

    it("should return all previous levels for LEVEL_2", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.LEVEL_2);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.FOUNDATION,
        APPRENTICESHIP_LEVELS.LEVEL_1,
      ]);
    });

    it("should return all previous levels for LEVEL_3", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.LEVEL_3);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
        APPRENTICESHIP_LEVELS.FOUNDATION,
        APPRENTICESHIP_LEVELS.LEVEL_1,
        APPRENTICESHIP_LEVELS.LEVEL_2,
      ]);
    });

    it("should return all previous levels for LEVEL_4", () => {
      const result = getCompletedLevels(APPRENTICESHIP_LEVELS.LEVEL_4);
      expect(result).toEqual([
        APPRENTICESHIP_LEVELS.NOT_STARTED,
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
        APPRENTICESHIP_LEVELS.FOUNDATION,
        APPRENTICESHIP_LEVELS.LEVEL_1,
        APPRENTICESHIP_LEVELS.LEVEL_2,
        APPRENTICESHIP_LEVELS.LEVEL_3,
        APPRENTICESHIP_LEVELS.LEVEL_4,
      ]);
    });
  });

  describe("getIrrelevantPaths", () => {
    it("should return ace-it and direct-entry for FOUNDATION path", () => {
      const result = getIrrelevantPaths(ENTRY_PATHS.FOUNDATION);
      expect(result).toEqual(["ace-it", "direct-entry"]);
    });

    it("should return foundation-program and direct-entry for ACE_IT path", () => {
      const result = getIrrelevantPaths(ENTRY_PATHS.ACE_IT);
      expect(result).toEqual(["foundation-program", "direct-entry"]);
    });

    it("should return foundation-program and ace-it for DIRECT_ENTRY path", () => {
      const result = getIrrelevantPaths(ENTRY_PATHS.DIRECT_ENTRY);
      expect(result).toEqual(["foundation-program", "ace-it"]);
    });

    it("should return empty array for EXPLORING path", () => {
      const result = getIrrelevantPaths(ENTRY_PATHS.EXPLORING);
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

    it("should return red-seal-certification for RED_SEAL", () => {
      const result = getCurrentLevelNodeId(APPRENTICESHIP_LEVELS.RED_SEAL);
      expect(result).toBe("red-seal-certification");
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
});
