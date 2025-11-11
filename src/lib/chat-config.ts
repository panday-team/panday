/**
 * Chat widget and API configuration constants
 * Centralized configuration for maintainability and consistency
 */

export const CHAT_CONFIG = {
  /**
   * Minimum relevance score (0-1) for displaying source citations
   * Sources below this threshold are filtered out to reduce noise
   */
  RELEVANCE_THRESHOLD: 0.7,

  /**
   * Scroll distance in pixels from bottom before showing scroll-to-bottom button
   * Lower values = button appears sooner when user scrolls up
   */
  SCROLL_THRESHOLD_PX: 100,

  /**
   * Maximum number of messages to keep in localStorage
   * Prevents unlimited growth and quota errors
   */
  MAX_CACHED_MESSAGES: 50,

  /**
   * Maximum size in bytes for localStorage chat history (1MB)
   * Prevents QuotaExceededError on long conversations
   */
  MAX_STORAGE_SIZE_BYTES: 1024 * 1024,

  /**
   * Number of messages to keep after localStorage quota error
   * Used as fallback when storage is full
   */
  FALLBACK_MESSAGE_COUNT: 10,

  /**
   * localStorage key for persisting chat messages
   */
  STORAGE_KEY: "panday_chat_messages",
} as const;
