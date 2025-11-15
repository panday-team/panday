"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Fragment,
} from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  X,
  ExternalLink,
  FileText,
  ArrowDown,
  Plus,
  Trash2,
  Pencil,
  Menu,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { ChatButton } from "./chat-button";
import ChatLoading from "./chat-loading";
import Typewriter from "./typewriter";
import type { SourceDocument } from "@/lib/embeddings-service";
import { useAuth, SignInButton, SignedIn } from "@clerk/nextjs";
import { CHAT_CONFIG } from "@/lib/chat-config";
import { logger } from "@/lib/logger";
import {
  type ThreadResponse,
  type ThreadMessageResponse,
  buildMessagePreview,
} from "@/lib/chat-threads";
import { cn } from "@/lib/utils";

interface ChatWidgetProps {
  selectedNodeId?: string | null;
  roadmapId?: string;
  userProfile?: {
    trade?: string;
    currentLevel?: string;
    specialization?: string;
    residencyStatus?: string;
  };
}

const STORAGE_KEY = CHAT_CONFIG.STORAGE_KEY;

type StreamStatusEvent = {
  type: "status";
  message: string;
};

type StreamMetadataEvent = {
  type: "metadata";
  roadmapId?: string;
  sources?: unknown;
};

type MinimalMessage = { content: string };

const HISTORY_SKELETON_ITEMS = Array.from({ length: 3 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStatusEvent = (value: unknown): value is StreamStatusEvent =>
  isRecord(value) && value.type === "status" && typeof value.message === "string";

const isMetadataEvent = (value: unknown): value is StreamMetadataEvent =>
  isRecord(value) && value.type === "metadata";

const filterEmptyMessages = <T extends MinimalMessage>(messages: T[]): T[] =>
  messages.filter((message) => message.content.trim().length > 0);

const isSourceDocument = (value: unknown): value is SourceDocument => {
  if (!isRecord(value)) return false;
  return (
    typeof value.node_id === "string" &&
    typeof value.title === "string" &&
    typeof value.score === "number" &&
    typeof value.text_snippet === "string"
  );
};

const formatRelativeTime = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  const diff = Date.now() - timestamp;
  if (Number.isNaN(diff)) return "";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
};

const mapThreadMessagesToChatMessages = (
  messages: ThreadMessageResponse[],
): Message[] =>
  messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
  }));

const extractLatestSources = (messages: ThreadMessageResponse[]) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const candidate = messages[i]!;
    if (
      candidate.role === "assistant" &&
      Array.isArray(candidate.sources) &&
      candidate.sources.length > 0
    ) {
      return candidate.sources;
    }
  }
  return [];
};

const HistorySkeleton = () => (
  <div className="space-y-2">
    {HISTORY_SKELETON_ITEMS.map((_, index) => (
      <div
        key={index}
        className="h-[70px] animate-pulse rounded-2xl border border-white/5 bg-white/5"
      />
    ))}
  </div>
);

function SourcesDisplay({ sources }: { sources: SourceDocument[] }) {
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

export function ChatWidget({
  selectedNodeId,
  roadmapId,
  userProfile,
}: ChatWidgetProps) {
  const { isSignedIn } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [threads, setThreads] = useState<ThreadResponse[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [threadMessagesCache, setThreadMessagesCache] = useState<
    Record<string, ThreadMessageResponse[]>
  >({});
  const [threadMessagesLoading, setThreadMessagesLoading] = useState(false);
  const [hasFetchedThreads, setHasFetchedThreads] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [renameState, setRenameState] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const activeThreadRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    activeThreadRef.current = activeThreadId;
  }, [activeThreadId]);

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null;
    return threads.find((thread) => thread.id === activeThreadId) ?? null;
  }, [threads, activeThreadId]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    setMessages,
    data: streamData,
  } = useChat({
    api: "/api/chat",
    streamProtocol: "data",
    onError: (chatError) => {
      console.error("Chat error:", chatError);
      setIsLoading(false);
      setStatusMessage(null);
    },
    onResponse: () => {
      setIsLoading(true);
      setStatusMessage(null);
    },
    onFinish: () => {
      setIsLoading(false);
      setStatusMessage(null);
      setStreamingMessageId(null);
      if (isSignedIn && activeThreadId) {
        void fetchThreadMessages(activeThreadId, { hydrate: true, silent: true });
      }
    },
    experimental_prepareRequestBody: ({
      messages: outgoingMessages,
      ...rest
    }) => {
      const filtered = filterEmptyMessages(outgoingMessages);
      return {
        ...rest,
        messages: filtered.length > 0 ? filtered : outgoingMessages,
        roadmap_id: roadmapId,
        selected_node_id: selectedNodeId ?? undefined,
        user_profile: userProfile,
        thread_id: activeThreadRef.current ?? undefined,
      };
    },
  });

  const hydrateMessagesFromThread = useCallback(
    (threadId: string, conversation: ThreadMessageResponse[]) => {
      setThreadMessagesCache((prev) => ({
        ...prev,
        [threadId]: conversation,
      }));
      setMessages(mapThreadMessagesToChatMessages(conversation));
      setSources(extractLatestSources(conversation));
    },
    [setMessages],
  );

  const fetchThreadMessages = useCallback(
    async (
      threadId: string,
      options: { hydrate?: boolean; silent?: boolean } = {},
    ) => {
      if (!isSignedIn || !threadId) return;
      if (!options.silent) {
        setConversationError(null);
        setThreadMessagesLoading(true);
      }

      try {
        const response = await fetch(`/api/chat-threads/${threadId}/messages`, {
          cache: "no-store",
        });

        if (response.status === 404) {
          logger.warn("Thread missing during fetch, cleaning up", { threadId });
          setThreadMessagesCache((prev) => {
            const clone = { ...prev };
            delete clone[threadId];
            return clone;
          });
          setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
          if (activeThreadId === threadId) {
            setActiveThreadId(null);
            activeThreadRef.current = null;
          }
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = (await response.json()) as {
          messages: ThreadMessageResponse[];
        };

        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  lastMessageAt:
                    data.messages[data.messages.length - 1]?.createdAt ??
                    thread.lastMessageAt,
                  messagePreview:
                    data.messages.length > 0
                      ? buildMessagePreview(
                          data.messages[data.messages.length - 1]!.content,
                        )
                      : thread.messagePreview,
                  messagesCount: data.messages.length,
                }
              : thread,
          ),
        );

        if (options.hydrate ?? true) {
          hydrateMessagesFromThread(threadId, data.messages);
        } else {
          setThreadMessagesCache((prev) => ({
            ...prev,
            [threadId]: data.messages,
          }));
        }

        setConversationError(null);
      } catch (err) {
        logger.warn("Failed to load thread messages", {
          threadId,
          error:
            err instanceof Error
              ? { name: err.name, message: err.message }
              : err,
        });
        if (!options.silent) {
          setConversationError("Unable to load this conversation.");
        }
      } finally {
        if (!options.silent) {
          setThreadMessagesLoading(false);
        }
      }
    },
    [activeThreadId, hydrateMessagesFromThread, isSignedIn],
  );

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
  }, [isSignedIn, roadmapId, selectedNodeId, setMessages]);

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
        const thread = await createThread();
        if (thread) {
          activeThreadRef.current = thread.id;
        }
      }
    } catch (err) {
      logger.error("Failed to load chat threads", err);
      setThreadsError("Unable to load conversations");
    } finally {
      setThreadsLoading(false);
      setHasFetchedThreads(true);
    }
  }, [createThread, isSignedIn]);

  const handleDeleteThread = useCallback(
    async (threadId?: string | null) => {
      if (!isSignedIn) {
        setMessages([]);
        setSources([]);
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
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
        logger.error("Failed to delete chat thread", err, { threadId });
      } finally {
        setPendingThreadId(null);
      }
    },
    [activeThreadId, fetchThreadMessages, isSignedIn, setMessages],
  );

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
    threadMessagesCache,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isSignedIn) {
      localStorage.removeItem(STORAGE_KEY);
      setIsHydrated(true);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
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
        console.error("Failed to restore chat history:", e);
      }
    }
    setIsHydrated(true);
  }, [isSignedIn, setMessages]);

  useEffect(() => {
    if (!isHydrated || isSignedIn || messages.length === 0) return;
    const sanitized = filterEmptyMessages(messages);
    if (sanitized.length === 0) return;

    const trimmed = sanitized.slice(-CHAT_CONFIG.MAX_CACHED_MESSAGES);
    const serialized = JSON.stringify(trimmed);

    if (serialized.length < CHAT_CONFIG.MAX_STORAGE_SIZE_BYTES) {
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          logger.warn("localStorage quota exceeded, clearing old messages", {
            messageCount: messages.length,
            size: serialized.length,
          });
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } else {
      logger.warn("Chat history too large for localStorage, skipping save", {
        size: serialized.length,
        maxSize: CHAT_CONFIG.MAX_STORAGE_SIZE_BYTES,
      });
    }
  }, [isHydrated, isSignedIn, messages]);

  useEffect(() => {
    if (!streamData || streamData.length === 0) return;
    const latestEvent = streamData[streamData.length - 1];
    if (isStatusEvent(latestEvent)) {
      setStatusMessage(latestEvent.message);
      return;
    }
    if (isMetadataEvent(latestEvent) && Array.isArray(latestEvent.sources)) {
      const parsedSources = latestEvent.sources.filter(isSourceDocument);
      if (parsedSources.length > 0) {
        setSources(parsedSources);
      }
    }
  }, [streamData]);

  useEffect(() => {
    if (!isExpanded) {
      didMountRef.current = false;
    }
  }, [isExpanded]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom =
        scrollHeight - scrollTop - clientHeight <
        CHAT_CONFIG.SCROLL_THRESHOLD_PX;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isExpanded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isSignedIn || !isExpanded || hasFetchedThreads) return;
    void loadThreads();
  }, [hasFetchedThreads, isExpanded, isSignedIn, loadThreads]);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSignedIn) {
      logger.info("Guest attempted to use chat", { nodeId: selectedNodeId });
      return;
    }

    if (!input.trim()) return;

    let threadId = activeThreadId;
    if (!threadId) {
      const thread = await createThread();
      threadId = thread?.id ?? null;
      if (!threadId) {
        logger.error("Failed to create thread before sending", undefined, {
          selectedNodeId,
        });
        return;
      }
    }

    activeThreadRef.current = threadId;

    setSources([]);
    setIsLoading(true);
    setStatusMessage("Processing request...");
    setStreamingMessageId("streaming");
    handleSubmit(event);
  };

  const handleHistoryToggle = () => {
    if (!isSignedIn) return;
    if (!hasFetchedThreads) {
      void loadThreads();
    }
    setIsHistoryDrawerOpen((prev) => !prev);
  };

  const handleThreadSelect = (threadId: string) => {
    setConversationError(null);
    setActiveThreadId(threadId);
    activeThreadRef.current = threadId;
    setIsHistoryDrawerOpen(false);
  };

  const renderHistoryList = () => {
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

    if (threadsLoading) {
      return <HistorySkeleton />;
    }

    if (threadsError) {
      return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <p className="mb-3">{threadsError}</p>
          <Button
            size="sm"
            variant="secondary"
            className="w-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => loadThreads()}
          >
            Try again
          </Button>
        </div>
      );
    }

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

    return (
      <div className="space-y-2">
        {threads.map((thread) => {
          const isActive = thread.id === activeThreadId;
          const isRenaming = renameState?.id === thread.id;
          const isDisabled = pendingThreadId === thread.id;

          return (
            <div
              key={thread.id}
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              aria-disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) handleThreadSelect(thread.id);
              }}
              onKeyDown={(event) => {
                if (isDisabled) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleThreadSelect(thread.id);
                }
              }}
              className={cn(
                "group flex w-full flex-col rounded-2xl border border-white/5 bg-white/0 p-3 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                isActive && "border-white/20 bg-white/10",
                isDisabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
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
                    onBlur={() => {
                      const trimmed = renameState?.value?.trim();
                      if (trimmed && trimmed !== thread.title) {
                        void handleRenameThread(thread.id, trimmed);
                      } else {
                        setRenameState(null);
                      }
                    }}
                    onKeyDown={(event) => {
                      const trimmed = renameState?.value?.trim();
                      if (event.key === "Enter" && trimmed) {
                        event.preventDefault();
                        void handleRenameThread(thread.id, trimmed);
                      }
                      if (event.key === "Escape") {
                        setRenameState(null);
                      }
                    }}
                    className="h-8 rounded-lg border-white/20 bg-white/10 text-white placeholder:text-white/40"
                  />
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {thread.title}
                    </p>
                    <p className="text-xs text-white/60">
                      {thread.messagePreview ?? "No messages yet"}
                    </p>
                  </div>
                )}

                {isSignedIn && (
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
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
                        void handleDeleteThread(thread.id);
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
        })}
      </div>
    );
  };

  const historySidebar = (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/10 bg-slate-900/80 px-4 py-5 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-white/60">
            Conversations
          </p>
          <p className="text-sm font-semibold">
            {threads.length} saved {threads.length === 1 ? "chat" : "chats"}
          </p>
        </div>
        <SignedIn>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void createThread()}
            disabled={isCreatingThread}
            className="h-8 bg-white/20 text-white hover:bg-white/30"
          >
            <Plus size={14} className="mr-1" /> New
          </Button>
        </SignedIn>
      </div>
      <div className="flex-1 overflow-y-auto">{renderHistoryList()}</div>
    </aside>
  );

  const renderMessages = () => {
    if (!activeThreadId) {
      if (!isSignedIn) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-sm text-gray-600">
            <p>Sign in to use the AI assistant</p>
            <SignInButton mode="modal">
              <Button size="sm" className="bg-teal-500 hover:bg-teal-400">
                Sign in to chat
              </Button>
            </SignInButton>
          </div>
        );
      }

      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-gray-200">
          <p>Select a saved chat on the left or start a new one.</p>
          <Button
            size="sm"
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={() => void createThread()}
            disabled={isCreatingThread}
          >
            <Plus size={14} className="mr-1" /> New chat
          </Button>
        </div>
      );
    }

    if (conversationError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-gray-200">
          <p>{conversationError}</p>
          {activeThreadId ? (
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={() =>
                fetchThreadMessages(activeThreadId, { hydrate: true })
              }
            >
              Try again
            </Button>
          ) : null}
        </div>
      );
    }

    if (messages.length === 0) {
      if (!isSignedIn) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-sm text-gray-600">
            <p>Sign in to use the AI assistant</p>
            <p className="text-xs text-gray-500">
              Save questions and revisit answers any time.
            </p>
            <SignInButton mode="modal">
              <Button size="sm" className="bg-teal-500 hover:bg-teal-400">
                Sign in to chat
              </Button>
            </SignInButton>
          </div>
        );
      }

      return (
        <div className="flex h-full items-center justify-center p-6 text-sm text-gray-600">
          Start a conversation about your roadmap journey.
        </div>
      );
    }

    return (
      <div className="space-y-3 p-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "animate-in fade-in slide-in-from-bottom-2 rounded-xl px-4 py-3 text-white duration-300",
              message.role === "user"
                ? "ml-8 bg-[#8BBC81]"
                : "mr-8 bg-[#4A728A]",
            )}
          >
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide opacity-60">
              {message.role === "user" ? (
                "You"
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="sr-only">AI</span>
                  <Image
                    src="/ai-profile-pic.svg"
                    alt="Assistant"
                    width={28}
                    height={28}
                    className="rounded-full opacity-80"
                  />
                </span>
              )}
            </div>
            {message.role === "user" ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 text-xs leading-relaxed last:mb-0">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 list-disc space-y-0.5 pl-5 text-xs">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-xs">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic">{children}</em>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-white/20 px-1 py-0.5 font-mono text-xs">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="my-2 overflow-x-auto rounded-lg bg-white/10 p-2 text-xs">
                      {children}
                    </pre>
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
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : streamingMessageId === message.id ? (
              <Typewriter content={message.content} scrollContainerRef={containerRef} />
            ) : (
              <Fragment>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-2 text-xs leading-relaxed last:mb-0">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="mb-2 list-disc space-y-0.5 pl-5 text-xs">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-xs">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      code: ({ children }) => (
                        <code className="rounded bg-white/20 px-1 py-0.5 font-mono text-xs">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="my-2 overflow-x-auto rounded-lg bg-white/10 p-2 text-xs">
                          {children}
                        </pre>
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
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.id === messages[messages.length - 1]?.id &&
                  sources.length > 0 && <SourcesDisplay sources={sources} />}
              </Fragment>
            )}
          </div>
        ))}
        {(isLoading || statusMessage) && (
          <div className="mr-8 animate-pulse rounded-xl bg-gray-100 px-4 py-3 text-gray-900 dark:bg-white/5 dark:text-white/90">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide">
              AI
            </div>
            {statusMessage ? (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                {statusMessage}
              </div>
            ) : (
              <ChatLoading />
            )}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 text-red-400">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide">
              Error
            </div>
            <div className="text-xs">{error.message}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-3">
      {isExpanded && (
        <div className="flex max-h-[75vh] w-[min(960px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur dark:border-white/10 dark:bg-[#1f2a37]/95">
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/70">
                  Assistant
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeThread?.title ?? "New chat"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isDesktop && isSignedIn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHistoryToggle}
                    className="text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                    aria-label="Show history"
                  >
                    <Menu size={18} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                  aria-label="Collapse chat"
                >
                  <X size={18} />
                </Button>
              </div>
            </div>
            <div className="flex h-full flex-1 overflow-hidden">
              {isDesktop && historySidebar}
              <div className="relative flex flex-1 flex-col">
                <form
                  onSubmit={onSubmit}
                  className="border-b border-gray-200 p-4 dark:border-white/10"
                >
                  <div className="flex items-center gap-2 rounded-3xl bg-white px-3 py-1 shadow-sm dark:bg-white/10">
                    <Input
                      type="text"
                      placeholder={
                        !isSignedIn ? "Sign in to chat" : "Write your message"
                      }
                      disabled={isLoading || !isSignedIn}
                      value={input}
                      onChange={handleInputChange}
                      className="border-none bg-transparent text-sm text-black placeholder:text-black/40 focus-visible:ring-0 dark:text-white dark:placeholder:text-white/40"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim() || !isSignedIn}
                      className="rounded-full p-2 text-[#3369FF] transition hover:bg-[#3369FF]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Send message"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15.0205 5.50867L6.46046 1.22867C0.710459 -1.65133 -1.64954 0.70867 1.23046 6.45867L2.10046 8.19867C2.35046 8.70867 2.35046 9.29867 2.10046 9.80867L1.23046 11.5387C-1.64954 17.2887 0.700459 19.6487 6.46046 16.7687L15.0205 12.4887C18.8605 10.5687 18.8605 7.42867 15.0205 5.50867ZM11.7905 9.74867H6.39046C5.98046 9.74867 5.64046 9.40867 5.64046 8.99867C5.64046 8.58867 5.98046 8.24867 6.39046 8.24867H11.7905C12.2005 8.24867 12.5405 8.58867 12.5405 8.99867C12.5405 9.40867 12.2005 9.74867 11.7905 9.74867Z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                  {selectedNodeId && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-white/50">
                      Asking about the current step
                    </p>
                  )}
                </form>

                <div ref={containerRef} className="flex-1 overflow-y-auto">
                  {threadMessagesLoading && isSignedIn ? (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-white/70">
                      Loading conversation…
                    </div>
                  ) : (
                    renderMessages()
                  )}
                </div>

                {showScrollButton && messages.length > 0 && (
                  <div className="flex justify-center bg-transparent py-2">
                    <button
                      onClick={scrollToBottom}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5A829A] text-white shadow-lg transition-all hover:bg-[#6A92AA]"
                      aria-label="Scroll to bottom"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isDesktop && isHistoryDrawerOpen && (
            <div className="absolute inset-0 z-50 flex">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setIsHistoryDrawerOpen(false)}
              />
              <div className="relative h-full w-72 bg-slate-900/95 shadow-2xl">
                {historySidebar}
              </div>
            </div>
          )}
        </div>
      )}

      <ChatButton
        isExpanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
      />
    </div>
  );
}
