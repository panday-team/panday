/**
 * Thread history list component with empty states and error handling
 */

import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import { HistorySkeleton } from "./history-skeleton";
import { ThreadItem } from "./thread-item";

interface ThreadData {
  id: string;
  title: string;
  messagePreview: string | null;
  lastMessageAt: string;
  roadmapId: string | null;
}

interface HistoryListProps {
  isSignedIn: boolean;
  threads: ThreadData[];
  activeThreadId: string | null;
  pendingThreadId: string | null;
  threadsLoading: boolean;
  threadsError: string | null;
  onThreadSelect: (threadId: string) => void;
  onThreadRename: (threadId: string, title: string) => void;
  onThreadDelete: (threadId: string) => void;
  onRetry: () => void;
}

export function HistoryList({
  isSignedIn,
  threads,
  activeThreadId,
  pendingThreadId,
  threadsLoading,
  threadsError,
  onThreadSelect,
  onThreadRename,
  onThreadDelete,
  onRetry,
}: HistoryListProps) {
  // Guest user - show sign-in prompt
  if (!isSignedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center text-sm text-white/70">
        <p>Sign in to save and revisit your conversations.</p>
        <SignInButton mode="modal">
          <Button
            size="sm"
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30"
          >
            Sign in
          </Button>
        </SignInButton>
      </div>
    );
  }

  // Loading state
  if (threadsLoading) {
    return <HistorySkeleton />;
  }

  // Error state
  if (threadsError) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <p className="mb-3">{threadsError}</p>
        <Button
          size="sm"
          variant="secondary"
          className="w-full bg-white/10 text-white hover:bg-white/20"
          onClick={onRetry}
        >
          Try again
        </Button>
      </div>
    );
  }

  // Empty state
  if (threads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/60">
        <p className="font-medium text-white">No conversations yet</p>
        <p className="mt-1 text-xs">
          Start a new chat to keep track of your progress.
        </p>
      </div>
    );
  }

  // Thread list
  return (
    <div className="space-y-2">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.id}
          thread={thread}
          isActive={thread.id === activeThreadId}
          isDisabled={pendingThreadId === thread.id}
          isSignedIn={isSignedIn}
          onSelect={onThreadSelect}
          onRename={onThreadRename}
          onDelete={onThreadDelete}
        />
      ))}
    </div>
  );
}
