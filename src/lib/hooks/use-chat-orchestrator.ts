/**
 * Orchestrator hook that composes all chat hooks and manages cross-cutting concerns.
 * This hook coordinates authentication, sidebar, threads, messages, scroll, and FAQ.
 */

import { useEffect, useRef, type RefObject } from "react";
import { useChatAuth } from "./use-chat-auth";
import { useChatSidebar } from "./use-chat-sidebar";
import { useChatScroll } from "./use-chat-scroll";
import { useChatThreads } from "./use-chat-threads";
import { useFaqQuickQuestions } from "./use-faq-quick-questions";
import { useChatMessages } from "./use-chat-messages";
import type { ThreadMessageResponse } from "@/lib/chat-threads";

interface UseChatOrchestratorProps {
  selectedNodeId?: string | null;
  roadmapId?: string;
  userProfile?: {
    trade?: string;
    currentLevel?: string;
    specialization?: string;
    residencyStatus?: string;
  };
  onCustomNodeCreated?: (nodeId?: string) => void;
  isExpanded: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  messagesContainerRef: RefObject<HTMLDivElement>;
}

/**
 * Orchestrator hook that composes all chat functionality.
 * Manages state coordination between auth, threads, messages, sidebar, scroll, and FAQ.
 */
export function useChatOrchestrator({
  selectedNodeId,
  roadmapId,
  userProfile,
  onCustomNodeCreated,
  isExpanded,
  messagesEndRef,
  messagesContainerRef,
}: UseChatOrchestratorProps) {
  // Authentication state
  const auth = useChatAuth();

  // Sidebar state (desktop/mobile, collapsed)
  const sidebar = useChatSidebar();

  //Note: These hooks have circular dependencies that are resolved through refs
  // Initialize messages first to get setters needed by threads

  // Temporary refs to avoid circular dependency issues
  const tempActiveThreadRef = useRef<string | null>(null);
  const tempFetchThreadMessages = useRef<
    (
      threadId: string,
      options?: { hydrate?: boolean; silent?: boolean },
    ) => Promise<void>
  >(async () => {
    // Will be replaced by threads hook
  });
  const tempSetThreadMessagesCache = useRef<
    React.Dispatch<
      React.SetStateAction<Record<string, ThreadMessageResponse[]>>
    >
  >(() => {
    // Will be replaced by threads hook
  });

  // Message streaming and AI chat
  const messages = useChatMessages({
    roadmapId: roadmapId ?? null,
    selectedNodeId: selectedNodeId ?? null,
    userProfile,
    isSignedIn: auth.isAuthenticated,
    activeThreadId: tempActiveThreadRef.current,
    activeThreadRef: tempActiveThreadRef,
    fetchThreadMessages: tempFetchThreadMessages.current,
    setThreadMessagesCache: tempSetThreadMessagesCache.current,
    onCustomNodeCreated,
  });

  // Thread management (CRUD, caching, localStorage)
  const threads = useChatThreads({
    isSignedIn: auth.isAuthenticated,
    roadmapId: roadmapId ?? null,
    selectedNodeId: selectedNodeId ?? null,
    setMessages: messages.setMessages,
    setSources: messages.setSources,
  });

  // Wire up the circular dependencies
  useEffect(() => {
    tempActiveThreadRef.current = threads.activeThreadId;
    tempFetchThreadMessages.current = threads.fetchThreadMessages;
    tempSetThreadMessagesCache.current = threads.setThreadMessagesCache;
  }, [
    threads.activeThreadId,
    threads.fetchThreadMessages,
    threads.setThreadMessagesCache,
  ]);

  // Scroll behavior (auto-scroll, scroll-to-bottom button)
  const scroll = useChatScroll(messagesEndRef, messagesContainerRef);

  // FAQ quick questions
  const faq = useFaqQuickQuestions({
    isExpanded,
  });

  // Load threads when chat expands (only for authenticated users)
  useEffect(() => {
    if (!auth.isAuthenticated || !isExpanded || threads.hasFetchedThreads)
      return;
    void threads.loadThreads();
  }, [auth.isAuthenticated, isExpanded, threads.hasFetchedThreads, threads]);

  return {
    auth,
    sidebar,
    threads,
    messages,
    scroll,
    faq,
  };
}
