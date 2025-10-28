"use client";

import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatInput() {
  const [isLoading, setIsLoading] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, error } = useChat({
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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="space-y-4">
      {messages.length > 0 && (
        <div
          ref={chatContainerRef}
          className="max-h-[500px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#1D2740]/50 p-6"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`animate-in fade-in slide-in-from-bottom-2 rounded-xl px-5 py-4 duration-300 ${
                message.role === "user"
                  ? "ml-8 bg-[#76E54A]/10 text-[#76E54A]"
                  : "mr-8 bg-white/5 text-white/90"
              }`}
            >
              <div className="mb-2 text-xs font-semibold tracking-wide uppercase opacity-60">
                {message.role === "user" ? "You" : "AI Assistant"}
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-3 leading-relaxed last:mb-0">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-3 list-disc space-y-1 pl-5">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="mb-3 list-decimal space-y-1 pl-5">
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
                      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="my-3 overflow-x-auto rounded-lg bg-white/10 p-4">
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
            <div className="mr-8 animate-pulse rounded-xl bg-white/5 px-5 py-4 text-white/90">
              <div className="mb-2 text-xs font-semibold tracking-wide uppercase opacity-60">
                AI Assistant
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:-0.3s]"></span>
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:-0.15s]"></span>
                <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white/60"></span>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-500/10 px-5 py-4 text-red-400">
              <div className="mb-2 text-xs font-semibold tracking-wide uppercase">
                Error
              </div>
              <div className="text-sm">{error.message}</div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <Input
          type="text"
          placeholder="Ask about this step in your journey..."
          disabled={isLoading}
          value={input}
          onChange={handleInputChange}
          className="h-auto rounded-2xl border-white/10 bg-white px-6 py-4 pr-14 text-base text-[#1D2740] placeholder:text-[#1D2740]/40 focus-visible:ring-2 focus-visible:ring-[#76E54A]/50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-2 transition-all hover:bg-[#0E3087]/10 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Send message"
        >
          <svg
            width="25"
            height="22"
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
      </form>
    </div>
  );
}
