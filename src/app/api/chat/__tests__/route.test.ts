import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

// Mock Clerk auth before importing route
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      userId: "test-user-id",
      sessionId: "test-session-id",
    }),
  ),
}));

vi.mock("@/lib/embeddings-hybrid", () => ({
  queryEmbeddings: vi.fn(),
  getActiveBackend: vi.fn(() => "json"),
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
        pending: Promise.resolve(),
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

  describe("POST /api/chat - Guest Access", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: null,
      } as never);

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required to use chat");
    });

    it("should apply rate limiting before authentication check", async () => {
      const { chatRateLimit } = await import("@/lib/rate-limit");

      // Mock rate limit to fail
      vi.mocked(chatRateLimit.limit).mockResolvedValueOnce({
        success: false,
        limit: 10,
        reset: Date.now() + 60000,
        remaining: 0,
        pending: Promise.resolve(),
      });

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Rate limit exceeded");
      // Verify rate limit was called before auth check would reject
      expect(chatRateLimit.limit).toHaveBeenCalled();
    });

    it("should use IP address for rate limiting when user is not authenticated", async () => {
      const { chatRateLimit } = await import("@/lib/rate-limit");
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: null,
      } as never);

      const request = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "test query" }],
        }),
      });

      await POST(request);

      // Verify rate limit was called with IP address (first in x-forwarded-for)
      expect(chatRateLimit.limit).toHaveBeenCalledWith("192.168.1.1");
    });

    it("should use userId for rate limiting when user is authenticated", async () => {
      const { chatRateLimit } = await import("@/lib/rate-limit");
      const { queryEmbeddings } = await import("@/lib/embeddings-hybrid");
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

      // Verify rate limit was called with userId
      expect(chatRateLimit.limit).toHaveBeenCalledWith("test-user-id");
    });
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
      const { queryEmbeddings } = await import("@/lib/embeddings-hybrid");
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
      const { queryEmbeddings } = await import("@/lib/embeddings-hybrid");
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
      const { queryEmbeddings } = await import("@/lib/embeddings-hybrid");

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

      // Errors in the streaming flow are sent as stream data, not JSON error responses
      expect(response.status).toBe(200); // Streaming response starts with 200
      expect(response.headers.get("content-type")).toContain(
        "text/event-stream",
      );

      // Read the stream to verify error message
      const text = await response.text();
      expect(text).toContain("error");
      expect(text).toContain("Embeddings service unavailable");
    });

    it("should handle AI provider errors", async () => {
      const { queryEmbeddings } = await import("@/lib/embeddings-hybrid");
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

      // Errors in the streaming flow are sent as stream data, not JSON error responses
      expect(response.status).toBe(200); // Streaming response starts with 200
      expect(response.headers.get("content-type")).toContain(
        "text/event-stream",
      );

      // Read the stream to verify error message
      const text = await response.text();
      expect(text).toContain("error");
      expect(text).toContain("AI provider error");
    });

    it("should call streamText with proper parameters", async () => {
      const { queryEmbeddings } = await import("@/lib/embeddings-hybrid");
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
      const { queryEmbeddings } = await import("@/lib/embeddings-hybrid");
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
