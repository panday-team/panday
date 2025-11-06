"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { ChatButton } from "./chat-button";
import ChatLoading from "./chat-loading";
import Typewriter from "./typewriter";

interface ChatWidgetProps {
  selectedNodeId?: string | null;
}

const STORAGE_KEY = "panday_chat_messages";

export function ChatWidget({ selectedNodeId }: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    setMessages,
  } = useChat({
    api: "/api/chat",
    streamProtocol: "data",
    onError: (error) => {
      console.error("Chat error:", error);
      setIsLoading(false);
      setStatusMessage(null);
    },
    onResponse: (response) => {
      console.log("Chat response received:", response.status);
      setIsLoading(true);
      setStatusMessage(null); // Clear status once response starts
    },
    onFinish: (message) => {
      console.log("Message finished:", message);
      setIsLoading(false);
      setStatusMessage(null);
    },
    body: {
      roadmap_id: selectedNodeId,
    },
    // Handle custom data from the stream
    fetch: async (url, options) => {
      const response = await fetch(url, options);

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Create a new stream that processes our custom events
      const customStream = new ReadableStream({
        start(controller) {
          let buffer = "";

          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);

                  try {
                    const parsed: unknown = JSON.parse(data);

                    // Handle our custom status updates
                    if (
                      typeof parsed === "object" &&
                      parsed !== null &&
                      "type" in parsed &&
                      parsed.type === "status" &&
                      "message" in parsed &&
                      typeof parsed.message === "string"
                    ) {
                      setStatusMessage(parsed.message);
                      continue; // Don't pass to AI SDK
                    }

                    if (
                      typeof parsed === "object" &&
                      parsed !== null &&
                      "type" in parsed &&
                      parsed.type === "metadata"
                    ) {
                      // Handle metadata (sources, roadmap_id) if needed
                      console.log("Received metadata:", parsed);
                      continue; // Don't pass to AI SDK
                    }

                    if (
                      typeof parsed === "object" &&
                      parsed !== null &&
                      "type" in parsed &&
                      parsed.type === "error" &&
                      "message" in parsed &&
                      typeof parsed.message === "string"
                    ) {
                      console.error("Stream error:", parsed.message);
                      setStatusMessage(null);
                      setIsLoading(false);
                      continue; // Don't pass to AI SDK
                    }
                  } catch (e) {
                    // If it's not JSON, it's probably AI SDK data
                    // Fall through to pass it along
                  }
                }

                // Pass through other data to AI SDK
                controller.enqueue(new TextEncoder().encode(line + "\n"));
              }

              return pump();
            });
          }

          return pump();
        },
      });

      // Return a new response with our processed stream
      return new Response(customStream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    },
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setMessages(parsed as Parameters<typeof setMessages>[0]);
        }
      } catch (e) {
        console.error("Failed to restore chat history:", e);
      }
    }
    setIsHydrated(true);
  }, [setMessages]);

  useEffect(() => {
    if (isHydrated && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isHydrated]);

  useEffect(() => {
    if (!isExpanded) didMountRef.current = false;
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const behavior: ScrollBehavior = didMountRef.current ? "smooth" : "auto";
    endRef.current?.scrollIntoView({ behavior, block: "end" });
    didMountRef.current = true;
  }, [messages, isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isExpanded]);

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Prevent optimistic loading for empty/whitespace-only messages
    if (!input.trim()) {
      e.preventDefault();
      return;
    }
    // Optimistically show loading immediately upon submit
    setIsLoading(true);
    setStatusMessage("Processing request...");
    handleSubmit(e);
  };

  return (
    <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-3">
      {isExpanded && (
        <div className="flex max-h-[70vh] w-96 flex-col rounded-2xl border border-gray-200 bg-white shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur dark:border-white/10 dark:bg-[#98B3F9]/95">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Assistant
            </h3>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="rounded px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Clear chat history"
                >
                  Clear chat
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="rounded p-1.5 text-black transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Collapse chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 overflow-y-auto">
            {messages.length > 0 ? (
              <div className="space-y-3 p-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`animate-in fade-in slide-in-from-bottom-2 rounded-xl px-4 py-3 duration-300 ${
                      message.role === "user"
                        ? "ml-8 bg-[#8BBC81] text-white"
                        : "mr-8 bg-[#4A728A] text-white/90"
                    }`}
                  >
                    <div className="mb-1.5 text-xs font-semibold tracking-wide uppercase opacity-60">
                      {message.role === "user" ? (
                        "You"
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-2 normal-case">
                            <span className="sr-only">AI</span>
                          </span>
                          <Image
                            src="/ai-profile-pic.svg"
                            alt="Panday"
                            className="opacity-80"
                            width={50}
                            height={50}
                          />
                        </>
                      )}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
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
                              <strong className="font-semibold text-gray-900 dark:text-white">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic">{children}</em>
                            ),
                            code: ({ children }) => (
                              <code className="rounded bg-gray-200 px-1 py-0.5 font-mono text-xs dark:bg-white/10">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="my-2 overflow-x-auto rounded-lg bg-gray-200 p-2 text-xs dark:bg-white/10">
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
                      ) : (
                        <Typewriter
                          content={message.content}
                          scrollContainerRef={containerRef}
                        />
                      )}
                    </div>
                  </div>
                ))}
                {(isLoading || statusMessage) && (
                  <div className="mr-8 animate-pulse rounded-xl bg-gray-100 px-4 py-3 text-gray-900 dark:bg-white/5 dark:text-white/90">
                    <div className="mb-1.5 text-xs font-semibold tracking-wide uppercase opacity-60">
                      AI <ChatLoading />
                    </div>
                    {statusMessage ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"></div>
                        <span className="text-xs text-gray-600 dark:text-white/70">
                          {statusMessage}
                        </span>
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
                <div ref={endRef} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-center text-sm text-black">
                  Start a conversation about your roadmap journey
                </p>
              </div>
            )}
            <div ref={chatContainerRef} />
          </div>

          <form
            onSubmit={onSubmit}
            className="border-t border-gray-200 p-4 dark:border-white/10"
          >
            <div className="relative flex items-center gap-2">
              <div
                id="input-container"
                className="flex w-full flex-row rounded-3xl bg-white"
              >
                <Input
                  type="text"
                  placeholder="Write your message"
                  disabled={isLoading}
                  value={input}
                  onChange={handleInputChange}
                  className="h-10 rounded-3xl border-white/10 bg-white text-sm text-black placeholder:font-extrabold placeholder:text-black/40 focus-visible:ring-0"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="rounded-lg p-2 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
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
                      fill="#3369FF"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {selectedNodeId && (
              <p className="mt-2 text-xs text-gray-500 dark:text-white/50">
                Asking about the current step
              </p>
            )}
          </form>
        </div>
      )}
      <ChatButton
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      />
    </div>
  );
}
