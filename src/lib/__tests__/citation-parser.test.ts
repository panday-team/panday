import { describe, it, expect } from "vitest";
import {
  parseCitations,
  findMatchingSource,
  parseTextWithCitations,
  hasCitations,
  stripCitations,
} from "../citation-parser";
import type { SourceDocument } from "../embeddings-service";

// Helper to create mock source documents
function mockSource(title: string, score = 0.8): SourceDocument {
  return {
    node_id: `doc-${title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    text_snippet: `Content about ${title}`,
    score,
    url: `/roadmap?nodeId=${title.toLowerCase().replace(/\s+/g, "-")}`,
    excerpt: `Short excerpt about ${title}`,
    section_heading: title,
    chunk_index: 0,
  };
}

describe("parseCitations", () => {
  it("should parse a single citation", () => {
    const text = "You should check [Source: Level 2 Training] for more info.";
    const citations = parseCitations(text);

    expect(citations).toHaveLength(1);
    expect(citations[0]).toEqual({
      fullMatch: "[Source: Level 2 Training]",
      title: "Level 2 Training",
      startIndex: 17,
      endIndex: 43,
    });
  });

  it("should parse multiple citations", () => {
    const text =
      "See [Source: Red Seal] and [Source: Level 4] for certification requirements.";
    const citations = parseCitations(text);

    expect(citations).toHaveLength(2);
    expect(citations[0]?.title).toBe("Red Seal");
    expect(citations[1]?.title).toBe("Level 4");
  });

  it("should handle citations with extra whitespace", () => {
    const text = "Check [Source:   Training Program  ] for details.";
    const citations = parseCitations(text);

    expect(citations).toHaveLength(1);
    expect(citations[0]?.title).toBe("Training Program");
  });

  it("should handle text without citations", () => {
    const text = "This is plain text without any citations.";
    const citations = parseCitations(text);

    expect(citations).toHaveLength(0);
  });

  it("should be case insensitive", () => {
    const text = "Check [source: Red Seal] and [SOURCE: Level 2] for info.";
    const citations = parseCitations(text);

    expect(citations).toHaveLength(2);
  });
});

describe("findMatchingSource", () => {
  const sources: SourceDocument[] = [
    mockSource("Red Seal Certification"),
    mockSource("Level 2 Training"),
    mockSource("Foundation Program"),
  ];

  it("should find exact match", () => {
    const result = findMatchingSource("Level 2 Training", sources);
    expect(result?.title).toBe("Level 2 Training");
  });

  it("should find match with different case", () => {
    const result = findMatchingSource("level 2 training", sources);
    expect(result?.title).toBe("Level 2 Training");
  });

  it("should find partial match (citation contains source)", () => {
    const result = findMatchingSource("Red Seal", sources);
    expect(result?.title).toBe("Red Seal Certification");
  });

  it("should find partial match (source contains citation)", () => {
    const result = findMatchingSource("Foundation Program Overview", sources);
    expect(result?.title).toBe("Foundation Program");
  });

  it("should find match with word overlap", () => {
    const result = findMatchingSource("Training at Level 2", sources);
    expect(result?.title).toBe("Level 2 Training");
  });

  it("should return null for no match", () => {
    const result = findMatchingSource("Completely Different Topic", sources);
    expect(result).toBeNull();
  });

  it("should return null for empty sources array", () => {
    const result = findMatchingSource("Red Seal", []);
    expect(result).toBeNull();
  });
});

describe("parseTextWithCitations", () => {
  const sources: SourceDocument[] = [
    mockSource("Red Seal"),
    mockSource("Level 2"),
  ];

  it("should split text into segments", () => {
    const text = "Start [Source: Red Seal] middle [Source: Level 2] end.";
    const segments = parseTextWithCitations(text, sources);

    expect(segments).toHaveLength(5);
    expect(segments[0]).toEqual({ type: "text", content: "Start " });
    expect(segments[1]).toMatchObject({
      type: "citation",
      source: expect.objectContaining({ title: "Red Seal" }),
    });
    expect(segments[2]).toEqual({ type: "text", content: " middle " });
    expect(segments[3]).toMatchObject({
      type: "citation",
      source: expect.objectContaining({ title: "Level 2" }),
    });
    expect(segments[4]).toEqual({ type: "text", content: " end." });
  });

  it("should handle text without citations", () => {
    const text = "Plain text without any citations.";
    const segments = parseTextWithCitations(text, sources);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ type: "text", content: text });
  });

  it("should handle citation at start of text", () => {
    const text = "[Source: Red Seal] is the certification.";
    const segments = parseTextWithCitations(text, sources);

    expect(segments).toHaveLength(2);
    expect(segments[0]?.type).toBe("citation");
    expect(segments[1]).toEqual({
      type: "text",
      content: " is the certification.",
    });
  });

  it("should handle citation at end of text", () => {
    const text = "Check out [Source: Red Seal]";
    const segments = parseTextWithCitations(text, sources);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: "text", content: "Check out " });
    expect(segments[1]?.type).toBe("citation");
  });

  it("should set source to null for unmatched citations", () => {
    const text = "See [Source: Unknown Topic] for more.";
    const segments = parseTextWithCitations(text, sources);

    expect(segments).toHaveLength(3);
    expect(segments[1]).toMatchObject({
      type: "citation",
      citation: expect.objectContaining({ title: "Unknown Topic" }),
      source: null,
    });
  });
});

describe("hasCitations", () => {
  it("should return true when text has citations", () => {
    expect(hasCitations("Check [Source: Red Seal] for info.")).toBe(true);
  });

  it("should return false when text has no citations", () => {
    expect(hasCitations("Plain text without citations.")).toBe(false);
  });

  it("should handle empty string", () => {
    expect(hasCitations("")).toBe(false);
  });
});

describe("stripCitations", () => {
  it("should remove all citations from text", () => {
    const text = "Start [Source: Red Seal] middle [Source: Level 2] end.";
    const result = stripCitations(text);

    expect(result).toBe("Start middle end.");
  });

  it("should handle text without citations", () => {
    const text = "Plain text without citations.";
    expect(stripCitations(text)).toBe(text);
  });

  it("should normalize whitespace after stripping", () => {
    const text = "Check  [Source: Red Seal]  this out.";
    const result = stripCitations(text);

    expect(result).toBe("Check this out.");
  });
});
