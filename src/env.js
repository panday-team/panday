import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url().optional(),
    DATABASE_URL_UNPOOLED: z.string().url().optional(),
    LOCAL_DATABASE_URL: z.string().url().optional(),
    POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    CLERK_SECRET_KEY: z.string(),
    PRODUCTION: z.coerce.boolean().default(false),
    REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_PORT: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .default(8079),
    AI_PROVIDER: z.enum(["anthropic", "openai", "google"]).default("anthropic"),
    AI_MODEL: z.string().default("claude-3-5-sonnet-20241022"),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string(),
    GOOGLE_API_KEY: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // Validation for Clerk publishable key is required for proper authentication setup.
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    LOCAL_DATABASE_URL: process.env.LOCAL_DATABASE_URL,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
    PRODUCTION: process.env.PRODUCTION,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_PORT: process.env.UPSTASH_REDIS_REST_PORT,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

if (env.PRODUCTION && !env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set when PRODUCTION is true");
}

if (
  env.PRODUCTION &&
  (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
) {
  throw new Error(
    "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set when PRODUCTION is true",
  );
}

if (env.PRODUCTION && !env.DATABASE_URL_UNPOOLED) {
  throw new Error("DATABASE_URL_UNPOOLED must be set when PRODUCTION is true");
}

// if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
//   throw new Error("ANTHROPIC_API_KEY must be set when AI_PROVIDER is 'anthropic'");
// }
//
// if (env.AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) {
//   throw new Error("OPENAI_API_KEY must be set when AI_PROVIDER is 'openai'");
// }
//
if (env.AI_PROVIDER === "google" && !env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY must be set when AI_PROVIDER is 'google'");
}
