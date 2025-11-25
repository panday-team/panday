/**
 * InlineCitationRenderer - Renders text with inline source citations as hoverable previews
 */

import { Fragment } from "react";
import { parseTextWithCitations } from "@/lib/citation-parser";
import type { SourceDocument } from "@/lib/embeddings-service";
import { SourcePreview } from "./source-preview";

interface InlineCitationRendererProps {
  /** The text content that may contain citations */
  content: string;
  /** Available source documents to match citations against */
  sources: SourceDocument[];
}

/**
 * Renders text with [Source: Title] citations replaced by hoverable SourcePreview components
 */
export function InlineCitationRenderer({
  content,
  sources,
}: InlineCitationRendererProps) {
  const segments = parseTextWithCitations(content, sources);

  return (
    <>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {segment.type === "text" ? (
            segment.content
          ) : segment.source ? (
            <SourcePreview source={segment.source} variant="inline" />
          ) : (
            // Citation without matching source - show as plain text badge
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-medium opacity-60">
              {segment.citation.title}
            </span>
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * Creates a custom ReactMarkdown text component that renders inline citations
 */
export function createCitationTextRenderer(sources: SourceDocument[]) {
  return function CitationText({ children }: { children?: React.ReactNode }) {
    // Only process string children
    if (typeof children !== "string") {
      return <>{children}</>;
    }

    return <InlineCitationRenderer content={children} sources={sources} />;
  };
}
