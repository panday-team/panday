import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSystemStatus } from "../systemStatus";
import type { SystemStatus } from "../systemStatus";

vi.mock("@/server/db", () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
  },
  databaseConnectionConfig: {
    mode: "development",
    resolvedDatabaseUrl: "postgresql://user:pass@localhost:5432/testdb",
  },
}));

vi.mock("@/server/database/redisClient", () => ({
  default: {
    ping: vi.fn(),
  },
}));

vi.mock("@/env", () => ({
  env: {
    PRODUCTION: false,
    NODE_ENV: "test",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
    CLERK_SECRET_KEY: "sk_test_123",
  },
}));

describe("systemStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSystemStatus", () => {
    it("should return successful status when all services are healthy", async () => {
      const { db } = await import("@/server/db");
      const redis = (await import("@/server/database/redisClient")).default;

      vi.mocked(db.$queryRawUnsafe).mockResolvedValueOnce([{ 1: 1 }]);
      vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

      const status: SystemStatus = await getSystemStatus();

      expect(status.environment).toBeDefined();
      expect(status.environment.deploymentTarget).toBe("development");
      expect(status.environment.nodeEnv).toBe("test");
      expect(status.environment.databaseHost).toBe("localhost:5432");
      expect(status.environment.databaseName).toBe("testdb");
      expect(status.environment.redisProvider).toBe("Local Redis");

      expect(status.services).toHaveLength(4);

      const dbService = status.services.find((s) => s.name === "Database");
      expect(dbService).toBeDefined();
      expect(dbService?.state).toBe("ok");
      expect(dbService?.latencyMs).toBeGreaterThanOrEqual(0);
      expect(dbService?.target).toBe("development");

      const redisService = status.services.find((s) => s.name === "Redis");
      expect(redisService).toBeDefined();
      expect(redisService?.state).toBe("ok");
      expect(redisService?.detail).toContain("PONG");
      expect(redisService?.latencyMs).toBeGreaterThanOrEqual(0);

      const clerkService = status.services.find((s) => s.name === "Clerk");
      expect(clerkService).toBeDefined();
      expect(clerkService?.state).toBe("ok");
      expect(clerkService?.detail).toBe("Clerk keys loaded");
    });

    it("should handle database connection failures", async () => {
      const { db } = await import("@/server/db");
      const redis = (await import("@/server/database/redisClient")).default;

      vi.mocked(db.$queryRawUnsafe).mockRejectedValueOnce(
        new Error("Connection refused"),
      );
      vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

      const status = await getSystemStatus();

      const dbService = status.services.find((s) => s.name === "Database");
      expect(dbService).toBeDefined();
      expect(dbService?.state).toBe("error");
      expect(dbService?.detail).toBe("Database connection failed");
      expect(dbService?.error).toBe("Connection refused");
    });

    it("should handle Redis connection failures", async () => {
      const { db } = await import("@/server/db");
      const redis = (await import("@/server/database/redisClient")).default;

      vi.mocked(db.$queryRawUnsafe).mockResolvedValueOnce([{ 1: 1 }]);
      vi.mocked(redis.ping).mockRejectedValueOnce(
        new Error("Redis connection timeout"),
      );

      const status = await getSystemStatus();

      const redisService = status.services.find((s) => s.name === "Redis");
      expect(redisService).toBeDefined();
      expect(redisService?.state).toBe("error");
      expect(redisService?.detail).toContain("ping failed");
      expect(redisService?.error).toBe("Redis connection timeout");
    });

    it("should warn when Clerk is not configured", async () => {
      const { db } = await import("@/server/db");
      const redis = (await import("@/server/database/redisClient")).default;

      vi.mocked(db.$queryRawUnsafe).mockResolvedValueOnce([{ 1: 1 }]);
      vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

      vi.doMock("@/env", () => ({
        env: {
          PRODUCTION: false,
          NODE_ENV: "test",
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: undefined,
          CLERK_SECRET_KEY: undefined,
        },
      }));

      const clerkService = (await getSystemStatus()).services.find(
        (s) => s.name === "Clerk",
      );
      expect(clerkService).toBeDefined();
    });

    it("should report production environment correctly", async () => {
      const { db } = await import("@/server/db");
      const redis = (await import("@/server/database/redisClient")).default;

      vi.mocked(db.$queryRawUnsafe).mockResolvedValueOnce([{ 1: 1 }]);
      vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

      vi.doMock("@/env", () => ({
        env: {
          PRODUCTION: true,
          NODE_ENV: "production",
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_123",
          CLERK_SECRET_KEY: "sk_live_123",
        },
      }));

      const status = await getSystemStatus();
      expect(status.environment.redisProvider).toBeDefined();
    });

    it("should measure latency for database queries", async () => {
      const { db } = await import("@/server/db");
      const redis = (await import("@/server/database/redisClient")).default;

      vi.mocked(db.$queryRawUnsafe).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ 1: 1 }]), 50),
          ) as never,
      );
      vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

      const status = await getSystemStatus();

      const dbService = status.services.find((s) => s.name === "Database");
      expect(dbService?.latencyMs).toBeGreaterThanOrEqual(40);
    });

    it("should measure latency for Redis queries", async () => {
      const { db } = await import("@/server/db");
      const redis = (await import("@/server/database/redisClient")).default;

      vi.mocked(db.$queryRawUnsafe).mockResolvedValueOnce([{ 1: 1 }]);
      vi.mocked(redis.ping).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve("PONG"), 30),
          ) as never,
      );

      const status = await getSystemStatus();

      const redisService = status.services.find((s) => s.name === "Redis");
      expect(redisService?.latencyMs).toBeGreaterThanOrEqual(25);
    });
  });
});
