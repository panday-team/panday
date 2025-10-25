import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

vi.mock("@/lib/embeddings-service", () => ({
  queryEmbeddings: vi.fn(),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn()),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(() => ({
    toDataStreamResponse: vi.fn(() =>
      Response.json({ message: "Mocked response" }),
    ),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  chatRateLimit: {
    limit: vi.fn(() =>
      Promise.resolve({
        success: true,
        limit: 10,
        reset: Date.now() + 60000,
        remaining: 9,
      }),
    ),
  },
}));

vi.mock("@/env", () => ({
  env: {
    AI_PROVIDER: "google",
    AI_MODEL: "gemini-pro",
    GOOGLE_API_KEY: "test-key",
  },
}));

describe("Chat API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/chat", () => {
    it("should reject requests without messages", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
      expect(data.details).toBeDefined();
    });

    it("should reject requests with empty messages array", async () => {
      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should query embeddings with provided parameters", async () => {
      const { queryEmbeddings } = await import("@/lib/embeddings-service");
      const { streamText } = await import("ai");

      vi.mocked(queryEmbeddings).mockResolvedValueOnce({
        query: "test query",
        roadmap_id: "electrician-bc",
        sources: [],
        context: "Test context",
      });

      vi.mocked(streamText).mockReturnValueOnce({
        toDataStreamResponse: vi.fn(
          () =>
            new Response("stream", {
              headers: {
                "X-Sources": "[]",
                "X-Roadmap-Id": "electrician-bc",
              },
            }),
        ),
      } as never);

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
          roadmap_id: "electrician-bc",
          top_k: 10,
        }),
      });

      await POST(request);

      expect(queryEmbeddings).toHaveBeenCalledWith({
        query: "test query",
        roadmap_id: "electrician-bc",
        top_k: 10,
      });
    });

    it("should use default top_k value when not provided", async () => {
      const { queryEmbeddings } = await import("@/lib/embeddings-service");
      const { streamText } = await import("ai");

      vi.mocked(queryEmbeddings).mockResolvedValueOnce({
        query: "test query",
        roadmap_id: "electrician-bc",
        sources: [],
        context: "Test context",
      });

      vi.mocked(streamText).mockReturnValueOnce({
        toDataStreamResponse: vi.fn(() => new Response("stream")),
      } as never);

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
        }),
      });

      await POST(request);

      expect(queryEmbeddings).toHaveBeenCalledWith({
        query: "test query",
        roadmap_id: undefined,
        top_k: 5,
      });
    });

    it("should handle embeddings API errors", async () => {
      const { queryEmbeddings } = await import("@/lib/embeddings-service");

      vi.mocked(queryEmbeddings).mockRejectedValueOnce(
        new Error("Failed to query embeddings: Embeddings service unavailable"),
      );

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Embeddings service unavailable");
    });

    it("should handle AI provider errors", async () => {
      const { queryEmbeddings } = await import("@/lib/embeddings-service");
      const { streamText } = await import("ai");

      vi.mocked(queryEmbeddings).mockResolvedValueOnce({
        query: "test query",
        roadmap_id: "electrician-bc",
        sources: [],
        context: "Test context",
      });

      vi.mocked(streamText).mockImplementationOnce(() => {
        throw new Error("AI provider error");
      });

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("AI provider error");
    });

    it("should call streamText with proper parameters", async () => {
      const { queryEmbeddings } = await import("@/lib/embeddings-service");
      const { streamText } = await import("ai");

      const mockSources = [
        {
          node_id: "foundation-program",
          title: "Foundation Program",
          score: 0.95,
          text_snippet: "Test snippet",
        },
      ];

      vi.mocked(queryEmbeddings).mockResolvedValueOnce({
        query: "test query",
        roadmap_id: "electrician-bc",
        sources: mockSources,
        context: "Test context",
      });

      vi.mocked(streamText).mockReturnValueOnce({
        toDataStreamResponse: vi.fn((options?: { headers?: HeadersInit }) => {
          const headers = new Headers(options?.headers);
          return new Response("stream", { headers });
        }),
      } as never);

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
        }),
      });

      await POST(request);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining("Test context"),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: "test query",
            }),
          ]),
          maxTokens: 1024,
        }),
      );
    });

    it("should build system prompt with context", async () => {
      const { queryEmbeddings } = await import("@/lib/embeddings-service");
      const { streamText } = await import("ai");

      vi.mocked(queryEmbeddings).mockResolvedValueOnce({
        query: "test query",
        roadmap_id: "electrician-bc",
        sources: [],
        context: "Detailed context about electrician training",
      });

      vi.mocked(streamText).mockReturnValueOnce({
        toDataStreamResponse: vi.fn(() => new Response("stream")),
      } as never);

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
        }),
      });

      await POST(request);

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining(
            "Detailed context about electrician training",
          ),
        }),
      );
    });
  });
});
