/**
 * useChatScroll Hook
 * Manages auto-scrolling behavior and scroll-to-bottom button visibility
 */

import { useState, useEffect, useCallback, type RefObject } from "react";

export interface UseChatScrollReturn {
  /** Whether to show the scroll-to-bottom button */
  showScrollButton: boolean;
  /** Scroll to bottom of messages container */
  scrollToBottom: () => void;
}

export function useChatScroll(
  messagesEndRef: RefObject<HTMLDivElement>,
  messagesContainerRef: RefObject<HTMLDivElement>,
): UseChatScrollReturn {
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesEndRef]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Show button if user has scrolled up more than 200px from bottom
      setShowScrollButton(distanceFromBottom > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messagesContainerRef]);

  // Handle window resize for responsive scrolling
  useEffect(() => {
    const handleResize = () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Maintain scroll button visibility on resize
      setShowScrollButton(distanceFromBottom > 200);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [messagesContainerRef]);

  return {
    showScrollButton,
    scrollToBottom,
  };
}
