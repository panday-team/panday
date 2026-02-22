import { APP_CONFIG } from "@/config/app-config";

type RateLimitResult = {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
  pending?: Promise<unknown>;
};

type InMemoryRateLimiter = {
  limit: (identifier: string) => Promise<RateLimitResult>;
};

type CreateRateLimiterOptions = {
  requests: number;
  windowMs: number;
  prefix: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const SWEEP_INTERVAL = 100;

export const createInMemoryRateLimiter = ({
  requests,
  windowMs,
  prefix,
}: CreateRateLimiterOptions): InMemoryRateLimiter => {
  const buckets = new Map<string, RateLimitBucket>();
  let callCountSinceSweep = 0;

  const sweepExpiredBuckets = (now: number) => {
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  };

  return {
    limit: async (identifier: string) => {
      const now = Date.now();
      const bucketKey = `${prefix}:${identifier}`;

      callCountSinceSweep += 1;
      if (callCountSinceSweep >= SWEEP_INTERVAL) {
        sweepExpiredBuckets(now);
        callCountSinceSweep = 0;
      }

      const existingBucket = buckets.get(bucketKey);
      const bucket =
        !existingBucket || existingBucket.resetAt <= now
          ? { count: 0, resetAt: now + windowMs }
          : existingBucket;

      if (bucket.count >= requests) {
        return {
          success: false,
          limit: requests,
          reset: bucket.resetAt,
          remaining: 0,
        };
      }

      bucket.count += 1;
      buckets.set(bucketKey, bucket);

      return {
        success: true,
        limit: requests,
        reset: bucket.resetAt,
        remaining: Math.max(requests - bucket.count, 0),
      };
    },
  };
};

/**
 * Rate limiter for chat API endpoint
 * Configurable via CHAT_RATE_LIMIT_RPM environment variable (default: 30 requests/minute)
 */
export const chatRateLimit = createInMemoryRateLimiter({
  requests: APP_CONFIG.chat.rateLimit.requestsPerMinute,
  windowMs: 60_000,
  prefix: "chat",
});

/**
 * Rate limiter for voice transcription API endpoint
 * Configurable via VOICE_RATE_LIMIT_RPM environment variable (default: 5 requests/minute)
 * Lower limit than chat because:
 * - Voice transcription is more expensive (Whisper API costs)
 * - Each request may trigger translation (additional API call)
 * - Prevents accidental quota exhaustion from repeated recordings
 */
export const voiceRateLimit = createInMemoryRateLimiter({
  requests: APP_CONFIG.voice.rateLimit.requestsPerMinute,
  windowMs: 60_000,
  prefix: "voice",
});
