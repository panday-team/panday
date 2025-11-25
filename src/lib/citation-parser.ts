/**
 * Citation Parser - Extracts and parses inline source citations from AI responses
 *
 * The AI includes citations in the format: [Source: Title]
 * This parser extracts these citations and maps them to SourceDocument objects
 */

import type { SourceDocument } from "./embeddings-service";

/**
 * Represents a parsed citation found in text
 */
export interface ParsedCitation {
  /** The full matched text including brackets */
  fullMatch: string;
  /** The source title extracted from the citation */
  title: string;
  /** Start index in the original text */
  startIndex: number;
  /** End index in the original text */
  endIndex: number;
}

/**
 * Represents a segment of text - either plain text or a citation
 */
export type TextSegment =
  | { type: "text"; content: string }
  | {
      type: "citation";
      citation: ParsedCitation;
      source: SourceDocument | null;
    };

/**
 * Regular expression to match [Source: Title] patterns
 * Captures the title part (non-greedy to handle nested brackets)
 */
const CITATION_PATTERN = /\[Source:\s*([^\]]+)\]/gi;

/**
 * Parse all citations from a text string
 */
export function parseCitations(text: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  CITATION_PATTERN.lastIndex = 0;

  while ((match = CITATION_PATTERN.exec(text)) !== null) {
    const title = match[1];
    if (title) {
      citations.push({
        fullMatch: match[0],
        title: title.trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return citations;
}

/**
 * Find the best matching source document for a citation title
 * Uses fuzzy matching to handle slight variations in titles
 */
export function findMatchingSource(
  citationTitle: string,
  sources: SourceDocument[],
): SourceDocument | null {
  if (sources.length === 0) return null;

  const normalizedCitation = normalizeTitle(citationTitle);

  // First try exact match (normalized)
  const exactMatch = sources.find(
    (s) => normalizeTitle(s.title) === normalizedCitation,
  );
  if (exactMatch) return exactMatch;

  // Try contains match (citation title contained in source title or vice versa)
  const containsMatch = sources.find((s) => {
    const normalizedSource = normalizeTitle(s.title);
    return (
      normalizedSource.includes(normalizedCitation) ||
      normalizedCitation.includes(normalizedSource)
    );
  });
  if (containsMatch) return containsMatch;

  // Try word overlap match (for partial matches)
  const citationWords = new Set(normalizedCitation.split(/\s+/));
  let bestMatch: SourceDocument | null = null;
  let bestScore = 0;

  for (const source of sources) {
    const sourceWords = new Set(normalizeTitle(source.title).split(/\s+/));
    const overlapCount = [...citationWords].filter((word) =>
      sourceWords.has(word),
    ).length;
    const score = overlapCount / Math.max(citationWords.size, sourceWords.size);

    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = source;
    }
  }

  return bestMatch;
}

/**
 * Normalize a title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Split text into segments of plain text and citations
 * Each citation is matched to a source document if possible
 */
export function parseTextWithCitations(
  text: string,
  sources: SourceDocument[],
): TextSegment[] {
  const citations = parseCitations(text);

  if (citations.length === 0) {
    return [{ type: "text", content: text }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const citation of citations) {
    // Add text before this citation
    if (citation.startIndex > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, citation.startIndex),
      });
    }

    // Add the citation
    segments.push({
      type: "citation",
      citation,
      source: findMatchingSource(citation.title, sources),
    });

    lastIndex = citation.endIndex;
  }

  // Add any remaining text after the last citation
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Check if text contains any citations
 */
export function hasCitations(text: string): boolean {
  CITATION_PATTERN.lastIndex = 0;
  return CITATION_PATTERN.test(text);
}

/**
 * Remove all citations from text (for plain text display)
 */
export function stripCitations(text: string): string {
  return text.replace(CITATION_PATTERN, "").replace(/\s+/g, " ").trim();
}
