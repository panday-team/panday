import { Fragment, useMemo } from "react";
import type { Message } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { SourceDocument } from "@/lib/embeddings-service";
import ChatLoading from "./chat-loading";
import Typewriter from "./typewriter";
import { SourcesDisplay } from "./sources-display";
import { createCitationTextRenderer } from "./inline-citation-renderer";

interface MessageListProps {
  messages: Message[];
  sources: SourceDocument[];
  isLoading: boolean;
  statusMessage: string | null;
  error: Error | undefined;
  streamingMessageId: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  sources,
  isLoading,
  statusMessage,
  error,
  streamingMessageId,
  containerRef,
}: MessageListProps) {
  // Create the citation text renderer once, memoized based on sources
  const CitationText = useMemo(
    () => createCitationTextRenderer(sources),
    [sources],
  );

  return (
    <div className="space-y-3 p-6">
      {messages.map((message) => (
        <div
          key={message.id}
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
                em: ({ children }) => <em className="italic">{children}</em>,
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
            <Typewriter
              content={message.content}
              scrollContainerRef={containerRef}
            />
          ) : (
            <Fragment>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Use custom text renderer for inline citations
                    text: CitationText,
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
}
