import { type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OpenAI } from "openai";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { chatRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const { userId, isAuthenticated } = await auth();

        if (!userId || !isAuthenticated) {
            return Response.json(
                { error: "Authentication required" },
                { status: 401 },
            );
        }

        // Apply rate limiting
        const { success, limit, reset, remaining } =
            await chatRateLimit.limit(userId);

        if (!success) {
            return Response.json(
                {
                    error: "Rate limit exceeded",
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
        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
            response_format: "verbose_json",
        });

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

        if (language !== "en" && language !== "english") {
            logger.info("Translating transcript to English", {
                userId,
                fromLanguage: language,
            });

            try {
                const translationResponse = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a translator. Translate the following text to English. Only return the translation, nothing else.",
                        },
                        {
                            role: "user",
                            content: transcript,
                        },
                    ],
                    temperature: 0.3,
                });

                translation = translationResponse.choices[0]?.message.content ?? undefined;
                finalText = translation ?? transcript;

                logger.info("Translation completed", {
                    userId,
                    translationLength: translation?.length ?? 0,
                });
            } catch (error) {
                logger.error("Translation failed, using original transcript", error);
                // Fall back to original transcript if translation fails
            }
        }

        return Response.json({
            transcript,
            language,
            translation,
            finalText,
        });
    } catch (error) {
        logger.error("Transcription API error", error);

        const errorMessage =
            error instanceof Error ? error.message : "Transcription failed";

        return Response.json(
            { error: errorMessage },
            { status: 500 },
        );
    }
}
