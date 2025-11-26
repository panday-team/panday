/**
 * InlineCitationRenderer - Renders text with inline source citations as hoverable previews
 */

import { Fragment, type ReactNode, Children, isValidElement } from "react";
import { parseTextWithCitations, hasCitations } from "@/lib/citation-parser";
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
 * Recursively processes React children to find and replace citation patterns in text nodes.
 * Works with react-markdown v10+ which doesn't support the 'text' component.
 */
function processChildrenForCitations(
  children: ReactNode,
  sources: SourceDocument[],
): ReactNode {
  return Children.map(children, (child) => {
    // Process string children directly
    if (typeof child === "string") {
      if (hasCitations(child)) {
        return <InlineCitationRenderer content={child} sources={sources} />;
      }
      return child;
    }

    // Recursively process children of React elements
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.props.children
    ) {
      const processedChildren = processChildrenForCitations(
        child.props.children,
        sources,
      );

      // Only clone if children actually changed
      if (processedChildren !== child.props.children) {
        // Use type assertion to work with React's internal element structure
        const ElementType = child.type;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { children: _children, ...restProps } = child.props;
        return <ElementType {...restProps}>{processedChildren}</ElementType>;
      }
    }

    return child;
  });
}

/**
 * Creates a custom ReactMarkdown paragraph component that processes inline citations.
 * Use this with react-markdown v10+ as the 'p' component.
 */
export function createCitationParagraphRenderer(sources: SourceDocument[]) {
  return function CitationParagraph({ children }: { children?: ReactNode }) {
    const processedChildren = processChildrenForCitations(children, sources);
    return (
      <p className="mb-2 text-xs leading-relaxed last:mb-0">
        {processedChildren}
      </p>
    );
  };
}

/**
 * Creates a custom ReactMarkdown list item component that processes inline citations.
 */
export function createCitationListItemRenderer(sources: SourceDocument[]) {
  return function CitationListItem({ children }: { children?: ReactNode }) {
    const processedChildren = processChildrenForCitations(children, sources);
    return <li className="leading-relaxed">{processedChildren}</li>;
  };
}

/**
 * @deprecated Use createCitationParagraphRenderer instead for react-markdown v10+
 * Creates a custom ReactMarkdown text component that renders inline citations
 */
export function createCitationTextRenderer(sources: SourceDocument[]) {
  return function CitationText({ children }: { children?: ReactNode }) {
    // Only process string children
    if (typeof children !== "string") {
      return <>{children}</>;
    }

    return <InlineCitationRenderer content={children} sources={sources} />;
  };
}
