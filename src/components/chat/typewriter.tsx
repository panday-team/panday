"use client";

import { useState, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TypewriterProps {
  content: string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const Typewriter = memo(function Typewriter({
  content,
  scrollContainerRef,
}: TypewriterProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent((prev) => prev + content[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        }
      }, 5); // Adjust typing speed here

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, content, scrollContainerRef]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 text-xs leading-relaxed last:mb-0">{children}</p>
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
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900 dark:text-white">
            {children}
          </strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
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
      {displayedContent}
    </ReactMarkdown>
  );
});

export default Typewriter;
