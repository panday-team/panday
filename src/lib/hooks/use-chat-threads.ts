import { useCallback, useEffect, useState, useRef } from "react";
import { logger } from "@/lib/logger";
import type { Message } from "ai";
import { CHAT_CONFIG } from "@/lib/chat-config";
import type { ThreadResponse, ThreadMessageResponse } from "@/lib/chat-threads";
import {
  mapThreadMessagesToChatMessages,
  extractLatestSources,
  filterEmptyMessages,
} from "@/components/chat/utils";
import type { SourceDocument } from "@/lib/embeddings-service";

interface UseChatThreadsProps {
  isSignedIn: boolean;
  roadmapId: string | null;
  selectedNodeId: string | null;
  setMessages: (messages: Message[]) => void;
  setSources: (sources: SourceDocument[]) => void;
}

interface UseChatThreadsReturn {
  // State
  threads: ThreadResponse[];
  activeThreadId: string | null;
  activeThreadRef: React.MutableRefObject<string | null>;
  threadMessagesCache: Record<string, ThreadMessageResponse[]>;
  threadsLoading: boolean;
  threadsError: string | null;
  hasFetchedThreads: boolean;
  isCreatingThread: boolean;
  pendingThreadId: string | null;
  renameState: { id: string; title: string } | null;
  conversationError: string | null;

  // Setters
  setThreads: React.Dispatch<React.SetStateAction<ThreadResponse[]>>;
  setActiveThreadId: React.Dispatch<React.SetStateAction<string | null>>;
  setThreadMessagesCache: React.Dispatch<
    React.SetStateAction<Record<string, ThreadMessageResponse[]>>
  >;
  setRenameState: React.Dispatch<
    React.SetStateAction<{ id: string; title: string } | null>
  >;
  setConversationError: React.Dispatch<React.SetStateAction<string | null>>;

  // Actions
  createThread: () => Promise<ThreadResponse | null>;
  loadThreads: () => Promise<void>;
  fetchThreadMessages: (
    threadId: string,
    options?: { hydrate?: boolean },
  ) => Promise<void>;
  handleDeleteThread: (threadId?: string | null) => Promise<void>;
  handleRenameThread: (threadId: string, title: string) => Promise<void>;
}

/**
 * Custom hook for managing chat threads, messages, and CRUD operations.
 * Handles thread lifecycle, persistence, caching, and synchronization.
 */
export function useChatThreads({
  isSignedIn,
  roadmapId,
  selectedNodeId,
  setMessages,
  setSources,
}: UseChatThreadsProps): UseChatThreadsReturn {
  // State
  const [threads, setThreads] = useState<ThreadResponse[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const activeThreadRef = useRef<string | null>(null);
  const [threadMessagesCache, setThreadMessagesCache] = useState<
    Record<string, ThreadMessageResponse[]>
  >({});
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [hasFetchedThreads, setHasFetchedThreads] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [renameState, setRenameState] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );

  // Fetch messages for a thread
  const fetchThreadMessages = useCallback(
    async (
      threadId: string,
      options?: { hydrate?: boolean },
    ): Promise<void> => {
      if (!isSignedIn) return;

      try {
        const response = await fetch(`/api/chat-threads/${threadId}/messages`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch chat messages");
        }

        const data = (await response.json()) as {
          messages: ThreadMessageResponse[];
        };

        setThreadMessagesCache((prev) => ({
          ...prev,
          [threadId]: data.messages,
        }));

        if (options?.hydrate) {
          setMessages(mapThreadMessagesToChatMessages(data.messages));
          setSources(extractLatestSources(data.messages));
        }
      } catch (err) {
        logger.error("Failed to fetch thread messages", err, { threadId });
      }
    },
    [isSignedIn, setMessages, setSources],
  );

  // Create new thread
  const createThread = useCallback(async (): Promise<ThreadResponse | null> => {
    if (!isSignedIn) return null;
    setIsCreatingThread(true);
    try {
      const response = await fetch("/api/chat-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmapId,
          selectedNodeId: selectedNodeId ?? undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create thread");
      }

      const data = (await response.json()) as { thread: ThreadResponse };
      setThreads((prev) => [data.thread, ...prev]);
      setThreadMessagesCache((prev) => ({
        ...prev,
        [data.thread.id]: [],
      }));
      setActiveThreadId(data.thread.id);
      activeThreadRef.current = data.thread.id;
      setMessages([]);
      setSources([]);
      setConversationError(null);
      return data.thread;
    } catch (err) {
      logger.error("Failed to create chat thread", err, {
        roadmapId,
        selectedNodeId,
      });
      return null;
    } finally {
      setIsCreatingThread(false);
    }
  }, [isSignedIn, roadmapId, selectedNodeId, setMessages, setSources]);

  // Load all threads
  const loadThreads = useCallback(async () => {
    if (!isSignedIn) return;
    setThreadsLoading(true);
    setThreadsError(null);

    try {
      const response = await fetch("/api/chat-threads", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch chat threads");
      }

      const data = (await response.json()) as { threads: ThreadResponse[] };
      setThreads(data.threads);

      if (data.threads.length > 0) {
        setActiveThreadId((previous) => {
          if (previous && data.threads.some((t) => t.id === previous)) {
            activeThreadRef.current = previous;
            return previous;
          }
          const fallback = data.threads[0]!.id;
          activeThreadRef.current = fallback;
          return fallback;
        });
      } else {
        // Don't auto-create empty threads - wait for user's first message
        setActiveThreadId(null);
        activeThreadRef.current = null;
      }
    } catch (err) {
      logger.error("Failed to load chat threads", err);
      setThreadsError("Unable to load conversations");
    } finally {
      setThreadsLoading(false);
      setHasFetchedThreads(true);
    }
  }, [isSignedIn]);

  // Delete thread
  const handleDeleteThread = useCallback(
    async (threadId?: string | null) => {
      if (!isSignedIn) {
        setMessages([]);
        setSources([]);
        if (typeof window !== "undefined") {
          localStorage.removeItem(CHAT_CONFIG.STORAGE_KEY);
        }
        return;
      }

      if (!threadId) return;

      setPendingThreadId(threadId);
      try {
        const response = await fetch(`/api/chat-threads/${threadId}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 204) {
          throw new Error("Failed to delete chat thread");
        }

        setThreadMessagesCache((prev) => {
          const copy = { ...prev };
          delete copy[threadId];
          return copy;
        });

        let nextId: string | null = null;
        setThreads((prev) => {
          const filtered = prev.filter((thread) => thread.id !== threadId);
          nextId = filtered[0]?.id ?? null;
          return filtered;
        });

        if (activeThreadId === threadId) {
          setActiveThreadId(nextId);
          activeThreadRef.current = nextId;
          if (nextId) {
            void fetchThreadMessages(nextId, { hydrate: true });
          } else {
            setMessages([]);
            setSources([]);
          }
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to delete chat thread");
        logger.error("Failed to delete chat thread", error, { threadId });
      } finally {
        setPendingThreadId(null);
      }
    },
    [activeThreadId, fetchThreadMessages, isSignedIn, setMessages, setSources],
  );

  // Rename thread
  const handleRenameThread = useCallback(
    async (threadId: string, title: string) => {
      if (!isSignedIn) return;
      setPendingThreadId(threadId);
      try {
        const response = await fetch(`/api/chat-threads/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });

        if (!response.ok) {
          throw new Error("Failed to rename thread");
        }

        const data = (await response.json()) as { thread: ThreadResponse };
        setThreads((prev) =>
          prev.map((thread) => (thread.id === threadId ? data.thread : thread)),
        );
        setRenameState(null);
      } catch (err) {
        logger.error("Failed to rename chat thread", err, { threadId });
      } finally {
        setPendingThreadId(null);
      }
    },
    [isSignedIn],
  );

  // Hydrate messages from cache when activeThreadId changes
  useEffect(() => {
    if (!isSignedIn) return;
    if (!activeThreadId) return;

    const cached = threadMessagesCache[activeThreadId];
    if (cached) {
      setMessages(mapThreadMessagesToChatMessages(cached));
      setSources(extractLatestSources(cached));
    } else {
      void fetchThreadMessages(activeThreadId);
    }
  }, [
    activeThreadId,
    fetchThreadMessages,
    isSignedIn,
    setMessages,
    setSources,
    threadMessagesCache,
  ]);

  // Guest localStorage hydration (sign-in state changes)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isSignedIn) {
      localStorage.removeItem(CHAT_CONFIG.STORAGE_KEY);
      return;
    }

    const stored = localStorage.getItem(CHAT_CONFIG.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          const sanitized = filterEmptyMessages(
            parsed as Array<{ content: string }>,
          ) as Parameters<typeof setMessages>[0];
          setMessages(sanitized);
        }
      } catch (e) {
        logger.error(
          "Failed to restore chat history",
          e instanceof Error ? e : new Error("Failed to restore chat history"),
        );
      }
    }
  }, [isSignedIn, setMessages]);

  // Guest localStorage persistence (messages change)
  useEffect(() => {
    if (isSignedIn) return;
    if (typeof window === "undefined") return;

    const sanitized = filterEmptyMessages(
      setMessages as unknown as Array<{ content: string }>,
    );
    if (sanitized.length === 0) return;

    const trimmed = sanitized.slice(-CHAT_CONFIG.MAX_CACHED_MESSAGES);
    const serialized = JSON.stringify(trimmed);

    if (serialized.length < CHAT_CONFIG.MAX_STORAGE_SIZE_BYTES) {
      try {
        localStorage.setItem(CHAT_CONFIG.STORAGE_KEY, serialized);
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          logger.warn("localStorage quota exceeded, clearing old messages", {
            messageCount: sanitized.length,
            size: serialized.length,
          });
          localStorage.removeItem(CHAT_CONFIG.STORAGE_KEY);
        }
      }
    } else {
      logger.warn("Chat history too large for localStorage, skipping save", {
        size: serialized.length,
        maxSize: CHAT_CONFIG.MAX_STORAGE_SIZE_BYTES,
      });
    }
  }, [isSignedIn, setMessages]);

  return {
    // State
    threads,
    activeThreadId,
    activeThreadRef,
    threadMessagesCache,
    threadsLoading,
    threadsError,
    hasFetchedThreads,
    isCreatingThread,
    pendingThreadId,
    renameState,
    conversationError,

    // Setters
    setThreads,
    setActiveThreadId,
    setThreadMessagesCache,
    setRenameState,
    setConversationError,

    // Actions
    createThread,
    loadThreads,
    fetchThreadMessages,
    handleDeleteThread,
    handleRenameThread,
  };
}
