import { memo, useMemo } from "react";
import type { Message } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { SourceDocument } from "@/lib/embeddings-service";
import ChatLoading from "./chat-loading";
import { SourcesDisplay } from "./sources-display";
import {
  createCitationParagraphRenderer,
  createCitationListItemRenderer,
} from "./inline-citation-renderer";
import {
  NodeProposalCard,
  type NodeProposal,
  type ProposalStatus,
} from "./node-proposal-card";
import type { ProposalStatusEntry } from "./chat-widget";

// Memoized markdown components to prevent recreation on each render
const userMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 text-xs leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-5 text-xs">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-xs">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-white/20 px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-white/10 p-2 text-xs">
      {children}
    </pre>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#76E54A] underline underline-offset-2 hover:text-[#76E54A]/80"
    >
      {children}
    </a>
  ),
};

// Base assistant markdown components (without citation renderers)
const baseAssistantComponents = {
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-5 text-xs">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-xs">{children}</ol>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-white/20 px-1 py-0.5 font-mono text-xs">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-white/10 p-2 text-xs">
      {children}
    </pre>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#76E54A] underline underline-offset-2 hover:text-[#76E54A]/80"
    >
      {children}
    </a>
  ),
};

// Streaming message component - simple markdown without citations
const StreamingMessage = memo(function StreamingMessage({
  content,
}: {
  content: string;
}) {
  // Use simple paragraph renderer for streaming (no citation processing)
  const streamingComponents = useMemo(
    () => ({
      ...baseAssistantComponents,
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="mb-2 text-xs leading-relaxed last:mb-0">{children}</p>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="leading-relaxed">{children}</li>
      ),
    }),
    [],
  );

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={streamingComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

// Completed assistant message with citations
const CompletedAssistantMessage = memo(function CompletedAssistantMessage({
  content,
  sources,
  showSources,
  isLastMessage,
}: {
  content: string;
  sources: SourceDocument[];
  showSources: boolean;
  isLastMessage: boolean;
}) {
  // Create the citation renderers once, memoized based on sources
  const CitationParagraph = useMemo(
    () => createCitationParagraphRenderer(sources),
    [sources],
  );
  const CitationListItem = useMemo(
    () => createCitationListItemRenderer(sources),
    [sources],
  );

  const assistantComponents = useMemo(
    () => ({
      ...baseAssistantComponents,
      p: CitationParagraph,
      li: CitationListItem,
    }),
    [CitationParagraph, CitationListItem],
  );

  return (
    <>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={assistantComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
      {isLastMessage && sources.length > 0 && showSources && (
        <SourcesDisplay sources={sources} />
      )}
    </>
  );
});

// User message component
const UserMessage = memo(function UserMessage({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={userMarkdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
});

/**
 * A proposal with its current status (pending, accepted, declined, error)
 */
export interface ProposalWithStatus {
  toolCallId: string;
  proposal: NodeProposal;
  status: ProposalStatus;
  errorMessage?: string;
}

/**
 * Check if any message has pending proposeNode tool calls that need user confirmation.
 * Used to determine if sources should be shown (sources should wait until all proposals are resolved).
 */
function hasPendingProposals(
  messages: Message[],
  externalStatuses?: Record<string, ProposalStatusEntry>,
): boolean {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const toolInvocations = message.toolInvocations;
    if (!toolInvocations || !Array.isArray(toolInvocations)) continue;

    for (const invocation of toolInvocations) {
      if (invocation.toolName !== "proposeNode") continue;

      // Check external state first
      const externalStatus = externalStatuses?.[invocation.toolCallId];
      if (externalStatus) {
        // External state exists - check if it's still pending
        if (externalStatus.status === "pending") return true;
        continue; // Has external state but not pending
      }

      // Fall back to tool invocation state
      if (invocation.state === "call") {
        // Tool call is pending - waiting for user confirmation
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract proposeNode tool invocations from a message with their status.
 *
 * Status priority:
 * 1. External state (proposalStatuses) - for local tracking after user action
 * 2. Tool invocation result state - for persisted/hydrated messages
 * 3. Tool invocation call state - pending confirmation
 *
 * The tool args contain the proposal data directly (title, description, etc.)
 */
function extractProposalsWithStatus(
  message: Message,
  externalStatuses?: Record<string, ProposalStatusEntry>,
): ProposalWithStatus[] {
  if (message.role !== "assistant") return [];

  // AI SDK stores tool invocations in message.toolInvocations
  const toolInvocations = message.toolInvocations;
  if (!toolInvocations || !Array.isArray(toolInvocations)) return [];

  const proposals: ProposalWithStatus[] = [];

  for (const invocation of toolInvocations) {
    if (invocation.toolName !== "proposeNode") continue;

    const args = invocation.args as {
      title?: string;
      description?: string;
      parentId?: string;
      parentLabel?: string;
      type?: "checklist" | "resource" | "action" | "roadblock";
      checklistItems?: string[] | null;
      resources?: Array<{ label: string; href: string }> | null;
      notes?: string | null;
      dueDate?: string | null;
    };

    // Validate required fields are present
    if (!args.title || !args.description || !args.parentId || !args.type) {
      continue;
    }

    const proposal: NodeProposal = {
      title: args.title,
      description: args.description,
      parentId: args.parentId,
      parentLabel: args.parentLabel ?? args.parentId,
      type: args.type,
      checklistItems: args.checklistItems ?? null,
      resources: args.resources ?? null,
      notes: args.notes ?? null,
      dueDate: args.dueDate ?? null,
    };

    // Check external state first (highest priority - local tracking)
    const externalStatus = externalStatuses?.[invocation.toolCallId];
    if (externalStatus) {
      proposals.push({
        toolCallId: invocation.toolCallId,
        proposal,
        status: externalStatus.status,
        errorMessage: externalStatus.errorMessage,
      });
      continue;
    }

    // Fall back to tool invocation state
    if (invocation.state === "call") {
      // Pending - waiting for user confirmation
      proposals.push({
        toolCallId: invocation.toolCallId,
        proposal,
        status: "pending",
      });
    } else if (invocation.state === "result") {
      // User responded - check the result to determine status
      const result = invocation.result as {
        accepted?: boolean;
        created?: boolean;
        error?: string;
      } | null;

      if (result?.accepted === false) {
        proposals.push({
          toolCallId: invocation.toolCallId,
          proposal,
          status: "declined",
        });
      } else if (result?.created === true) {
        proposals.push({
          toolCallId: invocation.toolCallId,
          proposal,
          status: "accepted",
        });
      } else if (result?.error) {
        proposals.push({
          toolCallId: invocation.toolCallId,
          proposal,
          status: "error",
          errorMessage: result.error,
        });
      }
      // If result is malformed, we skip it (don't show the card)
    }
  }

  return proposals;
}

// Individual message item - memoized to prevent re-renders of unchanged messages
const MessageItem = memo(
  function MessageItem({
    message,
    isLastMessage,
    isStreaming,
    sources,
    showSources,
    onProposalAccept,
    onProposalDecline,
    proposalDisabled,
    proposalStatuses,
  }: {
    message: Message;
    isLastMessage: boolean;
    isStreaming: boolean;
    sources: SourceDocument[];
    showSources: boolean;
    onProposalAccept?: (toolCallId: string, proposal: NodeProposal) => void;
    onProposalDecline?: (toolCallId: string) => void;
    proposalDisabled?: boolean;
    proposalStatuses?: Record<string, ProposalStatusEntry>;
  }) {
    // Only pass sources to the last completed assistant message
    // This prevents unnecessary re-renders when sources change
    const effectiveSources =
      isLastMessage && !isStreaming && message.role === "assistant"
        ? sources
        : [];

    // Extract proposals with their statuses from tool invocations,
    // merging with external state for accepted/declined/error statuses
    const proposalsWithStatus = useMemo(
      () => extractProposalsWithStatus(message, proposalStatuses),
      [message, proposalStatuses],
    );

    // Check if this is an assistant message with only tool calls and no text content
    // In this case, we show the proposals without the empty message bubble
    const hasContent = message.content.trim().length > 0;
    const hasProposals = proposalsWithStatus.length > 0;

    // If it's an assistant message with no content but has proposals,
    // render only the proposal cards without the message bubble
    if (message.role === "assistant" && !hasContent && hasProposals) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 mr-8 duration-300">
          {/* Render node proposals without the message bubble wrapper */}
          {proposalsWithStatus.map(
            ({ toolCallId, proposal, status, errorMessage }) => (
              <NodeProposalCard
                key={toolCallId}
                proposal={proposal}
                status={status}
                errorMessage={errorMessage}
                onAccept={(p) => onProposalAccept?.(toolCallId, p)}
                onDecline={() => onProposalDecline?.(toolCallId)}
                disabled={proposalDisabled}
              />
            ),
          )}
        </div>
      );
    }

    return (
      <div
        className={cn(
          "animate-in fade-in slide-in-from-bottom-2 rounded-xl px-4 py-3 text-white duration-300",
          message.role === "user" ? "ml-8 bg-[#8BBC81]" : "mr-8 bg-[#4A728A]",
        )}
      >
        <div className="mb-1.5 text-xs font-semibold tracking-wide uppercase opacity-60">
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
          <UserMessage content={message.content} />
        ) : isStreaming ? (
          <StreamingMessage content={message.content} />
        ) : (
          <CompletedAssistantMessage
            content={message.content}
            sources={effectiveSources}
            showSources={showSources}
            isLastMessage={isLastMessage}
          />
        )}

        {/* Render node proposals with their current status */}
        {proposalsWithStatus.map(
          ({ toolCallId, proposal, status, errorMessage }) => (
            <NodeProposalCard
              key={toolCallId}
              proposal={proposal}
              status={status}
              errorMessage={errorMessage}
              onAccept={(p) => onProposalAccept?.(toolCallId, p)}
              onDecline={() => onProposalDecline?.(toolCallId)}
              disabled={proposalDisabled}
            />
          ),
        )}
      </div>
    );
  },
  // Custom comparison - only re-render if content or streaming state changes
  (prevProps, nextProps) => {
    // Always re-render if proposalStatuses changed for this message's proposals
    if (prevProps.proposalStatuses !== nextProps.proposalStatuses) {
      return false; // Re-render when proposal statuses change
    }

    // Always re-render if toolInvocations changed
    const prevInvocations = prevProps.message.toolInvocations;
    const nextInvocations = nextProps.message.toolInvocations;
    if (prevInvocations !== nextInvocations) {
      // Deep compare tool invocation states
      if (
        !prevInvocations ||
        !nextInvocations ||
        prevInvocations.length !== nextInvocations.length
      ) {
        return false;
      }
      for (let i = 0; i < prevInvocations.length; i++) {
        const prevState = prevInvocations[i]?.state;
        const nextState = nextInvocations[i]?.state;
        if (prevState !== nextState) {
          return false;
        }
      }
    }

    // For non-last messages, don't re-render when sources change
    if (!prevProps.isLastMessage && !nextProps.isLastMessage) {
      return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.content === nextProps.message.content &&
        prevProps.isStreaming === nextProps.isStreaming &&
        prevProps.proposalDisabled === nextProps.proposalDisabled
      );
    }

    // For last message, compare all props including sources length
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.isLastMessage === nextProps.isLastMessage &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.showSources === nextProps.showSources &&
      prevProps.sources.length === nextProps.sources.length &&
      prevProps.proposalDisabled === nextProps.proposalDisabled
    );
  },
);

interface MessageListProps {
  messages: Message[];
  sources: SourceDocument[];
  isLoading: boolean;
  statusMessage: string | null;
  error: Error | undefined;
  streamingMessageId: string | null;
  /** When true, sources are hidden until streaming completes */
  hideSourcesWhileStreaming?: boolean;
  /** Callback when user accepts a node proposal. toolCallId is needed for addToolOutput */
  onProposalAccept?: (toolCallId: string, proposal: NodeProposal) => void;
  /** Callback when user declines a node proposal. toolCallId is needed for addToolOutput */
  onProposalDecline?: (toolCallId: string) => void;
  /** Whether proposal buttons are disabled (e.g., during creation) */
  proposalDisabled?: boolean;
  /** External tracking of proposal statuses (accepted/declined/error) */
  proposalStatuses?: Record<string, ProposalStatusEntry>;
}

export const MessageList = memo(
  function MessageList({
    messages,
    sources,
    isLoading,
    statusMessage,
    error,
    streamingMessageId,
    hideSourcesWhileStreaming = true,
    onProposalAccept,
    onProposalDecline,
    proposalDisabled,
    proposalStatuses,
  }: MessageListProps) {
    // Only show sources when streaming is complete AND no pending proposals await user confirmation
    // This prevents sources from appearing while the user is still deciding on a proposed node
    const shouldShowSources = useMemo(() => {
      // If streaming is in progress, don't show sources
      if (hideSourcesWhileStreaming && (isLoading || streamingMessageId)) {
        return false;
      }
      // If there are pending proposeNode tool calls awaiting user confirmation, don't show sources
      if (hasPendingProposals(messages, proposalStatuses)) {
        return false;
      }
      return true;
    }, [
      hideSourcesWhileStreaming,
      isLoading,
      streamingMessageId,
      messages,
      proposalStatuses,
    ]);

    // Memoize streaming index calculation to prevent recalculation on every render
    const streamingIndex = useMemo(() => {
      if (!isLoading) return -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "assistant") {
          return i;
        }
      }
      return -1;
    }, [isLoading, messages]);

    // Memoize message count for consistent comparison
    const messageCount = messages.length;

    return (
      <div className="space-y-3 p-6">
        {messages.map((message, index) => (
          <MessageItem
            key={message.id}
            message={message}
            isLastMessage={index === messageCount - 1}
            isStreaming={index === streamingIndex}
            sources={sources}
            showSources={shouldShowSources}
            onProposalAccept={onProposalAccept}
            onProposalDecline={onProposalDecline}
            proposalDisabled={proposalDisabled}
            proposalStatuses={proposalStatuses}
          />
        ))}
        {(isLoading || statusMessage) &&
          !messages.some((m, i) => i === streamingIndex && m.content) && (
            <div className="mr-8 animate-pulse rounded-xl bg-gray-100 px-4 py-3 text-gray-900 dark:bg-white/5 dark:text-white/90">
              <div className="mb-1.5 text-xs font-semibold tracking-wide uppercase">
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
            <div className="mb-1.5 text-xs font-semibold tracking-wide uppercase">
              Error
            </div>
            <div className="text-xs">{error.message}</div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to avoid unnecessary re-renders
    // Only re-render when meaningful state changes
    return (
      prevProps.messages === nextProps.messages &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.statusMessage === nextProps.statusMessage &&
      prevProps.error === nextProps.error &&
      prevProps.streamingMessageId === nextProps.streamingMessageId &&
      prevProps.sources.length === nextProps.sources.length &&
      prevProps.proposalDisabled === nextProps.proposalDisabled &&
      prevProps.proposalStatuses === nextProps.proposalStatuses
    );
  },
);
