/**
 * Sources display component - shows relevant sources for AI responses
 * with hover previews showing original source text
 */

import { FileText } from "lucide-react";
import { CHAT_CONFIG } from "@/lib/chat-config";
import type { SourceDocument } from "@/lib/embeddings-service";
import { SourcePreview } from "./source-preview";

interface SourcesDisplayProps {
  sources: SourceDocument[];
}

export function SourcesDisplay({ sources }: SourcesDisplayProps) {
  const filtered = sources
    .filter((source) => source.score > CHAT_CONFIG.RELEVANCE_THRESHOLD)
    .reduce<SourceDocument[]>((acc, current) => {
      // Deduplicate by title
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
        <span className="text-xs font-medium opacity-90">
          Sources ({filtered.length})
        </span>
        <span className="text-xs opacity-50">Hover for preview</span>
      </div>
      <div className="space-y-0.5">
        {filtered.map((source, index) => (
          <SourcePreview key={index} source={source} variant="list" />
        ))}
      </div>
    </div>
  );
}
