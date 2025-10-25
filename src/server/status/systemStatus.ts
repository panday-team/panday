import { env } from "@/env";
import { logger } from "@/lib/logger";
import redis from "@/server/database/redisClient";
import { db, databaseConnectionConfig } from "@/server/db";

type ServiceState = "ok" | "warn" | "error";

export type ServiceStatus = {
  name: string;
  state: ServiceState;
  detail: string;
  latencyMs?: number;
  target?: string;
  error?: string;
};

export type EnvironmentStatus = {
  deploymentTarget: "production" | "development";
  nodeEnv: string;
  databaseHost?: string;
  databaseName?: string;
  redisProvider: string;
};

export type SystemStatus = {
  environment: EnvironmentStatus;
  services: ServiceStatus[];
};

const formatLatency = (latencyMs: number) => Math.round(latencyMs);

const summarizeDatabaseUrl = (rawUrl?: string) => {
  if (!rawUrl) {
    return { host: undefined, name: undefined };
  }

  try {
    const url = new URL(rawUrl);
    const name = url.pathname.replace(/^\//, "") || undefined;
    return {
      host: url.host,
      name,
    };
  } catch (error) {
    logger.error("Unable to parse database connection string", error);
    return { host: undefined, name: undefined };
  }
};

export const getSystemStatus = async (): Promise<SystemStatus> => {
  const services: ServiceStatus[] = [];

  const databaseSummary = summarizeDatabaseUrl(
    databaseConnectionConfig.resolvedDatabaseUrl,
  );

  try {
    const start = Date.now();
    await db.$queryRawUnsafe("SELECT 1");
    const latencyMs = formatLatency(Date.now() - start);

    services.push({
      name: "Database",
      state: "ok",
      detail: `Connected to ${databaseConnectionConfig.mode} database at ${databaseSummary.host ?? "unknown host"}`,
      latencyMs,
      target: databaseConnectionConfig.mode,
    });
  } catch (error) {
    logger.error("Database health check failed", error, {
      mode: databaseConnectionConfig.mode,
      host: databaseSummary.host,
    });
    services.push({
      name: "Database",
      state: "error",
      detail: "Database connection failed",
      target: databaseConnectionConfig.mode,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const redisProvider = env.PRODUCTION ? "Upstash" : "Local Redis";

  try {
    const start = Date.now();
    const response = await (redis as { ping: () => Promise<string> }).ping();
    const latencyMs = formatLatency(Date.now() - start);

    services.push({
      name: "Redis",
      state: "ok",
      detail: `${redisProvider} responded with ${response}`,
      latencyMs,
      target: redisProvider,
    });
  } catch (error) {
    logger.error("Redis health check failed", error, {
      provider: redisProvider,
    });
    services.push({
      name: "Redis",
      state: "error",
      detail: `${redisProvider} ping failed`,
      target: redisProvider,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const clerkConfigured = Boolean(
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY,
  );
  services.push({
    name: "Clerk",
    state: clerkConfigured ? "ok" : "warn",
    detail: clerkConfigured
      ? "Clerk keys loaded"
      : "Clerk environment variables missing",
  });

  const openaiConfigured = Boolean(env.OPENAI_API_KEY);
  services.push({
    name: "OpenAI Embeddings",
    state: openaiConfigured ? "ok" : "error",
    detail: openaiConfigured
      ? "OpenAI API key configured"
      : "OPENAI_API_KEY missing",
  });

  return {
    environment: {
      deploymentTarget: databaseConnectionConfig.mode,
      nodeEnv: env.NODE_ENV,
      databaseHost: databaseSummary.host,
      databaseName: databaseSummary.name,
      redisProvider,
    },
    services,
  };
};
