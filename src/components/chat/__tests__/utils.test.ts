import { describe, it, expect } from "vitest";
import {
  parseToolCallsFromContent,
  stripToolCallJsonFromContent,
} from "../utils";

describe("parseToolCallsFromContent", () => {
  it("returns null for empty content", () => {
    expect(parseToolCallsFromContent("")).toBeNull();
    expect(parseToolCallsFromContent("   ")).toBeNull();
  });

  it("returns null for content without tool call markers", () => {
    expect(parseToolCallsFromContent("Hello, how can I help you?")).toBeNull();
    expect(
      parseToolCallsFromContent('Here is some JSON: { "name": "test" }'),
    ).toBeNull();
  });

  it("parses tool calls with recipient_name format", () => {
    const content = `Here's a checklist for you:
{"tool_uses":[{"recipient_name":"functions.proposeNode","parameters":{"title":"Test Node","description":"A test description","parentId":"level-1","parentLabel":"Level 1","type":"checklist","checklistItems":["Item 1","Item 2"],"resources":null,"notes":null,"dueDate":null}}]}
I hope this helps!`;

    const result = parseToolCallsFromContent(content);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result?.[0]?.toolName).toBe("proposeNode");
    expect(result?.[0]?.args).toEqual({
      title: "Test Node",
      description: "A test description",
      parentId: "level-1",
      parentLabel: "Level 1",
      type: "checklist",
      checklistItems: ["Item 1", "Item 2"],
      resources: null,
      notes: null,
      dueDate: null,
    });
    expect(result?.[0]?.toolCallId).toMatch(/^parsed-proposeNode-0-/);
  });

  it("parses multiple tool calls", () => {
    const content = `{"tool_uses":[{"recipient_name":"functions.listCustomNodes","parameters":{}},{"recipient_name":"functions.proposeNode","parameters":{"title":"Finance Planner","description":"Plan your finances","parentId":"level-1","parentLabel":"Level 1","type":"checklist","checklistItems":["Step 1"],"resources":null,"notes":null,"dueDate":null}}]}`;

    const result = parseToolCallsFromContent(content);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result?.[0]?.toolName).toBe("listCustomNodes");
    expect(result?.[1]?.toolName).toBe("proposeNode");
  });

  it("handles tool names without functions. prefix", () => {
    const content = `{"tool_uses":[{"recipient_name":"proposeNode","parameters":{"title":"Test","description":"Test desc","parentId":"level-1","type":"checklist"}}]}`;

    const result = parseToolCallsFromContent(content);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result?.[0]?.toolName).toBe("proposeNode");
  });

  it("returns null for invalid JSON", () => {
    const content = `{"tool_uses":[{invalid json}]}`;
    expect(parseToolCallsFromContent(content)).toBeNull();
  });

  it("returns null if tool_uses is not an array", () => {
    const content = `{"tool_uses":"not an array"}`;
    expect(parseToolCallsFromContent(content)).toBeNull();
  });

  it("skips tool calls with missing recipient_name", () => {
    const content = `{"tool_uses":[{"parameters":{"title":"Test"}}]}`;
    expect(parseToolCallsFromContent(content)).toBeNull();
  });
});

describe("stripToolCallJsonFromContent", () => {
  it("returns original content for empty strings", () => {
    expect(stripToolCallJsonFromContent("")).toBe("");
    expect(stripToolCallJsonFromContent("   ")).toBe("   ");
  });

  it("returns original content when no tool calls present", () => {
    const content = "Hello, how can I help you?";
    expect(stripToolCallJsonFromContent(content)).toBe(content);
  });

  it("strips tool call JSON from content", () => {
    const content = `Here's your checklist: {"tool_uses":[{"recipient_name":"functions.proposeNode","parameters":{}}]} I hope this helps!`;
    const result = stripToolCallJsonFromContent(content);
    expect(result).toBe("Here's your checklist:  I hope this helps!");
  });

  it("strips JSON when it's the entire content", () => {
    const content = `{"tool_uses":[{"recipient_name":"functions.proposeNode","parameters":{}}]}`;
    const result = stripToolCallJsonFromContent(content);
    // When everything is stripped, return original to avoid empty content
    expect(result).toBe(content);
  });

  it("handles JSON at the end of content", () => {
    const content = `I'll create a planner for you.
{"tool_uses":[{"recipient_name":"functions.proposeNode","parameters":{}}]}`;
    const result = stripToolCallJsonFromContent(content);
    expect(result).toBe("I'll create a planner for you.");
  });
});
