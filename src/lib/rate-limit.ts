import { Ratelimit } from "@upstash/ratelimit";
import type { Redis as UpstashRedis } from "@upstash/redis";
import redis from "@/server/database/redisClient";
import { env } from "@/env";

/**
 * Rate limiter for chat API endpoint
 * Allows 30 requests per minute per user
 */
export const chatRateLimit = new Ratelimit({
  redis: redis as unknown as UpstashRedis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: env.PRODUCTION,
  prefix: "@upstash/ratelimit/chat",
});

/**
 * Rate limiter for voice transcription API endpoint
 * Allows 5 requests per minute per user
 * Lower limit than chat because:
 * - Voice transcription is more expensive (Whisper API costs)
 * - Each request may trigger translation (additional API call)
 * - Prevents accidental quota exhaustion from repeated recordings
 */
export const voiceRateLimit = new Ratelimit({
  redis: redis as unknown as UpstashRedis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: env.PRODUCTION,
  prefix: "@upstash/ratelimit/voice",
});
