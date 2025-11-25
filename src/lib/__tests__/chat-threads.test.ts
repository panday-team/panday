import { describe, expect, it } from "vitest";
import {
  sanitizeText,
  deriveThreadTitle,
  buildMessagePreview,
  toThreadResponse,
  toThreadMessageResponse,
  isSupportedRole,
  DEFAULT_THREAD_TITLE,
} from "../chat-threads";
import type { ChatThread, ChatThreadMessage } from "@prisma/client";

describe("chat-threads", () => {
  describe("sanitizeText", () => {
    it("collapses multiple spaces into single space", () => {
      expect(sanitizeText("hello    world")).toBe("hello world");
    });

    it("trims leading and trailing whitespace", () => {
      expect(sanitizeText("  hello world  ")).toBe("hello world");
    });

    it("normalizes newlines and tabs to spaces", () => {
      expect(sanitizeText("hello\n\nworld\t\ttest")).toBe("hello world test");
    });

    it("handles empty strings", () => {
      expect(sanitizeText("")).toBe("");
    });

    it("handles strings with only whitespace", () => {
      expect(sanitizeText("   \n\t  ")).toBe("");
    });

    it("preserves single spaces", () => {
      expect(sanitizeText("hello world")).toBe("hello world");
    });
  });

  describe("deriveThreadTitle", () => {
    it("returns clean content when under max length", () => {
      expect(deriveThreadTitle("How do I become an electrician?")).toBe(
        "How do I become an electrician?",
      );
    });

    it("truncates content at 80 chars with ellipsis", () => {
      const longContent =
        "This is a very long question that exceeds the maximum length allowed for thread titles and should be truncated";
      const result = deriveThreadTitle(longContent);

      expect(result.length).toBe(80);
      expect(result.endsWith("…")).toBe(true);
      expect(result).toBe(
        "This is a very long question that exceeds the maximum length allowed for thread…",
      );
    });

    it("returns default title for empty content", () => {
      expect(deriveThreadTitle("")).toBe(DEFAULT_THREAD_TITLE);
    });

    it("returns default title for whitespace-only content", () => {
      expect(deriveThreadTitle("   \n\t  ")).toBe(DEFAULT_THREAD_TITLE);
    });

    it("sanitizes content before truncating", () => {
      const contentWithWhitespace = "   Hello   world   ";
      expect(deriveThreadTitle(contentWithWhitespace)).toBe("Hello world");
    });

    it("does not truncate content exactly at max length", () => {
      const exactLength = "a".repeat(80);
      expect(deriveThreadTitle(exactLength)).toBe(exactLength);
      expect(deriveThreadTitle(exactLength).length).toBe(80);
    });

    it("trims trailing space before ellipsis", () => {
      // Create a string where character 79 would be a space after truncation
      const content = "a".repeat(70) + " " + "b".repeat(20);
      const result = deriveThreadTitle(content);
      expect(result.endsWith(" …")).toBe(false);
    });
  });

  describe("buildMessagePreview", () => {
    it("returns clean content when under max length", () => {
      expect(buildMessagePreview("Short preview text")).toBe(
        "Short preview text",
      );
    });

    it("truncates content at 180 chars with ellipsis", () => {
      const longContent = "a".repeat(200);
      const result = buildMessagePreview(longContent);

      expect(result.length).toBe(180);
      expect(result.endsWith("…")).toBe(true);
    });

    it("returns empty string for empty content", () => {
      expect(buildMessagePreview("")).toBe("");
    });

    it("sanitizes content before truncating", () => {
      const contentWithWhitespace = "   Hello   world   ";
      expect(buildMessagePreview(contentWithWhitespace)).toBe("Hello world");
    });

    it("does not truncate content exactly at max length", () => {
      const exactLength = "a".repeat(180);
      expect(buildMessagePreview(exactLength)).toBe(exactLength);
      expect(buildMessagePreview(exactLength).length).toBe(180);
    });
  });

  describe("toThreadResponse", () => {
    const mockDate = new Date("2024-01-15T10:30:00Z");

    const createMockThread = (
      overrides: Partial<ChatThread & { _count?: { messages: number } }> = {},
    ): ChatThread & { _count?: { messages: number } } => ({
      id: "thread-123",
      userId: "user-456",
      roadmapId: "electrician-bc",
      selectedNodeId: "foundation-program",
      title: "Test Thread",
      messagePreview: "Last message preview",
      lastMessageAt: mockDate,
      createdAt: mockDate,
      updatedAt: mockDate,
      deletedAt: null,
      ...overrides,
    });

    it("maps Prisma thread to API response", () => {
      const thread = createMockThread({ _count: { messages: 5 } });
      const result = toThreadResponse(thread);

      expect(result).toEqual({
        id: "thread-123",
        title: "Test Thread",
        roadmapId: "electrician-bc",
        selectedNodeId: "foundation-program",
        messagePreview: "Last message preview",
        lastMessageAt: "2024-01-15T10:30:00.000Z",
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z",
        messagesCount: 5,
      });
    });

    it("handles null roadmapId", () => {
      const thread = createMockThread({ roadmapId: null });
      const result = toThreadResponse(thread);

      expect(result.roadmapId).toBeNull();
    });

    it("handles null selectedNodeId", () => {
      const thread = createMockThread({ selectedNodeId: null });
      const result = toThreadResponse(thread);

      expect(result.selectedNodeId).toBeNull();
    });

    it("handles null messagePreview", () => {
      const thread = createMockThread({ messagePreview: null });
      const result = toThreadResponse(thread);

      expect(result.messagePreview).toBeNull();
    });

    it("defaults messagesCount to 0 when _count is missing", () => {
      const thread = createMockThread();
      const result = toThreadResponse(thread);

      expect(result.messagesCount).toBe(0);
    });

    it("handles undefined _count.messages", () => {
      const thread = createMockThread();
      // Create thread without _count property
      const result = toThreadResponse(thread);

      expect(result.messagesCount).toBe(0);
    });
  });

  describe("toThreadMessageResponse", () => {
    const mockDate = new Date("2024-01-15T10:30:00Z");

    const createMockMessage = (
      overrides: Partial<ChatThreadMessage> = {},
    ): ChatThreadMessage => ({
      id: "msg-123",
      threadId: "thread-456",
      role: "user",
      content: "Hello, I have a question",
      sources: null,
      createdAt: mockDate,
      ...overrides,
    });

    it("maps Prisma message to API response", () => {
      const message = createMockMessage();
      const result = toThreadMessageResponse(message);

      expect(result).toEqual({
        id: "msg-123",
        role: "user",
        content: "Hello, I have a question",
        sources: null,
        createdAt: "2024-01-15T10:30:00.000Z",
      });
    });

    it("handles assistant role", () => {
      const message = createMockMessage({
        role: "assistant",
        content: "I can help with that",
      });
      const result = toThreadMessageResponse(message);

      expect(result.role).toBe("assistant");
    });

    it("handles system role", () => {
      const message = createMockMessage({
        role: "system",
        content: "System prompt",
      });
      const result = toThreadMessageResponse(message);

      expect(result.role).toBe("system");
    });

    it("maps sources from JSON to SourceDocument array", () => {
      const sources = [
        {
          node_id: "node-1",
          title: "Foundation Program",
          score: 0.95,
          text_snippet: "The foundation program...",
        },
        {
          node_id: "node-2",
          title: "Level 1 Training",
          score: 0.85,
          text_snippet: "Level 1 training includes...",
        },
      ];
      const message = createMockMessage({ sources });
      const result = toThreadMessageResponse(message);

      expect(result.sources).toEqual(sources);
      expect(result.sources).toHaveLength(2);
    });

    it("handles empty sources array", () => {
      const message = createMockMessage({ sources: [] });
      const result = toThreadMessageResponse(message);

      expect(result.sources).toEqual([]);
    });
  });

  describe("isSupportedRole", () => {
    it("returns true for 'user' role", () => {
      expect(isSupportedRole("user")).toBe(true);
    });

    it("returns true for 'assistant' role", () => {
      expect(isSupportedRole("assistant")).toBe(true);
    });

    it("returns true for 'system' role", () => {
      expect(isSupportedRole("system")).toBe(true);
    });

    it("returns false for invalid role", () => {
      expect(isSupportedRole("invalid")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isSupportedRole("")).toBe(false);
    });

    it("returns false for case-sensitive mismatch", () => {
      expect(isSupportedRole("User")).toBe(false);
      expect(isSupportedRole("ASSISTANT")).toBe(false);
    });
  });

  describe("DEFAULT_THREAD_TITLE", () => {
    it("has expected value", () => {
      expect(DEFAULT_THREAD_TITLE).toBe("New chat");
    });
  });
});
