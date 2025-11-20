import { describe, it, expect } from "vitest";
import type {
  NodeInfoPanelProps,
  ResourceLink,
  ChecklistItem,
  Category,
} from "@/components/node-info-panel";

describe("NodeInfoPanel Types", () => {
  describe("ResourceLink type", () => {
    it("should have correct structure", () => {
      const resource: ResourceLink = {
        label: "Test Resource",
        href: "https://example.com",
      };

      expect(resource).toHaveProperty("label");
      expect(resource).toHaveProperty("href");
      expect(typeof resource.label).toBe("string");
      expect(typeof resource.href).toBe("string");
    });
  });

  describe("ChecklistItem type", () => {
    it("should have correct structure with required fields", () => {
      const item: ChecklistItem = {
        id: "test-1",
        title: "Test Item",
      };

      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(typeof item.id).toBe("string");
      expect(typeof item.title).toBe("string");
    });

    it("should accept optional fields", () => {
      const item: ChecklistItem = {
        id: "test-1",
        title: "Test Item",
        status: "completed",
        href: "https://example.com",
      };

      expect(item.status).toBe("completed");
      expect(item.href).toBe("https://example.com");
    });
  });

  describe("Category type", () => {
    it("should have correct structure", () => {
      const category: Category = {
        id: "category-1",
        title: "Test Category",
        items: [
          {
            id: "item-1",
            title: "Item 1",
          },
        ],
      };

      expect(category).toHaveProperty("id");
      expect(category).toHaveProperty("title");
      expect(category).toHaveProperty("items");
      expect(Array.isArray(category.items)).toBe(true);
      expect(category.items[0]).toHaveProperty("id");
      expect(category.items[0]).toHaveProperty("title");
    });

    it("should accept optional description", () => {
      const category: Category = {
        id: "category-1",
        title: "Test Category",
        description: "Test description",
        items: [],
      };

      expect(category.description).toBe("Test description");
    });
  });

  describe("NodeInfoPanelProps type", () => {
    it("should accept required props only", () => {
      const props: NodeInfoPanelProps = {
        title: "Test Node",
      };

      expect(props.title).toBe("Test Node");
    });

    it("should accept checklistItems prop with correct structure", () => {
      const checklistItems = [
        { id: "1", title: "Item 1", completed: false },
        { id: "2", title: "Item 2", completed: true },
        { id: "3", title: "Item 3", completed: false },
      ];

      const props: NodeInfoPanelProps = {
        title: "Custom Node",
        checklistItems,
      };

      expect(props.checklistItems).toBeDefined();
      if (props.checklistItems) {
        expect(props.checklistItems.length).toBe(3);
        const firstItem = props.checklistItems[0];
        const secondItem = props.checklistItems[1];
        expect(firstItem).toHaveProperty("id");
        expect(firstItem).toHaveProperty("title");
        expect(firstItem).toHaveProperty("completed");
        if (secondItem) {
          expect(typeof secondItem.completed).toBe("boolean");
        }
      }
    });

    it("should accept resources prop with correct structure", () => {
      const resources: ResourceLink[] = [
        { label: "Resource 1", href: "https://example.com/1" },
        { label: "Resource 2", href: "https://example.com/2" },
      ];

      const props: NodeInfoPanelProps = {
        title: "Test Node",
        resources,
      };

      expect(props.resources).toBeDefined();
      if (props.resources) {
        expect(props.resources.length).toBe(2);
        expect(props.resources[0]).toHaveProperty("label");
        expect(props.resources[0]).toHaveProperty("href");
      }
    });

    it("should accept all optional content props together", () => {
      const props: NodeInfoPanelProps = {
        badge: "Custom",
        title: "Test Custom Node",
        subtitle: "Personalized Step",
        description: "Test description",
        eligibility: ["Requirement 1", "Requirement 2"],
        benefits: ["Benefit 1", "Benefit 2"],
        outcomes: ["Outcome 1"],
        resources: [{ label: "Resource", href: "https://example.com" }],
        checklistItems: [
          { id: "1", title: "Task 1", completed: false },
          { id: "2", title: "Task 2", completed: true },
        ],
        categories: [
          {
            id: "cat-1",
            title: "Category 1",
            items: [{ id: "item-1", title: "Item 1" }],
          },
        ],
        nodeType: "checklist",
        nodeId: "test-node-id",
        nodeStatus: "in-progress",
        isCustomNode: true,
      };

      expect(props.title).toBe("Test Custom Node");
      expect(props.checklistItems).toBeDefined();
      expect(props.checklistItems).toHaveLength(2);
      expect(props.resources).toBeDefined();
      expect(props.resources).toHaveLength(1);
      expect(props.eligibility).toBeDefined();
      expect(props.eligibility).toHaveLength(2);
      expect(props.benefits).toBeDefined();
      expect(props.benefits).toHaveLength(2);
      expect(props.outcomes).toBeDefined();
      expect(props.outcomes).toHaveLength(1);
      expect(props.categories).toBeDefined();
      expect(props.categories).toHaveLength(1);
      expect(props.isCustomNode).toBe(true);
      expect(props.nodeStatus).toBe("in-progress");
    });

    it("should validate checklistItem completed is boolean", () => {
      const checklistItems = [
        { id: "1", title: "Item 1", completed: true },
        { id: "2", title: "Item 2", completed: false },
      ];

      checklistItems.forEach((item) => {
        expect(typeof item.completed).toBe("boolean");
      });
    });

    it("should handle empty checklistItems array", () => {
      const props: NodeInfoPanelProps = {
        title: "Test",
        checklistItems: [],
      };

      expect(props.checklistItems).toBeDefined();
      if (props.checklistItems) {
        expect(props.checklistItems.length).toBe(0);
      }
    });

    it("should handle undefined checklistItems", () => {
      const props: NodeInfoPanelProps = {
        title: "Test",
        checklistItems: undefined,
      };

      expect(props.checklistItems).toBeUndefined();
    });
  });

  describe("Integration with CustomNode content field", () => {
    it("should match CustomNodeContent structure from roadmap-flow", () => {
      // This validates that the checklistItems structure matches what's
      // expected from the custom node content JSON field
      interface CustomNodeContent {
        checklistItems?: Array<{
          id: string;
          title: string;
          completed: boolean;
        }>;
        resources?: Array<{ label: string; href: string }>;
        notes?: string;
        dueDate?: string;
      }

      const mockCustomNodeContent: CustomNodeContent = {
        checklistItems: [
          { id: "1", title: "Task 1", completed: false },
          { id: "2", title: "Task 2", completed: true },
        ],
        resources: [{ label: "Guide", href: "https://example.com" }],
        notes: "Additional notes",
        dueDate: "2025-12-31",
      };

      // Should be assignable to NodeInfoPanelProps
      const props: NodeInfoPanelProps = {
        title: "Custom Node",
        checklistItems: mockCustomNodeContent.checklistItems,
        resources: mockCustomNodeContent.resources,
      };

      if (props.checklistItems && props.resources) {
        expect(props.checklistItems).toEqual(
          mockCustomNodeContent.checklistItems,
        );
        expect(props.resources).toEqual(mockCustomNodeContent.resources);
      }
    });

    it("should handle null/undefined content gracefully", () => {
      // Simulate the pattern used in roadmap-flow.tsx when custom node content is null
      const props: NodeInfoPanelProps = {
        title: "Test",
        checklistItems: [],
        resources: [],
      };

      expect(props.checklistItems).toEqual([]);
      expect(props.resources).toEqual([]);
      expect(Array.isArray(props.checklistItems)).toBe(true);
      expect(Array.isArray(props.resources)).toBe(true);
    });
  });
});
