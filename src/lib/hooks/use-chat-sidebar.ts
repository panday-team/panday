/**
 * useChatSidebar Hook
 * Manages chat sidebar state, responsive behavior, and localStorage persistence
 */

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

export interface UseChatSidebarReturn {
  /** Whether the sidebar/drawer is open */
  isOpen: boolean;
  /** Whether sidebar is collapsed (desktop only) */
  isCollapsed: boolean;
  /** Whether viewing on desktop (>= 1024px) */
  isDesktop: boolean;
  /** Whether history drawer is open (mobile only) */
  isHistoryDrawerOpen: boolean;
  /** Toggle sidebar/drawer open/closed */
  toggle: () => void;
  /** Set sidebar/drawer open state */
  setIsOpen: (open: boolean) => void;
  /** Toggle sidebar collapsed state (desktop only) */
  toggleCollapsed: () => void;
  /** Toggle history drawer (mobile only) */
  toggleHistoryDrawer: () => void;
}

const STORAGE_KEY = "chat-sidebar-collapsed";

export function useChatSidebar(): UseChatSidebarReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Detect desktop viewport
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Load collapsed state from localStorage (desktop only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setIsCollapsed(stored === "true");
      }
    } catch (error) {
      // Ignore localStorage errors (can happen in private browsing, etc.)
      logger.warn("Failed to load sidebar state", { error });
    }
  }, []);

  // Persist collapsed state to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    } catch (error) {
      // Ignore localStorage errors (can happen in private browsing, etc.)
      logger.warn("Failed to save sidebar state", { error });
    }
  }, [isCollapsed]);

  const toggle = () => setIsOpen((prev) => !prev);
  const toggleCollapsed = () => setIsCollapsed((prev) => !prev);
  const toggleHistoryDrawer = () => setIsHistoryDrawerOpen((prev) => !prev);

  return {
    isOpen,
    isCollapsed,
    isDesktop,
    isHistoryDrawerOpen,
    toggle,
    setIsOpen,
    toggleCollapsed,
    toggleHistoryDrawer,
  };
}
