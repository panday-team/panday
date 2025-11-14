import { Ratelimit } from "@upstash/ratelimit";
import type { Redis as UpstashRedis } from "@upstash/redis";
import redis from "@/server/database/redisClient";
import { env } from "@/env";

export const chatRateLimit = new Ratelimit({
  redis: redis as unknown as UpstashRedis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: env.PRODUCTION,
  prefix: "@upstash/ratelimit/chat",
});
