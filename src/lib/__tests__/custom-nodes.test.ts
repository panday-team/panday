import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createCustomNode,
  getCustomNodes,
  deleteCustomNode,
  CreateCustomNodeSchema,
  type CreateCustomNodeInput,
  type CustomNode,
} from "../custom-nodes";
import { db } from "@/server/db";

// Mock the database client
vi.mock("@/server/db", () => ({
  db: {
    customNode: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("custom-nodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("CreateCustomNodeSchema", () => {
    it("validates basic node without content", () => {
      const input = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Study Transformers",
        description: "Learn about transformer theory and applications",
      };

      const result = CreateCustomNodeSchema.parse(input);
      expect(result.roadmapId).toBe(input.roadmapId);
      expect(result.parentId).toBe(input.parentId);
      expect(result.title).toBe(input.title);
      expect(result.description).toBe(input.description);
      expect(result.type).toBe("checklist"); // Default type
      expect(result.content).toBeUndefined();
    });

    it("validates node with rich content structure", () => {
      const input = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Study Transformers",
        description: "Complete transformer theory study",
        type: "checklist" as const,
        content: {
          checklistItems: [
            { id: "item-1", title: "Read chapter 5", completed: false },
            { id: "item-2", title: "Practice problems", completed: true },
          ],
          resources: [
            {
              label: "ITA Study Guide",
              href: "https://www.itabc.ca/study-guide",
            },
          ],
          notes: "Focus on single-phase transformers first",
          dueDate: "2025-06-30",
        },
      };

      const result = CreateCustomNodeSchema.parse(input);
      expect(result.title).toBe(input.title);
      expect(result.content).toBeDefined();
      expect(result.content!.checklistItems).toHaveLength(2);
    });

    it("validates all node types", () => {
      const types = ["checklist", "resource", "action", "roadblock"] as const;

      types.forEach((type) => {
        const input = {
          roadmapId: "electrician-bc",
          parentId: "level-4",
          title: `${type} node`,
          description: "Test description",
          type,
        };

        const result = CreateCustomNodeSchema.parse(input);
        expect(result.type).toBe(type);
      });
    });

    it("rejects invalid node type", () => {
      const input = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Test Node",
        description: "Test",
        type: "invalid-type",
      };

      expect(() => CreateCustomNodeSchema.parse(input)).toThrow();
    });

    it("rejects title exceeding 100 characters", () => {
      const input = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "a".repeat(101),
        description: "Test",
      };

      expect(() => CreateCustomNodeSchema.parse(input)).toThrow();
    });

    it("rejects description exceeding 1000 characters", () => {
      const input = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Test Node",
        description: "a".repeat(1001),
      };

      expect(() => CreateCustomNodeSchema.parse(input)).toThrow();
    });

    it("rejects empty title", () => {
      const input = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "",
        description: "Test",
      };

      expect(() => CreateCustomNodeSchema.parse(input)).toThrow();
    });

    it("accepts content with nested structures", () => {
      const input = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Complex Node",
        description: "Test",
        type: "checklist" as const,
        content: {
          checklistItems: [
            {
              id: "item-1",
              title: "Task 1",
              completed: false,
              subtasks: [{ id: "sub-1", title: "Subtask 1", completed: true }],
            },
          ],
          metadata: {
            priority: "high",
            tags: ["important", "urgent"],
          },
        },
      };

      const result = CreateCustomNodeSchema.parse(input);
      const content = result.content!;
      expect(content?.metadata).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((content?.checklistItems as any)?.[0]?.subtasks).toHaveLength(1);
    });
  });

  describe("createCustomNode", () => {
    it("creates basic node without content", async () => {
      const mockNode: CustomNode = {
        id: "node-123",
        userId: "user-123",
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Study Transformers",
        description: "Learn transformer theory",
        type: "checklist",
        status: "in-progress",
        content: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.customNode.create).mockResolvedValue(mockNode);

      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Study Transformers",
        description: "Learn transformer theory",
        type: "checklist",
      };

      const result = await createCustomNode("user-123", input);

      expect(db.customNode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          roadmapId: "electrician-bc",
          parentId: "red-seal",
          title: "Study Transformers",
          description: "Learn transformer theory",
          type: "checklist",
        }),
      });
      expect(result).toEqual(mockNode);
    });

    it("creates node with checklist items", async () => {
      const mockNode: CustomNode = {
        id: "node-456",
        userId: "user-123",
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Transformer Study Plan",
        description: "Complete study plan",
        type: "checklist",
        status: "in-progress",
        content: {
          checklistItems: [
            { id: "item-1", title: "Read chapter 5", completed: false },
            { id: "item-2", title: "Practice problems", completed: false },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.customNode.create).mockResolvedValue(mockNode);

      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Transformer Study Plan",
        description: "Complete study plan",
        type: "checklist",
        content: {
          checklistItems: [
            { id: "item-1", title: "Read chapter 5", completed: false },
            { id: "item-2", title: "Practice problems", completed: false },
          ],
        },
      };

      const result = await createCustomNode("user-123", input);

      expect(db.customNode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          title: "Transformer Study Plan",
          content: input.content,
        }),
      });
      expect(
        (result.content as Record<string, unknown>)?.checklistItems,
      ).toHaveLength(2);
    });

    it("creates node with resources", async () => {
      const mockNode: CustomNode = {
        id: "node-789",
        userId: "user-123",
        roadmapId: "electrician-bc",
        parentId: "level-4",
        title: "Study Resources",
        description: "Collection of study materials",
        type: "resource",
        status: "in-progress",
        content: {
          resources: [
            {
              label: "ITA Study Guide",
              href: "https://www.itabc.ca/study-guide",
            },
            {
              label: "NEC Code Book",
              href: "https://www.nfpa.org/nec",
            },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.customNode.create).mockResolvedValue(mockNode);

      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "level-4",
        title: "Study Resources",
        description: "Collection of study materials",
        type: "resource",
        content: {
          resources: [
            {
              label: "ITA Study Guide",
              href: "https://www.itabc.ca/study-guide",
            },
            {
              label: "NEC Code Book",
              href: "https://www.nfpa.org/nec",
            },
          ],
        },
      };

      const result = await createCustomNode("user-123", input);

      expect(
        (result.content as Record<string, unknown>)?.resources,
      ).toHaveLength(2);
    });

    it("creates node with due date and notes", async () => {
      const mockNode: CustomNode = {
        id: "node-999",
        userId: "user-123",
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Exam Prep",
        description: "Prepare for certification exam",
        type: "action",
        status: "in-progress",
        content: {
          notes: "Focus on weak areas: motors and controls",
          dueDate: "2025-06-30",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.customNode.create).mockResolvedValue(mockNode);

      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Exam Prep",
        description: "Prepare for certification exam",
        type: "action",
        content: {
          notes: "Focus on weak areas: motors and controls",
          dueDate: "2025-06-30",
        },
      };

      const result = await createCustomNode("user-123", input);

      expect((result.content as Record<string, unknown>)?.notes).toBe(
        "Focus on weak areas: motors and controls",
      );
      expect((result.content as Record<string, unknown>)?.dueDate).toBe(
        "2025-06-30",
      );
    });

    it("creates node with all content fields", async () => {
      const mockNode: CustomNode = {
        id: "node-complete",
        userId: "user-123",
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Complete Study Plan",
        description: "Full preparation plan",
        type: "checklist",
        status: "in-progress",
        content: {
          checklistItems: [
            { id: "item-1", title: "Study transformers", completed: false },
            { id: "item-2", title: "Study motors", completed: false },
          ],
          resources: [
            { label: "Study Guide", href: "https://example.com/guide" },
          ],
          notes: "Review weak areas daily",
          dueDate: "2025-07-15",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.customNode.create).mockResolvedValue(mockNode);

      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Complete Study Plan",
        description: "Full preparation plan",
        type: "checklist",
        content: {
          checklistItems: [
            { id: "item-1", title: "Study transformers", completed: false },
            { id: "item-2", title: "Study motors", completed: false },
          ],
          resources: [
            { label: "Study Guide", href: "https://example.com/guide" },
          ],
          notes: "Review weak areas daily",
          dueDate: "2025-07-15",
        },
      };

      const result = await createCustomNode("user-123", input);

      const content = result.content as
        | Record<string, unknown>
        | null
        | undefined;
      expect(content?.checklistItems).toHaveLength(2);
      expect(content?.resources).toHaveLength(1);
      expect(content?.notes).toBeDefined();
      expect(content?.dueDate).toBeDefined();
    });

    it("throws error for invalid input", async () => {
      const invalidInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "", // Empty title should fail
        description: "Test",
        type: "checklist" as const,
      };

      await expect(
        createCustomNode("user-123", invalidInput),
      ).rejects.toThrow();
    });
  });

  describe("getCustomNodes", () => {
    it("fetches custom nodes for user and roadmap", async () => {
      const mockNodes: CustomNode[] = [
        {
          id: "node-1",
          userId: "user-123",
          roadmapId: "electrician-bc",
          parentId: "red-seal",
          title: "Node 1",
          description: "Description 1",
          type: "checklist",
          status: "in-progress",
          content: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "node-2",
          userId: "user-123",
          roadmapId: "electrician-bc",
          parentId: "level-4",
          title: "Node 2",
          description: "Description 2",
          type: "resource",
          status: "in-progress",
          content: {
            resources: [{ label: "Link", href: "https://test.com" }],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.customNode.findMany).mockResolvedValue(mockNodes);

      const result = await getCustomNodes("user-123", "electrician-bc");

      expect(db.customNode.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          roadmapId: "electrician-bc",
        },
      });
      expect(result).toEqual(mockNodes);
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no nodes exist", async () => {
      vi.mocked(db.customNode.findMany).mockResolvedValue([]);

      const result = await getCustomNodes("user-123", "electrician-bc");

      expect(result).toEqual([]);
    });
  });

  describe("deleteCustomNode", () => {
    it("deletes custom node by id and userId", async () => {
      const mockResult = { count: 1 };
      vi.mocked(db.customNode.deleteMany).mockResolvedValue(mockResult);

      const result = await deleteCustomNode("user-123", "node-456");

      expect(db.customNode.deleteMany).toHaveBeenCalledWith({
        where: {
          id: "node-456",
          userId: "user-123",
        },
      });
      expect(result.count).toBe(1);
    });

    it("returns zero count when node not found", async () => {
      const mockResult = { count: 0 };
      vi.mocked(db.customNode.deleteMany).mockResolvedValue(mockResult);

      const result = await deleteCustomNode("user-123", "nonexistent");

      expect(result.count).toBe(0);
    });

    it("prevents deleting another user's node", async () => {
      const mockResult = { count: 0 };
      vi.mocked(db.customNode.deleteMany).mockResolvedValue(mockResult);

      const result = await deleteCustomNode("user-123", "other-user-node");

      expect(db.customNode.deleteMany).toHaveBeenCalledWith({
        where: {
          id: "other-user-node",
          userId: "user-123",
        },
      });
      expect(result.count).toBe(0);
    });
  });

  describe("Content field edge cases", () => {
    it("accepts empty content object", async () => {
      const mockNode: CustomNode = {
        id: "node-empty",
        userId: "user-123",
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Empty Content Node",
        description: "Test",
        type: "checklist",
        status: "in-progress",
        content: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.customNode.create).mockResolvedValue(mockNode);

      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Empty Content Node",
        description: "Test",
        type: "checklist",
        content: {},
      };

      const result = await createCustomNode("user-123", input);
      expect(result.content).toEqual({});
    });

    it("handles content with only checklist items", async () => {
      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Checklist Only",
        description: "Test",
        type: "checklist",
        content: {
          checklistItems: [{ id: "item-1", title: "Task 1", completed: false }],
        },
      };

      const validated = CreateCustomNodeSchema.parse(input);
      expect(validated.content!.checklistItems).toHaveLength(1);
      expect(validated.content!.resources).toBeUndefined();
      expect(validated.content!.notes).toBeUndefined();
    });

    it("handles content with only resources", async () => {
      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Resources Only",
        description: "Test",
        type: "resource",
        content: {
          resources: [{ label: "Link", href: "https://test.com" }],
        },
      };

      const validated = CreateCustomNodeSchema.parse(input);
      expect(validated.content!.resources).toHaveLength(1);
      expect(validated.content!.checklistItems).toBeUndefined();
    });

    it("handles content with only notes", async () => {
      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Notes Only",
        description: "Test",
        type: "checklist",
        content: {
          notes: "Important notes here",
        },
      };

      const validated = CreateCustomNodeSchema.parse(input);
      expect(validated.content!.notes).toBe("Important notes here");
      expect(validated.content!.checklistItems).toBeUndefined();
      expect(validated.content!.resources).toBeUndefined();
    });

    it("handles content with only due date", async () => {
      const input: CreateCustomNodeInput = {
        roadmapId: "electrician-bc",
        parentId: "red-seal",
        title: "Due Date Only",
        description: "Test",
        type: "action",
        content: {
          dueDate: "2025-12-31",
        },
      };

      const validated = CreateCustomNodeSchema.parse(input);
      expect(validated.content!.dueDate).toBe("2025-12-31");
    });
  });
});
