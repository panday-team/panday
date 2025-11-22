import { type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OpenAI } from "openai";
import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { voiceRateLimit } from "@/lib/rate-limit";
import { VOICE_CONFIG } from "@/lib/chat-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Zod schema for transcription API response validation
 * Ensures type safety when parsing OpenAI API responses
 */
const TranscriptionResponseSchema = z.object({
  transcript: z.string(),
  language: z.string(),
  translation: z.string().optional(),
  finalText: z.string(),
});

export type TranscriptionResponse = z.infer<typeof TranscriptionResponseSchema>;

/**
 * POST /api/transcribe
 * Transcribes audio using OpenAI Whisper and translates to English if needed
 *
 * Features:
 * - Separate rate limiting (5 req/min) to prevent quota exhaustion
 * - File size validation (max 25MB)
 * - Timeout protection (30s)
 * - Uses Whisper's built-in translation for non-English audio
 * - Comprehensive error handling with structured logging
 *
 * @param req - NextRequest with multipart/form-data containing audio file
 * @returns TranscriptionResponse with transcript, language, and translated text
 */
export async function POST(req: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    VOICE_CONFIG.API_TIMEOUT_MS,
  );

  try {
    // Authenticate user
    const { userId, isAuthenticated } = await auth();

    if (!userId || !isAuthenticated) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Apply voice-specific rate limiting (separate from chat)
    const { success, limit, reset, remaining } =
      await voiceRateLimit.limit(userId);

    if (!success) {
      logger.warn("Voice transcription rate limit exceeded", {
        userId,
        limit,
        remaining,
      });

      return Response.json(
        {
          error: "Too many transcription requests. Please try again later.",
          limit,
          reset: new Date(reset).toISOString(),
          remaining,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        },
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return Response.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    // Validate file size (max 25MB per OpenAI Whisper limit)
    if (audioFile.size > VOICE_CONFIG.MAX_FILE_SIZE_BYTES) {
      logger.warn("Audio file exceeds size limit", {
        userId,
        fileSize: audioFile.size,
        maxSize: VOICE_CONFIG.MAX_FILE_SIZE_BYTES,
      });

      return Response.json(
        {
          error: `Audio file too large. Maximum size is ${VOICE_CONFIG.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
        },
        { status: 400 },
      );
    }

    // Validate minimum file size
    if (audioFile.size < VOICE_CONFIG.MIN_BLOB_SIZE_BYTES) {
      return Response.json(
        { error: "Recording too short. Please try again." },
        { status: 400 },
      );
    }

    logger.info("Transcribing audio", {
      userId,
      fileSize: audioFile.size,
      fileType: audioFile.type,
    });

    // Convert Blob to File for OpenAI API
    const file = new File([audioFile], "recording.webm", {
      type: audioFile.type,
    });

    // Transcribe audio using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create(
      {
        file: file,
        model: VOICE_CONFIG.WHISPER_MODEL,
        response_format: "verbose_json",
      },
      {
        signal: controller.signal,
      },
    );

    const transcript = transcription.text;
    const language = transcription.language ?? "unknown";

    logger.info("Transcription completed", {
      userId,
      language,
      transcriptLength: transcript.length,
    });

    // Check if translation is needed (not English)
    let translation: string | undefined;
    let finalText = transcript;

    if (language !== "en") {
      logger.info("Translating transcript to English", {
        userId,
        fromLanguage: language,
      });

      try {
        // Use Whisper's built-in translation endpoint (more efficient than chat completions)
        // This uses the same Whisper model but returns English translation directly
        const translationResponse = await openai.audio.translations.create(
          {
            file: file,
            model: VOICE_CONFIG.WHISPER_MODEL,
          },
          {
            signal: controller.signal,
          },
        );

        translation = translationResponse.text;
        finalText = translation;

        logger.info("Translation completed", {
          userId,
          translationLength: translation.length,
        });
      } catch (error) {
        logger.warn("Translation failed, using original transcript", {
          userId,
          language,
          error: error instanceof Error ? error.message : String(error),
        });
        // Fall back to original transcript if translation fails
      }
    }

    clearTimeout(timeoutId);

    const response: TranscriptionResponse = {
      transcript,
      language,
      translation,
      finalText,
    };

    // Validate response structure
    const validatedResponse = TranscriptionResponseSchema.parse(response);

    return Response.json(validatedResponse);
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort/timeout errors
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("Transcription timeout", error);
      return Response.json(
        {
          error:
            "Transcription request timed out. Please try a shorter recording.",
        },
        { status: 504 },
      );
    }

    logger.error(
      "Transcription API error",
      error instanceof Error ? error : new Error(String(error)),
    );

    // Generic error message for production (don't leak implementation details)
    return Response.json(
      { error: "Failed to transcribe audio. Please try again." },
      { status: 500 },
    );
  }
}
