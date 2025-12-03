"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  X,
  ArrowDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  Mic,
} from "lucide-react";
import { ChatButton } from "./chat-button";
import { useVoiceRecording } from "@/lib/hooks/use-voice-recording";
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

// Import extracted types and utilities
import type { ChatWidgetProps, FaqQuickEntry } from "./types";
import {
  isRecord,
  isStatusEvent,
  isMetadataEvent,
  isSourceDocument,
  filterEmptyMessages,
  mapThreadMessagesToChatMessages,
  extractLatestSources,
} from "./utils";

// Import extracted components
import { HistoryList } from "./history-list";
import { MessageList, hasPendingProposals } from "./message-list";
import { FaqQuickQuestions } from "./faq-quick-questions";
import type { NodeProposal, ProposalStatus } from "./node-proposal-card";

/** Tracks the status of each proposal by toolCallId */
export interface ProposalStatusEntry {
  status: ProposalStatus;
  errorMessage?: string;
}

export function ChatWidget({
  selectedNodeId,
  selectedNodeTitle,
  roadmapId,
  userProfile,
  onChatOpen,
  forceClose,
  onCustomNodeCreated,
  isNodePanelOpen = false,
}: ChatWidgetProps) {
  const { isSignedIn } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [threads, setThreads] = useState<ThreadResponse[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );
  const [threadMessagesCache, setThreadMessagesCache] = useState<
    Record<string, ThreadMessageResponse[]>
  >({});
  const [threadMessagesLoading, setThreadMessagesLoading] = useState(false);
  const [hasFetchedThreads, setHasFetchedThreads] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [faqEntries, setFaqEntries] = useState<FaqQuickEntry[]>([]);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [faqLoading, setFaqLoading] = useState(false);
  const [hasLoadedFaqs, setHasLoadedFaqs] = useState(false);
  const [isCreatingProposedNode, setIsCreatingProposedNode] = useState(false);
  // Track proposal statuses locally to avoid AI continuation from addToolResult
  const [proposalStatuses, setProposalStatuses] = useState<
    Record<string, ProposalStatusEntry>
  >({});

  const {
    isRecording,
    isTranscribing,
    error: voiceError,
    startRecording,
    stopRecording,
  } = useVoiceRecording();

  const activeThreadRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    activeThreadRef.current = activeThreadId;
  }, [activeThreadId]);

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("chat-sidebar-collapsed");
    if (stored !== null) {
      setIsSidebarCollapsed(stored === "true");
    }
  }, []);

  // Persist sidebar collapsed state to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("chat-sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Auto-collapse sidebar when both chat and node info panel are open (to save screen space)
  useEffect(() => {
    if (isExpanded && isNodePanelOpen && isDesktop && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    }
  }, [isExpanded, isNodePanelOpen, isDesktop, isSidebarCollapsed]);

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
    setInput,
    data: streamData,
  } = useChat({
    api: "/api/chat",
    streamProtocol: "data",
    maxSteps: 5,
    onToolCall: ({ toolCall }) => {
      // Display user-friendly status messages for tool calls
      const toolNames: Record<string, string> = {
        createNode: "Creating custom node...",
        updateNode: "Updating node...",
        deleteNode: "Deleting node...",
        listCustomNodes: "Loading your custom nodes...",
        deleteDuplicateNodes: "Removing duplicate nodes...",
      };
      const message =
        toolNames[toolCall.toolName] ?? `Processing ${toolCall.toolName}...`;
      setStatusMessage(message);
    },
    onError: (chatError) => {
      logger.error("Chat error", chatError);
      setIsLoading(false);
      setStatusMessage(null);
    },
    onResponse: () => {
      setIsLoading(true);
      setStatusMessage(null);
    },
    onFinish: (message) => {
      setIsLoading(false);
      setStatusMessage(null);
      setStreamingMessageId(null);

      // Check if the finished message has pending tool calls that need user confirmation
      // If so, DON'T hydrate from DB as it would lose the tool invocation state
      const hasPendingToolCalls = message.toolInvocations?.some(
        (inv) => inv.state === "call" && inv.toolName === "proposeNode",
      );

      if (isSignedIn && activeThreadId && !hasPendingToolCalls) {
        void fetchThreadMessages(activeThreadId, {
          hydrate: true,
          silent: true,
        });
      }

      // Check if a custom node was created and extract the node ID
      let createdNodeId: string | undefined;
      if (streamData && Array.isArray(streamData)) {
        const nodeCreatedEvent = streamData.find(
          (event) =>
            isRecord(event) &&
            event.type === "custom_node_created" &&
            typeof event.nodeId === "string",
        );
        if (nodeCreatedEvent && isRecord(nodeCreatedEvent)) {
          createdNodeId = nodeCreatedEvent.nodeId as string;
        }
      }

      // Notify parent to refresh custom nodes (seamless, no page reload)
      if (onCustomNodeCreated) {
        // Small delay to ensure database write completes
        setTimeout(() => {
          onCustomNodeCreated(createdNodeId);
        }, 500);
      }
    },
    experimental_prepareRequestBody: ({
      messages: outgoingMessages,
      ...rest
    }) => {
      const filtered = filterEmptyMessages(outgoingMessages);
      // Limit to most recent 50 messages to stay within backend validation limits
      const messagesToSend = filtered.length > 0 ? filtered : outgoingMessages;
      const limitedMessages = messagesToSend.slice(-50);

      return {
        ...rest,
        messages: limitedMessages,
        roadmap_id: roadmapId,
        selected_node_id: selectedNodeId ?? undefined,
        user_profile: userProfile,
        thread_id: activeThreadRef.current ?? undefined,
      };
    },
  });

  // Check if there are any pending proposals that require user action
  const isProposalPending = useMemo(
    () => hasPendingProposals(messages, proposalStatuses),
    [messages, proposalStatuses],
  );

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
      localStorage.removeItem(CHAT_CONFIG.STORAGE_KEY);
      setIsHydrated(true);
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
        localStorage.setItem(CHAT_CONFIG.STORAGE_KEY, serialized);
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          logger.warn("localStorage quota exceeded, clearing old messages", {
            messageCount: messages.length,
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

  // Force close chat when tutorial starts
  useEffect(() => {
    if (forceClose) {
      setIsExpanded(false);
    }
  }, [forceClose]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    if (!isExpanded) return;
    const container = containerRef.current;
    if (!container) return;

    const { scrollHeight } = container;
    container.scrollTo({
      top: scrollHeight,
      behavior: didMountRef.current ? "smooth" : "auto",
    });

    didMountRef.current = true;
  }, [isExpanded, messages.length]);

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
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
      setIsTablet(width >= 768 && width < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isSignedIn || !isExpanded || hasFetchedThreads) return;
    void loadThreads();
  }, [hasFetchedThreads, isExpanded, isSignedIn, loadThreads]);

  useEffect(() => {
    if (!isExpanded || hasLoadedFaqs) return;

    const loadFaqs = async () => {
      setFaqLoading(true);
      setFaqError(null);

      try {
        // First try global FAQs (platform-wide highlights)
        const globalResponse = await fetch("/api/faq?global=true", {
          cache: "no-store",
        });

        if (!globalResponse.ok) {
          throw new Error("Failed to load FAQs");
        }

        const globalJson: unknown = await globalResponse.json();
        if (!Array.isArray(globalJson)) {
          throw new Error("FAQ response is not an array");
        }

        let entries = globalJson
          .map((value): FaqQuickEntry | null => {
            if (!isRecord(value)) return null;
            const { id, question, frequency } = value;
            if (typeof id !== "string" || typeof question !== "string") {
              return null;
            }
            return {
              id,
              question,
              frequency: typeof frequency === "number" ? frequency : 1,
            };
          })
          .filter((entry): entry is FaqQuickEntry => entry !== null);

        // If no global FAQs are flagged yet, fall back to category entries
        if (entries.length === 0) {
          const categoriesResponse = await fetch("/api/faq", {
            cache: "no-store",
          });

          if (!categoriesResponse.ok) {
            throw new Error("Failed to load category FAQs");
          }

          const categoriesJson: unknown = await categoriesResponse.json();
          if (!Array.isArray(categoriesJson)) {
            throw new Error("FAQ categories response is not an array");
          }

          const fromCategories: FaqQuickEntry[] = [];

          for (const category of categoriesJson) {
            if (!isRecord(category)) continue;
            const { faqEntries } = category;
            if (!Array.isArray(faqEntries)) continue;

            for (const value of faqEntries) {
              if (!isRecord(value)) continue;
              const { id, question, frequency } = value;
              if (typeof id !== "string" || typeof question !== "string") {
                continue;
              }
              fromCategories.push({
                id,
                question,
                frequency: typeof frequency === "number" ? frequency : 1,
              });
            }
          }

          entries = fromCategories;
        }

        const topEntries = entries
          .sort((a, b) => b.frequency - a.frequency)
          .slice(0, 10);

        setFaqEntries(topEntries);
      } catch (err) {
        setFaqError(err instanceof Error ? err.message : "Failed to load FAQs");
      } finally {
        setFaqLoading(false);
        setHasLoadedFaqs(true);
      }
    };

    void loadFaqs();
  }, [hasLoadedFaqs, isExpanded]);

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

    // Optimistically show UI feedback immediately
    setSources([]);
    setIsLoading(true);
    setStatusMessage("Processing request...");
    setStreamingMessageId("streaming");

    // Create thread in background if needed (don't block UI)
    if (!activeThreadId) {
      // Start thread creation but don't await - handleSubmit will handle it
      void createThread().then((thread) => {
        if (thread) {
          activeThreadRef.current = thread.id;
        } else {
          // Thread creation failed - reset UI
          setIsLoading(false);
          setStatusMessage(null);
          setStreamingMessageId(null);
          logger.error("Failed to create thread before sending", undefined, {
            selectedNodeId,
          });
        }
      });
    } else {
      activeThreadRef.current = activeThreadId;
    }

    // Submit immediately (useChat handles optimistic updates)
    handleSubmit(event);
  };

  const handleFaqClick = useCallback(
    async (question: string) => {
      if (!isSignedIn) {
        logger.info("Guest attempted to use FAQ quick question", {
          nodeId: selectedNodeId,
        });
        return;
      }

      const trimmed = question.trim();
      if (!trimmed) return;

      // Set input and show UI feedback immediately
      setInput(trimmed);
      setSources([]);
      setIsLoading(true);
      setStatusMessage("Processing request...");
      setStreamingMessageId("streaming");

      // Create thread in background if needed
      if (!activeThreadId) {
        void createThread().then((thread) => {
          if (thread) {
            setActiveThreadId(thread.id);
            activeThreadRef.current = thread.id;
          } else {
            // Thread creation failed - reset UI
            setIsLoading(false);
            setStatusMessage(null);
            setStreamingMessageId(null);
            logger.error(
              "Failed to create thread before sending FAQ question",
              undefined,
              { selectedNodeId },
            );
          }
        });
      } else {
        activeThreadRef.current = activeThreadId;
      }

      // Submit immediately
      handleSubmit();
    },
    [
      activeThreadId,
      createThread,
      isSignedIn,
      handleSubmit,
      selectedNodeId,
      setActiveThreadId,
      setInput,
    ],
  );

  /**
   * Handle accepting a node proposal from the proposeNode tool.
   * Creates the node directly via REST API, then updates local state.
   * We use local state instead of addToolResult to avoid triggering AI continuation.
   */
  const handleProposalAccept = useCallback(
    async (toolCallId: string, proposal: NodeProposal) => {
      if (!isSignedIn) return;

      setIsCreatingProposedNode(true);
      setStatusMessage("Creating node...");

      try {
        // Transform checklistItems from strings to objects with id, title, completed
        const formattedChecklistItems = proposal.checklistItems?.map(
          (item, index) => ({
            id: `item-${Date.now()}-${index}`,
            title: item,
            completed: false,
          }),
        );

        // Create the node directly via REST API
        const response = await fetch("/api/custom-nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roadmapId: roadmapId ?? "electrician-bc",
            parentId: proposal.parentId,
            title: proposal.title,
            description: proposal.description,
            type: proposal.type,
            content: {
              checklistItems: formattedChecklistItems ?? null,
              resources: proposal.resources,
              notes: proposal.notes,
              dueDate: proposal.dueDate,
            },
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errorData.error ?? "Failed to create node");
        }

        // Update local state to show accepted status (no AI continuation)
        setProposalStatuses((prev) => ({
          ...prev,
          [toolCallId]: { status: "accepted" },
        }));

        // Notify the roadmap to refresh custom nodes
        onCustomNodeCreated?.();

        setStatusMessage("Node created successfully!");
        setTimeout(() => setStatusMessage(null), 2000);
      } catch (err) {
        logger.error("Failed to create node from proposal", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create node";

        // Update local state to show error status
        setProposalStatuses((prev) => ({
          ...prev,
          [toolCallId]: { status: "error", errorMessage },
        }));

        setStatusMessage(errorMessage);
        setTimeout(() => setStatusMessage(null), 3000);
      } finally {
        setIsCreatingProposedNode(false);
      }
    },
    [isSignedIn, roadmapId, onCustomNodeCreated],
  );

  /**
   * Handle declining a node proposal.
   * Updates local state to show declined status without triggering AI continuation.
   */
  const handleProposalDecline = useCallback(
    (toolCallId: string) => {
      if (!isSignedIn) return;

      // Update local state to show declined status (no AI continuation)
      setProposalStatuses((prev) => ({
        ...prev,
        [toolCallId]: { status: "declined" },
      }));

      logger.info("Node proposal declined", { toolCallId });
    },
    [isSignedIn],
  );

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

  const renderHistoryList = () => (
    <HistoryList
      isSignedIn={!!isSignedIn}
      threads={threads}
      activeThreadId={activeThreadId}
      pendingThreadId={pendingThreadId}
      threadsLoading={threadsLoading}
      threadsError={threadsError}
      onThreadSelect={handleThreadSelect}
      onThreadRename={handleRenameThread}
      onThreadDelete={handleDeleteThread}
      onRetry={loadThreads}
    />
  );

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] tracking-wide text-white/60 uppercase">
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
            disabled={isCreatingThread || messages.length === 0}
            className="h-8 bg-white/20 text-white hover:bg-white/30 disabled:opacity-40"
            title={
              messages.length === 0
                ? "Start a conversation first"
                : "Start new chat"
            }
          >
            <Plus size={14} className="mr-1" /> New
          </Button>
        </SignedIn>
      </div>
      <div className="flex-1 overflow-y-auto">{renderHistoryList()}</div>
    </div>
  );

  const historySidebar = (
    <AnimatePresence mode="wait">
      {!isSidebarCollapsed && (
        <motion.aside
          key="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 256, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex h-full shrink-0 flex-col overflow-hidden border-r border-white/10 bg-slate-900/80 text-white"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="h-full"
          >
            {renderSidebarContent()}
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
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

      // Show welcome message when no active thread (will auto-create on first message)
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="rounded-full bg-gradient-to-br from-teal-500/20 to-blue-500/20 p-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-600 dark:text-teal-400"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="9" y1="10" x2="15" y2="10" />
              <line x1="12" y1="7" x2="12" y2="13" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              What do you want to learn about?
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Ask me anything about your roadmap journey, requirements, or
              career path.
            </p>
          </div>
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
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="rounded-full bg-gradient-to-br from-teal-500/20 to-blue-500/20 p-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-600 dark:text-teal-400"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="9" y1="10" x2="15" y2="10" />
              <line x1="12" y1="7" x2="12" y2="13" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              What do you want to learn about?
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Ask me anything about your roadmap journey, requirements, or
              career path.
            </p>
          </div>
        </div>
      );
    }

    return (
      <MessageList
        messages={messages}
        sources={sources}
        isLoading={isLoading}
        statusMessage={statusMessage}
        error={error}
        streamingMessageId={streamingMessageId}
        onProposalAccept={handleProposalAccept}
        onProposalDecline={handleProposalDecline}
        proposalDisabled={isCreatingProposedNode}
        proposalStatuses={proposalStatuses}
      />
    );
  };

  // Calculate responsive chat width based on screen size and node panel state
  const chatWidth = useMemo(() => {
    if (!isDesktop && !isTablet) {
      // Mobile: full width with small margins
      return "calc(100vw - 2rem)";
    }

    if (isTablet) {
      // Tablet: constrained width, smaller when node panel is open
      return isNodePanelOpen
        ? "min(420px, calc(100vw - 2rem))"
        : "min(500px, calc(100vw - 2rem))";
    }

    // Desktop: larger width, adjust for sidebar and node panel
    if (isNodePanelOpen) {
      // When node panel is open, always use collapsed sidebar width
      return "min(500px, calc(100vw - 3rem))";
    }

    return isSidebarCollapsed
      ? "min(700px, calc(100vw - 3rem))"
      : "min(960px, calc(100vw - 3rem))";
  }, [isDesktop, isTablet, isNodePanelOpen, isSidebarCollapsed]);

  // Calculate responsive chat height
  const chatHeight = useMemo(() => {
    if (!isDesktop && !isTablet) {
      // Mobile: taller to maximize screen usage
      return "85vh";
    }
    return "75vh";
  }, [isDesktop, isTablet]);

  return (
    <div
      className={cn(
        "fixed z-40 flex flex-col items-end gap-3",
        // Responsive positioning
        isDesktop || isTablet ? "right-6 bottom-6" : "right-3 bottom-3",
      )}
    >
      {isExpanded && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            width: chatWidth,
          }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ height: chatHeight, maxHeight: chatHeight }}
          className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur dark:border-white/10 dark:bg-[#1f2a37]/95"
        >
          <div className="flex h-full min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
              <div className="min-w-0 flex-1 overflow-hidden pr-4">
                <p className="text-xs tracking-wide text-gray-500 uppercase dark:text-white/70">
                  Assistant
                </p>
                <p className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                  {activeThread?.title ?? "New chat"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSignedIn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void createThread()}
                    disabled={isCreatingThread || messages.length === 0}
                    className="text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-white dark:hover:bg-white/10"
                    aria-label="Start new chat"
                    title={
                      messages.length === 0
                        ? "Start a conversation first"
                        : "Start new chat"
                    }
                  >
                    <Plus size={18} />
                  </Button>
                )}
                {isDesktop && isSignedIn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    className="text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                    aria-label={
                      isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"
                    }
                  >
                    <motion.div
                      initial={false}
                      animate={{ rotate: isSidebarCollapsed ? 0 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      {isSidebarCollapsed ? (
                        <ChevronRight size={18} />
                      ) : (
                        <ChevronLeft size={18} />
                      )}
                    </motion.div>
                  </Button>
                )}
                {!isDesktop && isSignedIn && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHistoryToggle}
                    className="text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                    aria-label={
                      isHistoryDrawerOpen ? "Hide history" : "Show history"
                    }
                  >
                    <motion.div
                      initial={false}
                      animate={{ rotate: isHistoryDrawerOpen ? 0 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      {isHistoryDrawerOpen ? (
                        <ChevronLeft size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </motion.div>
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
              <div className="relative flex min-w-0 flex-1 flex-col">
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

                <form
                  onSubmit={onSubmit}
                  className="border-t border-gray-200 p-4 dark:border-white/10"
                >
                  {selectedNodeId && selectedNodeTitle && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 mb-3 duration-300">
                      <div className="relative overflow-hidden rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-500/10 to-blue-500/10 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/20">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-teal-600 dark:text-teal-400"
                            >
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium tracking-wide text-teal-900 uppercase dark:text-teal-100">
                              Asking about
                            </p>
                            <p className="truncate text-sm font-semibold text-teal-700 dark:text-teal-300">
                              {selectedNodeTitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <FaqQuickQuestions
                    faqEntries={faqEntries}
                    faqError={faqError}
                    faqLoading={faqLoading}
                    isLoading={isLoading}
                    isSignedIn={isSignedIn}
                    onFaqClick={handleFaqClick}
                  />
                  <div className="flex items-center gap-2 rounded-3xl bg-white px-3 py-1 shadow-sm dark:bg-white/10">
                    <Input
                      type="text"
                      placeholder={
                        !isSignedIn
                          ? "Sign in to chat"
                          : isProposalPending
                            ? "Please accept or decline the proposal above"
                            : isTranscribing
                              ? "Transcribing..."
                              : "Write your message"
                      }
                      disabled={
                        !isSignedIn || isTranscribing || isProposalPending
                      }
                      value={input}
                      onChange={handleInputChange}
                      className="border-none bg-transparent text-sm text-black placeholder:text-black/40 focus-visible:ring-0 dark:text-white dark:placeholder:text-white/40"
                    />
                    <button
                      type="button"
                      disabled={
                        !isSignedIn ||
                        isLoading ||
                        isTranscribing ||
                        isProposalPending
                      }
                      onClick={async () => {
                        if (isRecording) {
                          const transcript = await stopRecording();
                          if (transcript) {
                            setInput(transcript);
                          }
                        } else {
                          await startRecording();
                        }
                      }}
                      className={cn(
                        "rounded-full p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10",
                        isRecording
                          ? "animate-pulse text-red-500"
                          : "text-gray-600 dark:text-white/70",
                      )}
                      aria-label={
                        isRecording ? "Stop recording" : "Start voice recording"
                      }
                      title={isRecording ? "Stop recording" : "Voice input"}
                    >
                      <Mic size={18} />
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isLoading ||
                        !input.trim() ||
                        !isSignedIn ||
                        isProposalPending
                      }
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
                  {voiceError && (
                    <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                      {voiceError}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {!isDesktop && isHistoryDrawerOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-50 flex"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setIsHistoryDrawerOpen(false)}
                />
                <motion.div
                  initial={{ x: -256 }}
                  animate={{ x: 0 }}
                  exit={{ x: -256 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="relative h-full w-64 bg-slate-900/80 text-white shadow-2xl"
                >
                  {renderSidebarContent()}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <ChatButton
        isExpanded={isExpanded}
        onClick={() => {
          const wasExpanded = isExpanded;
          setIsExpanded(!isExpanded);
          if (!wasExpanded && onChatOpen) {
            onChatOpen();
          }
        }}
      />
    </div>
  );
}
