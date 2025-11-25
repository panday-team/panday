/**
 * SourcePreview component - hover card showing source text with deep link
 */

import { ExternalLink, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { SourceDocument } from "@/lib/embeddings-service";
import { cn } from "@/lib/utils";

interface SourcePreviewProps {
  source: SourceDocument;
  /** Whether to show as an inline citation badge or list item */
  variant?: "inline" | "list";
  className?: string;
}

/**
 * Check if a URL is an internal roadmap link
 */
function isInternalRoadmapLink(url: string): boolean {
  return url.startsWith("/roadmap");
}

export function SourcePreview({
  source,
  variant = "list",
  className,
}: SourcePreviewProps) {
  const relevancePercent = Math.round(source.score * 100);
  const isInternal = source.url ? isInternalRoadmapLink(source.url) : false;

  const trigger =
    variant === "inline" ? (
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/20",
          className,
        )}
      >
        <FileText size={10} className="opacity-70" />
        <span className="max-w-[150px] truncate">{source.title}</span>
      </button>
    ) : (
      <button
        type="button"
        className={cn(
          "group flex w-full items-center justify-between rounded-md p-1.5 text-left transition-colors hover:bg-white/10",
          className,
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium opacity-90">
            {source.title}
          </p>
          {source.excerpt && (
            <p className="mt-0.5 truncate text-xs opacity-60">
              {source.excerpt}
            </p>
          )}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1.5">
          <span className="text-xs opacity-50">{relevancePercent}%</span>
          {source.url && (
            <ExternalLink
              size={12}
              className="opacity-50 group-hover:opacity-80"
            />
          )}
        </div>
      </button>
    );

  // Render the link in the footer - internal links use Next.js Link (same window),
  // external links open in new tab
  const renderFooterLink = () => {
    if (!source.url) return null;

    if (isInternal) {
      return (
        <div className="border-t border-white/10 px-3 py-2">
          <Link
            href={source.url}
            className="flex items-center gap-2 text-xs font-medium text-[#76E54A] transition-colors hover:text-[#76E54A]/80"
          >
            <MapPin size={12} />
            View in roadmap
          </Link>
        </div>
      );
    }

    return (
      <div className="border-t border-white/10 px-3 py-2">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-medium text-[#76E54A] transition-colors hover:text-[#76E54A]/80"
        >
          <ExternalLink size={12} />
          Open source
        </a>
      </div>
    );
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-80 border-white/20 bg-[#2A4A5A] p-0 text-white shadow-xl"
      >
        {/* Header */}
        <div className="border-b border-white/10 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold">{source.title}</h4>
              {source.section_heading &&
                source.section_heading !== source.title && (
                  <p className="mt-0.5 truncate text-xs opacity-70">
                    <MapPin size={10} className="mr-1 inline" />
                    {source.section_heading}
                  </p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
              <span className="opacity-70">{relevancePercent}%</span>
              <span className="opacity-50">match</span>
            </div>
          </div>
        </div>

        {/* Source text preview with markdown rendering */}
        <div className="max-h-48 overflow-y-auto px-3 py-2">
          <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed opacity-90">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-2 list-disc space-y-0.5 pl-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 list-decimal space-y-0.5 pl-4">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">
                    {children}
                  </strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                h1: ({ children }) => (
                  <h1 className="mb-1 text-sm font-bold">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-1 text-sm font-semibold">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-1 text-xs font-semibold">{children}</h3>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#76E54A] underline underline-offset-2 hover:text-[#76E54A]/80"
                  >
                    {children}
                  </a>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-white/20 px-1 py-0.5 font-mono text-xs">
                    {children}
                  </code>
                ),
              }}
            >
              {source.text_snippet}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer with link */}
        {renderFooterLink()}
      </HoverCardContent>
    </HoverCard>
  );
}
