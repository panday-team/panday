import { Redis as UpstashRedis } from "@upstash/redis";
import "dotenv/config";
import { createClient } from "redis";

import { env } from "@/env";

const createLocalRedisClient = () => {
  const client = createClient({ url: env.REDIS_URL });

  client.on("error", (err) => {
    console.error("Redis client error", err);
  });

  client
    .connect()
    .catch((err) => console.error("Unable to connect to Redis", err));

  return client;
};

const redis = env.PRODUCTION
  ? new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : createLocalRedisClient();

export default redis;
