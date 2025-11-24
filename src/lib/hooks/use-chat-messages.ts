import { useEffect, useState, useCallback } from "react";
import { useChat } from "ai/react";
import { logger } from "@/lib/logger";
import type { SourceDocument } from "@/lib/embeddings-service";
import type { ThreadMessageResponse } from "@/lib/chat-threads";
import {
  filterEmptyMessages,
  isStatusEvent,
  isMetadataEvent,
  isSourceDocument,
  isRecord,
} from "@/components/chat/utils";

interface UseChatMessagesProps {
  roadmapId: string | null;
  selectedNodeId: string | null;
  userProfile?: {
    trade?: string;
    currentLevel?: string;
    specialization?: string;
    residencyStatus?: string;
  };
  isSignedIn: boolean;
  activeThreadId: string | null;
  activeThreadRef: React.RefObject<string | null>;
  fetchThreadMessages: (
    threadId: string,
    options?: { hydrate?: boolean; silent?: boolean },
  ) => Promise<void>;
  setThreadMessagesCache: React.Dispatch<
    React.SetStateAction<Record<string, ThreadMessageResponse[]>>
  >;
  onCustomNodeCreated?: (nodeId?: string) => void;
}

interface UseChatMessagesReturn {
  // useChat hook passthrough
  messages: ReturnType<typeof useChat>["messages"];
  input: string;
  handleInputChange: ReturnType<typeof useChat>["handleInputChange"];
  handleSubmit: ReturnType<typeof useChat>["handleSubmit"];
  error: ReturnType<typeof useChat>["error"];
  setMessages: ReturnType<typeof useChat>["setMessages"];
  setInput: ReturnType<typeof useChat>["setInput"];
  streamData: ReturnType<typeof useChat>["data"];

  // Additional state
  sources: SourceDocument[];
  setSources: React.Dispatch<React.SetStateAction<SourceDocument[]>>;
  statusMessage: string | null;
  setStatusMessage: React.Dispatch<React.SetStateAction<string | null>>;
  streamingMessageId: string | null;
  setStreamingMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  conversationError: string | null;
  setConversationError: React.Dispatch<React.SetStateAction<string | null>>;

  // Utilities
  hydrateMessagesFromThread: (
    threadId: string,
    conversation: ThreadMessageResponse[],
  ) => void;
}

/**
 * Custom hook for managing chat messages, streaming, sources, and AI chat integration.
 * Wraps Vercel AI SDK's useChat hook with additional state management.
 */
export function useChatMessages({
  roadmapId,
  selectedNodeId,
  userProfile,
  isSignedIn,
  activeThreadId,
  activeThreadRef,
  fetchThreadMessages,
  setThreadMessagesCache,
  onCustomNodeCreated,
}: UseChatMessagesProps): UseChatMessagesReturn {
  // State
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );

  // useChat integration
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
    onFinish: () => {
      setIsLoading(false);
      setStatusMessage(null);
      setStreamingMessageId(null);
      if (isSignedIn && activeThreadId) {
        void fetchThreadMessages(activeThreadId, {
          hydrate: true,
          silent: true,
        });
      }

      // Check if a custom node was created and extract the node ID
      let createdNodeId: string | undefined;
      if (streamData && Array.isArray(streamData)) {
        const nodeCreatedEvent = streamData.find((event) => {
          if (!isRecord(event)) return false;
          return (
            event.type === "custom_node_created" &&
            typeof event.nodeId === "string"
          );
        });
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

  // Hydrate messages from thread response
  const hydrateMessagesFromThread = useCallback(
    (threadId: string, conversation: ThreadMessageResponse[]) => {
      setThreadMessagesCache((prev) => ({
        ...prev,
        [threadId]: conversation,
      }));
      setMessages(
        conversation.map((msg) => ({
          id: msg.id,
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
      );
      const latestWithSources = [...conversation]
        .reverse()
        .find((msg) => msg.sources && msg.sources.length > 0);
      setSources(latestWithSources?.sources ?? []);
    },
    [setMessages, setThreadMessagesCache],
  );

  // Extract sources from streamData
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

  return {
    // useChat passthrough
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    setMessages,
    setInput,
    streamData,

    // Additional state
    sources,
    setSources,
    statusMessage,
    setStatusMessage,
    streamingMessageId,
    setStreamingMessageId,
    isLoading,
    setIsLoading,
    conversationError,
    setConversationError,

    // Utilities
    hydrateMessagesFromThread,
  };
}
