import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryRequest, QueryResponse } from "../embeddings-service";

// Mock env before any other imports that might use it
vi.mock("@/env", () => ({
  env: {
    OPENAI_API_KEY: "test-openai-key",
    CLERK_SECRET_KEY: "test-clerk-key",
    CRON_SECRET: "test-cron-secret-32-chars-minimum",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "test-clerk-publishable-key",
  },
}));

// Mock the dependencies using inline functions
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../embeddings-service", () => ({
  queryEmbeddings: vi.fn(),
}));

vi.mock("../embeddings-postgres", () => ({
  queryEmbeddings: vi.fn(),
  clearCache: vi.fn(),
}));

// Import after mocks are set up
import { logger } from "@/lib/logger";
import * as jsonEmbeddings from "../embeddings-service";
import * as postgresEmbeddings from "../embeddings-postgres";
import * as hybridModule from "../embeddings-hybrid";

const { queryEmbeddings, clearCache, getActiveBackend } = hybridModule;

// Get typed mock references
const mockJsonQueryEmbeddings = vi.mocked(jsonEmbeddings.queryEmbeddings);
const mockPostgresQueryEmbeddings = vi.mocked(
  postgresEmbeddings.queryEmbeddings,
);
const mockPostgresClearCache = vi.mocked(postgresEmbeddings.clearCache);
const mockLoggerInfo = vi.mocked(logger.info);
const mockLoggerWarn = vi.mocked(logger.warn);
const mockLoggerError = vi.mocked(logger.error);

describe("embeddings-hybrid", () => {
  const mockQueryRequest: QueryRequest = {
    query: "How do I become an electrician?",
    top_k: 5,
    roadmap_id: "electrician-bc",
  };

  const mockQueryResponse: QueryResponse = {
    query: "How do I become an electrician?",
    roadmap_id: "electrician-bc",
    sources: [
      {
        node_id: "foundation-program",
        title: "Foundation Program",
        score: 0.9,
        text_snippet: "The foundation program is...",
      },
    ],
    context: "[Foundation Program]\nThe foundation program is...",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EMBEDDINGS_BACKEND;
  });

  afterEach(() => {
    delete process.env.EMBEDDINGS_BACKEND;
  });

  describe("getActiveBackend", () => {
    it("returns 'json' by default when EMBEDDINGS_BACKEND is not set", () => {
      expect(getActiveBackend()).toBe("json");
    });

    it("returns 'postgres' when EMBEDDINGS_BACKEND=postgres", () => {
      process.env.EMBEDDINGS_BACKEND = "postgres";
      expect(getActiveBackend()).toBe("postgres");
    });

    it("returns 'postgres' when EMBEDDINGS_BACKEND=POSTGRES (case insensitive)", () => {
      process.env.EMBEDDINGS_BACKEND = "POSTGRES";
      expect(getActiveBackend()).toBe("postgres");
    });

    it("returns 'json' when EMBEDDINGS_BACKEND=json", () => {
      process.env.EMBEDDINGS_BACKEND = "json";
      expect(getActiveBackend()).toBe("json");
    });

    it("returns 'json' and logs warning for invalid backend value", () => {
      process.env.EMBEDDINGS_BACKEND = "invalid-backend";
      expect(getActiveBackend()).toBe("json");
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        "Invalid EMBEDDINGS_BACKEND value, defaulting to json",
        { provided: "invalid-backend" },
      );
    });
  });

  describe("queryEmbeddings", () => {
    describe("with JSON backend (default)", () => {
      it("routes queries to JSON backend by default", async () => {
        mockJsonQueryEmbeddings.mockResolvedValue(mockQueryResponse);

        const result = await queryEmbeddings(mockQueryRequest);

        expect(mockJsonQueryEmbeddings).toHaveBeenCalledWith(mockQueryRequest);
        expect(mockPostgresQueryEmbeddings).not.toHaveBeenCalled();
        expect(result).toEqual(mockQueryResponse);
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          "Querying embeddings via hybrid router",
          { backend: "json", roadmapId: "electrician-bc" },
        );
      });

      it("propagates errors from JSON backend", async () => {
        const error = new Error("JSON backend failed");
        mockJsonQueryEmbeddings.mockRejectedValue(error);

        await expect(queryEmbeddings(mockQueryRequest)).rejects.toThrow(
          "JSON backend failed",
        );
      });
    });

    describe("with Postgres backend", () => {
      beforeEach(() => {
        process.env.EMBEDDINGS_BACKEND = "postgres";
      });

      it("routes queries to Postgres backend when configured", async () => {
        mockPostgresQueryEmbeddings.mockResolvedValue(mockQueryResponse);

        const result = await queryEmbeddings(mockQueryRequest);

        expect(mockPostgresQueryEmbeddings).toHaveBeenCalledWith(
          mockQueryRequest,
        );
        expect(mockJsonQueryEmbeddings).not.toHaveBeenCalled();
        expect(result).toEqual(mockQueryResponse);
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          "Querying embeddings via hybrid router",
          { backend: "postgres", roadmapId: "electrician-bc" },
        );
      });

      it("falls back to JSON backend when Postgres fails", async () => {
        const postgresError = new Error("Postgres connection failed");
        mockPostgresQueryEmbeddings.mockRejectedValue(postgresError);
        mockJsonQueryEmbeddings.mockResolvedValue(mockQueryResponse);

        const result = await queryEmbeddings(mockQueryRequest);

        expect(mockPostgresQueryEmbeddings).toHaveBeenCalled();
        expect(mockJsonQueryEmbeddings).toHaveBeenCalledWith(mockQueryRequest);
        expect(result).toEqual(mockQueryResponse);
        expect(mockLoggerError).toHaveBeenCalledWith(
          "Postgres embeddings query failed, falling back to JSON",
          postgresError,
          { roadmapId: "electrician-bc" },
        );
        expect(mockLoggerInfo).toHaveBeenCalledWith(
          "Successfully fell back to JSON embeddings",
          { roadmapId: "electrician-bc" },
        );
      });

      it("throws original Postgres error when both backends fail", async () => {
        const postgresError = new Error("Postgres connection failed");
        const jsonError = new Error("JSON fallback failed");
        mockPostgresQueryEmbeddings.mockRejectedValue(postgresError);
        mockJsonQueryEmbeddings.mockRejectedValue(jsonError);

        await expect(queryEmbeddings(mockQueryRequest)).rejects.toThrow(
          "Postgres connection failed",
        );
        expect(mockLoggerError).toHaveBeenCalledWith(
          "JSON fallback also failed",
          jsonError,
          { roadmapId: "electrician-bc" },
        );
      });
    });

    it("uses default roadmap_id when not provided", async () => {
      mockJsonQueryEmbeddings.mockResolvedValue(mockQueryResponse);

      const requestWithoutRoadmap: QueryRequest = {
        query: "test query",
      };

      await queryEmbeddings(requestWithoutRoadmap);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        "Querying embeddings via hybrid router",
        expect.objectContaining({ backend: "json" }),
      );
    });
  });

  describe("clearCache", () => {
    it("clears Postgres cache when Postgres backend is active", () => {
      process.env.EMBEDDINGS_BACKEND = "postgres";

      clearCache();

      expect(mockPostgresClearCache).toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith("Clearing embeddings cache", {
        backend: "postgres",
      });
    });

    it("logs but does not call Postgres clearCache when JSON backend is active", () => {
      clearCache();

      expect(mockPostgresClearCache).not.toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith("Clearing embeddings cache", {
        backend: "json",
      });
    });
  });
});
