/**
 * Sources display component - shows relevant sources for AI responses
 */

import { FileText, ExternalLink } from "lucide-react";
import { CHAT_CONFIG } from "@/lib/chat-config";
import type { SourceDocument } from "@/lib/embeddings-service";

interface SourcesDisplayProps {
  sources: SourceDocument[];
}

export function SourcesDisplay({ sources }: SourcesDisplayProps) {
  const filtered = sources
    .filter((source) => source.score > CHAT_CONFIG.RELEVANCE_THRESHOLD)
    .reduce<SourceDocument[]>((acc, current) => {
      if (!acc.some((item) => item.title === current.title)) {
        acc.push(current);
      }
      return acc;
    }, []);

  if (filtered.length === 0) return null;

  return (
    <div className="mt-3 border-t border-white/20 pt-3">
      <div className="mb-2 flex items-center gap-2">
        <FileText size={14} className="opacity-70" />
        <span className="text-xs font-medium opacity-90">Sources</span>
      </div>
      <div className="space-y-1">
        {filtered.map((source, index) => (
          <div key={index} className="group flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs opacity-80">{source.title}</p>
              <p className="text-xs opacity-60">
                Relevance: {Math.round(source.score * 100)}%
              </p>
            </div>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 rounded p-1 transition-colors hover:bg-white/10"
                title="View source"
              >
                <ExternalLink size={12} className="opacity-70" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
