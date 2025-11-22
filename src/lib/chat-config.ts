/**
 * Chat widget and API configuration constants
 * Centralized configuration for maintainability and consistency
 */

export const CHAT_CONFIG = {
  /**
   * Minimum relevance score (0-1) for displaying source citations
   * Sources below this threshold are filtered out to reduce noise
   * Set to 0.5 (50%) to show moderately relevant sources - helps users
   * understand what context informed the AI response
   */
  RELEVANCE_THRESHOLD: 0.5,

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

/**
 * Voice input configuration constants
 * Settings for audio recording, transcription, and translation
 */
export const VOICE_CONFIG = {
  /**
   * OpenAI Whisper model for audio transcription
   * Options: "whisper-1" (standard, ~$0.006/min)
   * Note: Currently only whisper-1 is available, but configurable for future models
   */
  WHISPER_MODEL: "whisper-1" as const,

  /**
   * Model for translating non-English transcripts to English
   * Using gpt-4o-mini for cost-effective translation (~$0.15/1M input tokens)
   * Note: Whisper's built-in translation endpoint is used instead of chat completions
   */
  TRANSLATION_MODEL: "gpt-4o-mini" as const,

  /**
   * Maximum audio file size in bytes (25MB)
   * Matches OpenAI Whisper API limit
   */
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024,

  /**
   * Maximum recording duration in milliseconds (2 minutes)
   * Prevents excessively long recordings and API timeouts
   */
  MAX_RECORDING_DURATION_MS: 2 * 60 * 1000,

  /**
   * Minimum audio blob size in bytes (1KB)
   * Recordings smaller than this are considered too short
   */
  MIN_BLOB_SIZE_BYTES: 1000,

  /**
   * Timeout for OpenAI API calls in milliseconds (30 seconds)
   * Prevents hanging on long-running transcription/translation
   */
  API_TIMEOUT_MS: 30000,

  /**
   * Audio encoding bitrate for MediaRecorder (128kbps)
   * Balance between quality and file size
   */
  AUDIO_BITRATE: 128000,

  /**
   * Preferred MIME types for audio recording (in order of preference)
   * Falls back to first supported type
   */
  MIME_TYPES: ["audio/webm", "audio/ogg", "audio/wav"] as const,
} as const;
