"use client";

import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";

export default function ChatInput() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({ api: "http://localhost:3000/api/chat" });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      <div
        id="chat-container"
        ref={chatContainerRef}
        className={
          !messages.length
            ? ""
            : "animate-in fade-in zoom-in-95 slide-in-from-top-4 flex max-h-96 flex-col overflow-y-auto rounded-md bg-white p-3 text-gray-900 duration-500 dark:bg-gray-800 dark:text-white"
        }
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-800"
          >
            <strong>{message.role === "user" ? "You: " : "AI"}</strong>
            {message.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="rounded-md bg-white dark:bg-gray-800">
          <div>
            <Input
              type="text"
              placeholder="Chat with AI!"
              disabled={isLoading}
              value={input}
              onChange={handleInputChange}
              className="p-8 text-gray-900 focus-visible:ring-0 dark:text-white"
            />
          </div>
          <div className="flex justify-end">
            <button className="p-2" type="submit">
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
          </div>
        </div>
      </form>
    </>
  );
}
