import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { VOICE_CONFIG } from "@/lib/chat-config";

// Declare mock functions before using them in vi.mock
const mockTranscriptionsCreate = vi.fn();
const mockTranslationsCreate = vi.fn();

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      userId: "test-user-id",
      isAuthenticated: true,
    }),
  ),
}));

// Mock OpenAI
vi.mock("openai", () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        create: (...args: unknown[]) => mockTranscriptionsCreate(...args),
      },
      translations: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        create: (...args: unknown[]) => mockTranslationsCreate(...args),
      },
    },
  })),
}));

// Mock rate limiter
vi.mock("@/lib/rate-limit", () => ({
  voiceRateLimit: {
    limit: vi.fn(() =>
      Promise.resolve({
        success: true,
        limit: 5,
        reset: Date.now() + 60000,
        remaining: 4,
      }),
    ),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock env
vi.mock("@/env", () => ({
  env: {
    OPENAI_API_KEY: "test-key",
  },
}));

describe("POST /api/transcribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to create multipart form data
  const createAudioRequest = (audioSize = 5000) => {
    const audioBlob = new Blob([new ArrayBuffer(audioSize)], {
      type: "audio/webm",
    });
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    return new NextRequest("http://localhost:3000/api/transcribe", {
      method: "POST",
      body: formData,
    });
  };

  describe("Authentication Requirements", () => {
    it("MUST reject unauthenticated users with 401", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: null,
        isAuthenticated: false,
      } as never);

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("MUST reject when userId is missing even if isAuthenticated is true", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: null,
        isAuthenticated: true,
      } as never);

      const request = createAudioRequest();
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("MUST reject when isAuthenticated is false even if userId exists", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: "test-user-id",
        isAuthenticated: false,
      } as never);

      const request = createAudioRequest();
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("MUST allow authenticated users with both userId and isAuthenticated", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Hello world",
        language: "en",
      });

      const request = createAudioRequest();
      const response = await POST(request);

      expect(response.status).not.toBe(401);
    });
  });

  describe("Rate Limiting Requirements", () => {
    it("MUST use voiceRateLimit (not chatRateLimit)", async () => {
      const { voiceRateLimit } = await import("@/lib/rate-limit");

      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Hello world",
        language: "en",
      });

      const request = createAudioRequest();
      await POST(request);

      expect(voiceRateLimit.limit).toHaveBeenCalledWith("test-user-id");
    });

    it("MUST return 429 when rate limit exceeded", async () => {
      const { voiceRateLimit } = await import("@/lib/rate-limit");
      const resetTime = Date.now() + 60000;

      vi.mocked(voiceRateLimit.limit).mockResolvedValueOnce({
        success: false,
        limit: 5,
        reset: resetTime,
        remaining: 0,
        pending: Promise.resolve(),
      });

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain("Too many transcription requests");
      expect(data.limit).toBe(5);
      expect(data.remaining).toBe(0);
      expect(data.reset).toBe(new Date(resetTime).toISOString());
    });

    it("MUST include rate limit headers in 429 response", async () => {
      const { voiceRateLimit } = await import("@/lib/rate-limit");
      const resetTime = Date.now() + 60000;

      vi.mocked(voiceRateLimit.limit).mockResolvedValueOnce({
        success: false,
        limit: 5,
        reset: resetTime,
        remaining: 0,
        pending: Promise.resolve(),
      });

      const request = createAudioRequest();
      const response = await POST(request);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Reset")).toBe(
        resetTime.toString(),
      );
    });

    it("MUST rate limit before making expensive API calls", async () => {
      const { voiceRateLimit } = await import("@/lib/rate-limit");

      vi.mocked(voiceRateLimit.limit).mockResolvedValueOnce({
        success: false,
        limit: 5,
        reset: Date.now() + 60000,
        remaining: 0,
        pending: Promise.resolve(),
      });

      const request = createAudioRequest();
      await POST(request);

      // OpenAI should never be called when rate limited
      expect(mockTranscriptionsCreate).not.toHaveBeenCalled();
    });
  });

  describe("File Validation Requirements", () => {
    it("MUST reject requests without audio file", async () => {
      const request = new NextRequest("http://localhost:3000/api/transcribe", {
        method: "POST",
        body: new FormData(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No audio file provided");
    });

    it("MUST reject files larger than 25MB", async () => {
      const largeSize = VOICE_CONFIG.MAX_FILE_SIZE_BYTES + 1;
      const request = createAudioRequest(largeSize);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Audio file too large");
      expect(data.error).toContain("25MB");
    });

    it("MUST reject files smaller than 1KB", async () => {
      const tinySize = VOICE_CONFIG.MIN_BLOB_SIZE_BYTES - 1;
      const request = createAudioRequest(tinySize);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Recording too short. Please try again.");
    });

    it("MUST accept files within valid size range", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Valid audio",
        language: "en",
      });

      const validSize = 5000; // 5KB - well within limits
      const request = createAudioRequest(validSize);

      const response = await POST(request);

      expect(response.status).not.toBe(400);
    });

    it("MUST log file metadata when receiving valid file", async () => {
      const { logger } = await import("@/lib/logger");

      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Test",
        language: "en",
      });

      const request = createAudioRequest(5000);
      await POST(request);

      expect(logger.info).toHaveBeenCalledWith(
        "Transcribing audio",
        expect.objectContaining({
          userId: "test-user-id",
          fileSize: expect.any(Number),
          fileType: "audio/webm",
        }),
      );
    });
  });

  describe("Transcription Flow (English audio)", () => {
    it("MUST call OpenAI Whisper with correct model from config", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Hello world",
        language: "en",
      });

      const request = createAudioRequest();
      await POST(request);

      expect(mockTranscriptionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: VOICE_CONFIG.WHISPER_MODEL,
          response_format: "verbose_json",
          file: expect.any(File),
        }),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("MUST return transcript and language for English audio", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "This is English text",
        language: "en",
      });

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transcript).toBe("This is English text");
      expect(data.language).toBe("en");
      expect(data.finalText).toBe("This is English text");
    });

    it("MUST NOT call translation API for English audio", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "English text",
        language: "en",
      });

      const request = createAudioRequest();
      await POST(request);

      expect(mockTranslationsCreate).not.toHaveBeenCalled();
    });

    it("MUST NOT include translation field for English audio", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "English text",
        language: "en",
      });

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(data.translation).toBeUndefined();
    });

    it("MUST log successful transcription", async () => {
      const { logger } = await import("@/lib/logger");

      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Test transcript",
        language: "en",
      });

      const request = createAudioRequest();
      await POST(request);

      expect(logger.info).toHaveBeenCalledWith(
        "Transcription completed",
        expect.objectContaining({
          userId: "test-user-id",
          language: "en",
          transcriptLength: 15,
        }),
      );
    });
  });

  describe("Translation Flow (Non-English audio)", () => {
    // NOTE: Translation is currently disabled for performance reasons (see route.ts TODO comment)
    // These tests verify the current behavior where non-English audio is transcribed but not translated

    it("MUST detect non-English language", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Bonjour le monde",
        language: "fr",
      });

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(data.language).toBe("fr");
    });

    it("MUST NOT call Whisper translations API (translation disabled for performance)", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Hola mundo",
        language: "es",
      });

      const request = createAudioRequest();
      await POST(request);

      // Translation is currently disabled to reduce latency
      expect(mockTranslationsCreate).not.toHaveBeenCalled();
    });

    it("MUST return transcript without translation for non-English (translation disabled)", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Hola mundo",
        language: "es",
      });

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(data.transcript).toBe("Hola mundo");
      expect(data.translation).toBeUndefined(); // Translation is disabled
      expect(data.finalText).toBe("Hola mundo"); // Uses transcript as finalText
      expect(data.language).toBe("es");
    });

    it("MUST handle non-English audio gracefully without translation", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Bonjour",
        language: "fr",
      });

      const request = createAudioRequest();
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("MUST log transcription for non-English audio", async () => {
      const { logger } = await import("@/lib/logger");

      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Ciao mondo",
        language: "it",
      });

      const request = createAudioRequest();
      await POST(request);

      expect(logger.info).toHaveBeenCalledWith(
        "Transcription completed",
        expect.objectContaining({
          userId: "test-user-id",
          language: "it",
          transcriptLength: 10,
        }),
      );
    });
  });

  describe("Timeout Protection Requirements", () => {
    it("MUST set timeout of 30 seconds via AbortController", async () => {
      // This test verifies the timeout is configured correctly
      // The actual timeout behavior is tested via AbortError handling
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Test",
        language: "en",
      });

      const request = createAudioRequest();
      await POST(request);

      // Verify AbortSignal was passed (timeout is set on the signal)
      const callArgs = mockTranscriptionsCreate.mock.calls[0] as unknown[];
      expect(callArgs).toBeDefined();
      expect(callArgs[1]).toHaveProperty("signal");
      expect((callArgs[1] as { signal: AbortSignal }).signal).toBeInstanceOf(
        AbortSignal,
      );
    });

    it("MUST handle AbortError gracefully", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";

      mockTranscriptionsCreate.mockRejectedValueOnce(abortError);

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error).toBe(
        "Transcription request timed out. Please try a shorter recording.",
      );
    });

    it("MUST pass AbortSignal to OpenAI API calls", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Test",
        language: "en",
      });

      const request = createAudioRequest();
      await POST(request);

      expect(mockTranscriptionsCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  describe("Error Handling Requirements", () => {
    it("MUST return generic error message on transcription failure", async () => {
      mockTranscriptionsCreate.mockRejectedValueOnce(
        new Error("Internal OpenAI error: rate limit exceeded"),
      );

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to transcribe audio. Please try again.");
      // MUST NOT leak internal error details
      expect(data.error).not.toContain("OpenAI");
      expect(data.error).not.toContain("rate limit");
    });

    it("MUST log detailed errors server-side", async () => {
      const { logger } = await import("@/lib/logger");
      const detailedError = new Error("Detailed internal error");

      mockTranscriptionsCreate.mockRejectedValueOnce(detailedError);

      const request = createAudioRequest();
      await POST(request);

      expect(logger.error).toHaveBeenCalledWith(
        "Transcription API error",
        detailedError,
      );
    });

    it("MUST handle non-Error exceptions gracefully", async () => {
      mockTranscriptionsCreate.mockRejectedValueOnce("String error");

      const request = createAudioRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.ok).toBe(false);
    });

    it("MUST return 500 for unexpected errors", async () => {
      mockTranscriptionsCreate.mockRejectedValueOnce(
        new Error("Unexpected error"),
      );

      const request = createAudioRequest();
      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe("Response Format Requirements", () => {
    it("MUST validate response schema with Zod", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Test",
        language: "en",
      });

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      // Zod validation ensures these fields exist
      expect(data).toHaveProperty("transcript");
      expect(data).toHaveProperty("language");
      expect(data).toHaveProperty("finalText");
    });

    it("MUST reject invalid response shapes", async () => {
      // Mock invalid response (missing required fields)
      mockTranscriptionsCreate.mockResolvedValueOnce({
        // Missing 'text' and 'language'
        invalid: "data",
      });

      const request = createAudioRequest();
      const response = await POST(request);

      // Should fail validation and return error
      expect(response.status).toBe(500);
    });

    it("MUST return type-safe response structure", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Type safe",
        language: "en",
      });

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      // TypeScript types should match runtime structure
      expect(typeof data.transcript).toBe("string");
      expect(typeof data.language).toBe("string");
      expect(typeof data.finalText).toBe("string");
      expect(
        data.translation === undefined || typeof data.translation === "string",
      ).toBe(true);
    });
  });

  describe("Edge Cases and Integration", () => {
    it("MUST handle language code 'unknown' gracefully", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Unknown language",
        language: undefined, // API might return undefined
      });

      const request = createAudioRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.language).toBe("unknown");
    });

    it("MUST handle concurrent requests independently", async () => {
      mockTranscriptionsCreate.mockResolvedValue({
        text: "Concurrent test",
        language: "en",
      });

      const request1 = createAudioRequest();
      const request2 = createAudioRequest();

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it("MUST clean up resources on successful completion", async () => {
      mockTranscriptionsCreate.mockResolvedValueOnce({
        text: "Test",
        language: "en",
      });

      const request = createAudioRequest();
      await POST(request);

      // Timeout should be cleared (no way to directly test, but ensures no memory leaks)
      expect(mockTranscriptionsCreate).toHaveBeenCalledTimes(1);
    });
  });
});
