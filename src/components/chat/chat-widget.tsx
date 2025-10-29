"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

interface ChatWidgetProps {
  selectedNodeId?: string | null;
}

const STORAGE_KEY = "panday_chat_messages";

export function ChatWidget({ selectedNodeId }: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

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
    },
    onResponse: (response) => {
      console.log("Chat response received:", response.status);
      setIsLoading(true);
    },
    onFinish: (message) => {
      console.log("Message finished:", message);
      setIsLoading(false);
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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-3">
      {isExpanded && (
<<<<<<< HEAD
        <div className="flex max-h-[70vh] w-96 flex-col rounded-2xl border border-gray-200 bg-white shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur dark:border-white/10 dark:bg-[#98B3F9]/95">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/10">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Assistant
            </h3>
=======
        <div className="flex max-h-[70vh] w-96 flex-col rounded-2xl border border-white/10 bg-[#98B3F9]/95 shadow-[0_40px_160px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 className="font-semibold text-white">Assistant</h3>
>>>>>>> c764eb7 (add: profile picture for ai chat)
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="rounded px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Clear chat history"
                >
                  Clear chat
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Collapse chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {messages.length > 0 ? (
              <div className="space-y-3 p-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`animate-in fade-in slide-in-from-bottom-2 rounded-xl px-4 py-3 duration-300 ${
                      message.role === "user"
                        ? "ml-8 bg-[#76E54A]/20 text-[#76E54A] dark:bg-[#76E54A]/10"
                        : "mr-8 bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-white/90"
                    }`}
                  >
                    <div className="mb-1.5 text-xs font-semibold tracking-wide uppercase opacity-60">
                      {message.role === "user" ? (
                        "You"
                      ) : (
                        <span className="inline-flex items-center gap-2 normal-case">
                          <Image
                            src="/ai-profile-pic.svg"
                            alt="Panday"
                            className="opacity-80"
                            width={50}
                            height={50}
                          />
                          <span className="sr-only">AI</span>
                        </span>
                      )}
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
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
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="mr-8 animate-pulse rounded-xl bg-gray-100 px-4 py-3 text-gray-900 dark:bg-white/5 dark:text-white/90">
                    <div className="mb-1.5 text-xs font-semibold tracking-wide uppercase opacity-60">
                      AI
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:-0.3s] dark:bg-white/60"></span>
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 [animation-delay:-0.15s] dark:bg-white/60"></span>
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600 dark:bg-white/60"></span>
                    </div>
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
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-center text-sm text-gray-500 dark:text-white/50">
                  Start a conversation about your roadmap journey
                </p>
              </div>
            )}
            <div ref={chatContainerRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-200 p-4 dark:border-white/10"
          >
            <div className="relative flex items-center gap-2">
              <Input
                type="text"
                placeholder="Ask something..."
                disabled={isLoading}
                value={input}
                onChange={handleInputChange}
                className="h-10 rounded-lg border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-[#76E54A]/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-lg p-2 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10"
                aria-label="Send message"
              >
                <svg
                  width="20"
                  height="18"
                  viewBox="0 0 25 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <ellipse cx="12.5" cy="11" rx="12.5" ry="11" fill="#0E3087" />
                  <path
                    d="M8.14857 7.68333L12.44 9.47222L8.14286 8.91667L8.14857 7.68333ZM12.4343 12.5278L8.14286 14.3167V13.0833L12.4343 12.5278ZM7.00571 6L7 9.88889L15.5714 11L7 12.1111L7.00571 16L19 11L7.00571 6Z"
                    fill="#F1A660"
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
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={``}
        aria-label={isExpanded ? "Collapse chat" : "Open chat"}
      >
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> c764eb7 (add: profile picture for ai chat)
        <Image
          src="/ai-chat-button.svg"
          alt="AI chat"
          className="cursor-grab"
          width={250}
          height={250}
        />
<<<<<<< HEAD
=======
        <img src="/ai-chat-button.svg" alt="AI chat" className="cursor-grab" />
>>>>>>> 34e10ea (refactor: using logo for chat button and moved to left side)
=======
>>>>>>> c764eb7 (add: profile picture for ai chat)
      </button>
    </div>
  );
}
