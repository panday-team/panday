/**
 * Individual thread item component with inline rename and delete actions
 */

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "./utils";

interface ThreadItemProps {
  thread: {
    id: string;
    title: string;
    messagePreview: string | null;
    lastMessageAt: string;
    roadmapId: string | null;
  };
  isActive: boolean;
  isDisabled: boolean;
  isSignedIn: boolean;
  onSelect: (threadId: string) => void;
  onRename: (threadId: string, title: string) => void;
  onDelete: (threadId: string) => void;
}

export function ThreadItem({
  thread,
  isActive,
  isDisabled,
  isSignedIn,
  onSelect,
  onRename,
  onDelete,
}: ThreadItemProps) {
  const [renameState, setRenameState] = useState<{
    id: string;
    value: string;
  } | null>(null);

  const isRenaming = renameState?.id === thread.id;

  const handleRenameSubmit = () => {
    const trimmed = renameState?.value?.trim();
    if (trimmed && trimmed !== thread.title) {
      onRename(thread.id, trimmed);
    }
    setRenameState(null);
  };

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      onClick={() => {
        if (!isDisabled && !isRenaming) onSelect(thread.id);
      }}
      onKeyDown={(event) => {
        if (isDisabled || isRenaming) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(thread.id);
        }
      }}
      className={cn(
        "group flex w-full flex-col rounded-2xl border border-white/5 bg-white/0 p-3 text-left transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none",
        isActive && "border-white/20 bg-white/10",
        isDisabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        {isRenaming ? (
          <Input
            value={renameState?.value ?? ""}
            autoFocus
            onChange={(e) =>
              setRenameState((prev) =>
                prev
                  ? { ...prev, value: e.target.value }
                  : { id: thread.id, value: e.target.value },
              )
            }
            onBlur={handleRenameSubmit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleRenameSubmit();
              }
              if (event.key === "Escape") {
                setRenameState(null);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-8 rounded-lg border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
        ) : (
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm leading-tight font-semibold text-white">
              {thread.title}
            </p>
            <p className="truncate text-xs leading-tight text-white/60">
              {thread.messagePreview ?? "No messages yet"}
            </p>
          </div>
        )}

        {isSignedIn && !isRenaming && (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              aria-label="Rename"
              onClick={(event) => {
                event.stopPropagation();
                setRenameState({ id: thread.id, value: thread.title });
              }}
              className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              aria-label="Delete conversation"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(thread.id);
              }}
              className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
        <span>{thread.roadmapId ?? "General"}</span>
        <span>{formatRelativeTime(thread.lastMessageAt)}</span>
      </div>
    </div>
  );
}
