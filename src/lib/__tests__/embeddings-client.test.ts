import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmbeddingsClient } from "../embeddings-client";
import type { QueryRequest, QueryResponse } from "../embeddings-client";

vi.mock("@/env", () => ({
  env: {
    EMBEDDINGS_API_URL: "http://localhost:8000",
    CLERK_SECRET_KEY: "test-clerk-key",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "test-clerk-publishable-key",
  },
}));

global.fetch = vi.fn();

describe("EmbeddingsClient", () => {
  let client: EmbeddingsClient;
  const mockBaseUrl = "http://localhost:8000";

  beforeEach(() => {
    client = new EmbeddingsClient(mockBaseUrl);
    vi.clearAllMocks();
  });

  describe("query", () => {
    it("should successfully query embeddings with minimal parameters", async () => {
      const mockResponse: QueryResponse = {
        query: "test query",
        roadmap_id: "electrician-bc",
        sources: [
          {
            node_id: "foundation-program",
            title: "Foundation Program",
            score: 0.95,
            text_snippet: "A comprehensive foundation program...",
          },
        ],
        context: "Relevant context from embeddings",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: QueryRequest = {
        query: "test query",
      };

      const result = await client.query(request);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/query`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "test query",
            top_k: 5,
            roadmap_id: undefined,
          }),
        }),
      );
    });

    it("should query with custom top_k and roadmap_id", async () => {
      const mockResponse: QueryResponse = {
        query: "test query",
        roadmap_id: "electrician-bc",
        sources: [],
        context: "",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: QueryRequest = {
        query: "test query",
        top_k: 10,
        roadmap_id: "electrician-bc",
      };

      await client.query(request);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/query`,
        expect.objectContaining({
          body: JSON.stringify({
            query: "test query",
            top_k: 10,
            roadmap_id: "electrician-bc",
          }),
        }),
      );
    });

    it("should handle API errors gracefully", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      const request: QueryRequest = {
        query: "test query",
      };

      await expect(client.query(request)).rejects.toThrow(
        "Embeddings API query failed (500): Internal server error",
      );
    });

    it("should handle network errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const request: QueryRequest = {
        query: "test query",
      };

      await expect(client.query(request)).rejects.toThrow("Network error");
    });

    it("should return multiple sources in response", async () => {
      const mockResponse: QueryResponse = {
        query: "electrician training",
        roadmap_id: "electrician-bc",
        sources: [
          {
            node_id: "foundation-program",
            title: "Foundation Program",
            score: 0.95,
            text_snippet: "Foundation program details...",
          },
          {
            node_id: "level-1",
            title: "Level 1 Technical Training",
            score: 0.88,
            text_snippet: "Level 1 training details...",
          },
          {
            node_id: "level-2",
            title: "Level 2 Technical Training",
            score: 0.82,
            text_snippet: "Level 2 training details...",
          },
        ],
        context: "Combined context from all sources",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.query({ query: "electrician training" });

      expect(result.sources).toHaveLength(3);
      expect(result.sources[0]?.score).toBeGreaterThan(
        result.sources[1]?.score ?? 0,
      );
    });
  });

  describe("health", () => {
    it("should successfully check health", async () => {
      const mockHealth = {
        status: "ok",
        loaded_indexes: ["electrician-bc"],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      });

      const result = await client.health();

      expect(result).toEqual(mockHealth);
      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/health`);
    });

    it("should handle health check failures", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(client.health()).rejects.toThrow(
        "Health check failed (503)",
      );
    });

    it("should return multiple loaded indexes", async () => {
      const mockHealth = {
        status: "ok",
        loaded_indexes: ["electrician-bc", "plumber-bc", "carpenter-bc"],
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      });

      const result = await client.health();

      expect(result.loaded_indexes).toHaveLength(3);
      expect(result.loaded_indexes).toContain("electrician-bc");
    });
  });

  describe("constructor", () => {
    it("should use provided baseUrl", async () => {
      const customClient = new EmbeddingsClient("http://custom:9000");

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "healthy", loaded_indexes: [] }),
      });

      await customClient.health();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://custom:9000/health",
      );
    });

    it("should use environment baseUrl when not provided", async () => {
      const defaultClient = new EmbeddingsClient();

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "healthy", loaded_indexes: [] }),
      });

      await defaultClient.health();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
      );
    });
  });
});
