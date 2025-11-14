import { describe, it, expect } from "vitest";
import {
  validateParentReferences,
  validateConnectionTargets,
  validateNodePositions,
  validateCategoryIds,
  formatValidationErrors,
  type ValidationError,
} from "../graph-validation";

describe("graph-validation", () => {
  describe("validateParentReferences", () => {
    it("should return no errors when all parents exist", () => {
      const checklistFiles = [
        { fileName: "test-checklists.md", parentId: "parent1" },
        { fileName: "test2-checklists.md", parentId: "parent2" },
      ];
      const existingIds = new Set(["parent1", "parent2", "parent3"]);

      const errors = validateParentReferences(checklistFiles, existingIds);

      expect(errors).toEqual([]);
    });

    it("should return errors when parent does not exist", () => {
      const checklistFiles = [
        { fileName: "test-checklists.md", parentId: "missing-parent" },
      ];
      const existingIds = new Set(["parent1"]);

      const errors = validateParentReferences(checklistFiles, existingIds);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        type: "missing-parent",
        nodeId: "missing-parent",
        message: expect.stringContaining("non-existent parent"),
      });
    });

    it("should handle multiple missing parents", () => {
      const checklistFiles = [
        { fileName: "test1.md", parentId: "missing1" },
        { fileName: "test2.md", parentId: "missing2" },
      ];
      const existingIds = new Set(["parent1"]);

      const errors = validateParentReferences(checklistFiles, existingIds);

      expect(errors).toHaveLength(2);
    });
  });

  describe("validateConnectionTargets", () => {
    it("should return no errors when all targets exist", () => {
      const connections = [{ nodeId: "node1", targetIds: ["node2", "node3"] }];
      const existingIds = new Set(["node1", "node2", "node3"]);

      const errors = validateConnectionTargets(connections, existingIds);

      expect(errors).toEqual([]);
    });

    it("should return errors when target does not exist", () => {
      const connections = [{ nodeId: "node1", targetIds: ["missing-node"] }];
      const existingIds = new Set(["node1"]);

      const errors = validateConnectionTargets(connections, existingIds);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        type: "missing-target",
        nodeId: "node1",
        target: "missing-node",
        message: expect.stringContaining("non-existent node"),
      });
    });

    it("should handle multiple missing targets", () => {
      const connections = [
        { nodeId: "node1", targetIds: ["missing1", "missing2"] },
      ];
      const existingIds = new Set(["node1"]);

      const errors = validateConnectionTargets(connections, existingIds);

      expect(errors).toHaveLength(2);
    });
  });

  describe("validateNodePositions", () => {
    it("should return no errors when all nodes have positions", () => {
      const nodes = [
        { nodeId: "node1", hasPosition: true },
        { nodeId: "node2", hasPosition: true },
      ];

      const errors = validateNodePositions(nodes);

      expect(errors).toEqual([]);
    });

    it("should return errors when node missing position", () => {
      const nodes = [{ nodeId: "node1", hasPosition: false }];

      const errors = validateNodePositions(nodes);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        type: "missing-position",
        nodeId: "node1",
        message: expect.stringContaining("missing layout.position"),
      });
    });

    it("should handle mixed nodes", () => {
      const nodes = [
        { nodeId: "node1", hasPosition: true },
        { nodeId: "node2", hasPosition: false },
        { nodeId: "node3", hasPosition: true },
      ];

      const errors = validateNodePositions(nodes);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.nodeId).toBe("node2");
    });
  });

  describe("validateCategoryIds", () => {
    it("should return no errors when all category IDs are unique", () => {
      const categories = [
        {
          id: "level-1-resources",
          parentId: "level-1",
          fileName: "level-1-checklists.md",
        },
        {
          id: "level-1-actions",
          parentId: "level-1",
          fileName: "level-1-checklists.md",
        },
        {
          id: "level-2-resources",
          parentId: "level-2",
          fileName: "level-2-checklists.md",
        },
      ];

      const errors = validateCategoryIds(categories);

      expect(errors).toEqual([]);
    });

    it("should return error when category ID is duplicated", () => {
      const categories = [
        {
          id: "level-1-resources",
          parentId: "level-1",
          fileName: "level-1-checklists.md",
        },
        {
          id: "level-1-resources",
          parentId: "level-2",
          fileName: "level-2-checklists.md",
        },
      ];

      const errors = validateCategoryIds(categories);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        type: "duplicate-category-id",
        nodeId: "level-1-resources",
        message: expect.stringContaining("Duplicate category ID"),
      });
      expect(errors[0]?.message).toContain("level-1-checklists.md");
      expect(errors[0]?.message).toContain("level-2-checklists.md");
    });

    it("should return multiple errors for multiple duplicates", () => {
      const categories = [
        {
          id: "resources",
          parentId: "level-1",
          fileName: "level-1-checklists.md",
        },
        {
          id: "resources",
          parentId: "level-2",
          fileName: "level-2-checklists.md",
        },
        {
          id: "actions",
          parentId: "level-1",
          fileName: "level-1-checklists.md",
        },
        {
          id: "actions",
          parentId: "level-3",
          fileName: "level-3-checklists.md",
        },
      ];

      const errors = validateCategoryIds(categories);

      expect(errors).toHaveLength(2);
      expect(errors[0]?.nodeId).toBe("resources");
      expect(errors[1]?.nodeId).toBe("actions");
    });

    it("should handle empty categories array", () => {
      const errors = validateCategoryIds([]);

      expect(errors).toEqual([]);
    });

    it("should provide detailed information about both duplicate locations", () => {
      const categories = [
        {
          id: "duplicate-id",
          parentId: "parent-a",
          fileName: "file-a.md",
        },
        {
          id: "duplicate-id",
          parentId: "parent-b",
          fileName: "file-b.md",
        },
      ];

      const errors = validateCategoryIds(categories);

      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain("parent-a");
      expect(errors[0]?.message).toContain("parent-b");
      expect(errors[0]?.message).toContain("file-a.md");
      expect(errors[0]?.message).toContain("file-b.md");
    });
  });

  describe("formatValidationErrors", () => {
    it("should format errors with error emoji", () => {
      const errors: ValidationError[] = [
        {
          type: "missing-parent",
          nodeId: "node1",
          message: "Test error message",
        },
      ];

      const formatted = formatValidationErrors(errors);

      expect(formatted).toEqual(["❌ Test error message"]);
    });

    it("should handle empty errors array", () => {
      const formatted = formatValidationErrors([]);

      expect(formatted).toEqual([]);
    });

    it("should format multiple errors", () => {
      const errors: ValidationError[] = [
        { type: "missing-parent", nodeId: "node1", message: "Error 1" },
        { type: "missing-target", nodeId: "node2", message: "Error 2" },
      ];

      const formatted = formatValidationErrors(errors);

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toBe("❌ Error 1");
      expect(formatted[1]).toBe("❌ Error 2");
    });
  });
});
