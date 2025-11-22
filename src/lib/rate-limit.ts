import { Ratelimit } from "@upstash/ratelimit";
import type { Redis as UpstashRedis } from "@upstash/redis";
import redis from "@/server/database/redisClient";
import { env } from "@/env";
import { APP_CONFIG } from "@/config/app-config";

/**
 * Rate limiter for chat API endpoint
 * Configurable via CHAT_RATE_LIMIT_RPM environment variable (default: 30 requests/minute)
 */
export const chatRateLimit = new Ratelimit({
  redis: redis as unknown as UpstashRedis,
  limiter: Ratelimit.slidingWindow(
    APP_CONFIG.chat.rateLimit.requestsPerMinute,
    APP_CONFIG.chat.rateLimit.window,
  ),
  analytics: env.PRODUCTION,
  prefix: "@upstash/ratelimit/chat",
});

/**
 * Rate limiter for voice transcription API endpoint
 * Configurable via VOICE_RATE_LIMIT_RPM environment variable (default: 5 requests/minute)
 * Lower limit than chat because:
 * - Voice transcription is more expensive (Whisper API costs)
 * - Each request may trigger translation (additional API call)
 * - Prevents accidental quota exhaustion from repeated recordings
 */
export const voiceRateLimit = new Ratelimit({
  redis: redis as unknown as UpstashRedis,
  limiter: Ratelimit.slidingWindow(
    APP_CONFIG.voice.rateLimit.requestsPerMinute,
    APP_CONFIG.voice.rateLimit.window,
  ),
  analytics: env.PRODUCTION,
  prefix: "@upstash/ratelimit/voice",
});
