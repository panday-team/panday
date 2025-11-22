/**
 * Centralized application configuration
 *
 * This file consolidates all configuration values across the application,
 * making them easier to manage and override via environment variables.
 */

/**
 * Parse environment variable as integer with fallback
 */
function parseIntEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const APP_CONFIG = {
  /**
   * Chat & Session Configuration
   */
  chat: {
    // Session idle timeout before marking as ended (milliseconds)
    sessionIdleTimeout: parseIntEnv("CHAT_SESSION_TIMEOUT_MS", 30 * 60 * 1000), // 30 minutes

    // Maximum messages stored per chat session
    maxMessagesPerSession: parseIntEnv("CHAT_MAX_MESSAGES", 30),

    // Rate limiting
    rateLimit: {
      // Requests per minute for chat endpoint
      requestsPerMinute: parseIntEnv("CHAT_RATE_LIMIT_RPM", 30),

      // Time window for rate limiting
      window: "1 m" as const,
    },
  },

  /**
   * Voice Transcription Configuration
   */
  voice: {
    // Rate limiting (stricter than chat due to higher API costs)
    rateLimit: {
      // Requests per minute for voice transcription
      requestsPerMinute: parseIntEnv("VOICE_RATE_LIMIT_RPM", 5),

      // Time window for rate limiting
      window: "1 m" as const,
    },
  },

  /**
   * Embeddings & RAG Configuration
   */
  embeddings: {
    // Cache TTL for embeddings queries (milliseconds)
    cacheTtl: parseIntEnv("EMBEDDINGS_CACHE_TTL_MS", 5 * 60 * 1000), // 5 minutes

    // Index cache TTL for file-based embeddings (milliseconds)
    indexCacheTtl: parseIntEnv("EMBEDDINGS_INDEX_CACHE_TTL_MS", 60 * 60 * 1000), // 1 hour

    // Default roadmap ID for embeddings queries
    defaultRoadmapId: process.env.DEFAULT_ROADMAP_ID ?? "electrician-bc",

    // Default number of results to return
    defaultTopK: parseIntEnv("EMBEDDINGS_DEFAULT_TOP_K", 5),
  },

  /**
   * Cache Configuration
   */
  cache: {
    // Roadmap cache TTL (Infinity = never expires, cleared on restart)
    roadmapTtl: Infinity,

    // Maximum number of roadmaps to cache in memory
    roadmapMaxSize: parseIntEnv("ROADMAP_CACHE_MAX_SIZE", 10),
  },

  /**
   * FAQ Cron Jobs Configuration
   */
  cron: {
    // Maximum chat sessions to process per extract-qas run
    maxSessionsPerRun: parseIntEnv("CRON_MAX_SESSIONS", 5),

    // Maximum QA pairs to process per cluster-qas run
    maxQaPairsPerRun: parseIntEnv("CRON_MAX_QA_PAIRS", 25),

    // Maximum clusters to process per generate-faqs run
    maxClustersPerRun: parseIntEnv("CRON_MAX_CLUSTERS", 10),
  },

  /**
   * API Response Caching
   */
  apiCache: {
    // FAQ endpoint cache headers
    faq: {
      // Browser cache duration (seconds)
      maxAge: parseIntEnv("FAQ_CACHE_MAX_AGE", 300), // 5 minutes

      // CDN cache duration (seconds)
      sMaxAge: parseIntEnv("FAQ_CACHE_S_MAX_AGE", 600), // 10 minutes

      // Stale-while-revalidate duration (seconds)
      staleWhileRevalidate: parseIntEnv("FAQ_CACHE_SWR", 3600), // 1 hour
    },
  },

  /**
   * Physics & Positioning Configuration
   */
  physics: {
    // Minimum distance between custom nodes and other nodes
    minDistance: parseIntEnv("PHYSICS_MIN_DISTANCE", 280),

    // Minimum distance for repulsion force
    minRepulsionDistance: parseIntEnv("PHYSICS_MIN_REPULSION_DISTANCE", 200),

    // Maximum collision resolution iterations
    maxCollisionIterations: parseIntEnv("PHYSICS_MAX_ITERATIONS", 50),
  },
} as const;

/**
 * Type-safe config access
 */
export type AppConfig = typeof APP_CONFIG;
