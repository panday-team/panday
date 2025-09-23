import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

const dockerLocalDatabaseUrl = `postgresql://devuser:devpassword@localhost:${env.POSTGRES_PORT}/devdb`;
const localDatabaseUrl = env.LOCAL_DATABASE_URL ?? dockerLocalDatabaseUrl;
const resolvedDatabaseUrl = env.PRODUCTION ? env.DATABASE_URL! : localDatabaseUrl;
const resolvedDirectUrl = env.PRODUCTION
  ? env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL!
  : localDatabaseUrl;

process.env.DATABASE_URL = resolvedDatabaseUrl;

if (resolvedDirectUrl) {
  process.env.DATABASE_URL_UNPOOLED = resolvedDirectUrl;
}

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: resolvedDatabaseUrl,
      },
    },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
