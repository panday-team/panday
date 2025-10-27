import { Ratelimit } from "@upstash/ratelimit";
import type { Redis as UpstashRedis } from "@upstash/redis";
import redis from "@/server/database/redisClient";
import { env } from "@/env";

export const chatRateLimit = new Ratelimit({
  redis: redis as unknown as UpstashRedis,
  // Using cookie-based user identification for rate limiting
  // TODO: After adding Clerk auth, switch to authenticated user ID instead of cookie-based
  // TODO: Consider lowering limit (e.g., 50-100 per min) when authenticated users are identified
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: env.PRODUCTION,
  prefix: "@upstash/ratelimit/chat",
});
