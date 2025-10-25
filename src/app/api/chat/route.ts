import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type LanguageModel } from "ai";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { queryEmbeddings } from "@/lib/embeddings-service";
import { logger } from "@/lib/logger";
import { chatRateLimit } from "@/lib/rate-limit";
import { env } from "@/env";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(10000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  roadmap_id: z.string().optional(),
  top_k: z.number().int().min(1).max(20).optional(),
});

function getAIModel(): LanguageModel {
  switch (env.AI_PROVIDER) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: env.GOOGLE_API_KEY,
      });
      return google(env.AI_MODEL);
    }
    default:
      throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER as string}`);
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequestIdentifier(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for") ??
    req.headers.get("x-real-ip") ??
    "anonymous"
  );
}

export async function POST(req: NextRequest) {
  try {
    const identifier = getRequestIdentifier(req);

    const { success, limit, reset, remaining } =
      await chatRateLimit.limit(identifier);

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

    const body: unknown = await req.json();

    const validationResult = ChatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        {
          error: "Invalid request",
          details: validationResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const validatedBody = validationResult.data;

    const lastUserMessage = validatedBody.messages
      .filter((msg) => msg.role === "user")
      .slice(-1)[0];

    if (!lastUserMessage) {
      return Response.json({ error: "No user message found" }, { status: 400 });
    }

    const embeddingsResponse = await queryEmbeddings({
      query: lastUserMessage.content,
      roadmap_id: validatedBody.roadmap_id,
      top_k: validatedBody.top_k ?? 5,
    });

    const systemPrompt = `You are a helpful career guidance assistant for skilled trades in British Columbia, Canada.

You have access to the following relevant information from the career roadmap database:

${embeddingsResponse.context}

Use this information to answer the user's question accurately. If the information doesn't contain a direct answer, say so honestly and provide general guidance based on what you know about skilled trades in BC.

Always cite which specific sections or documents your answer comes from when possible.`;

    const result = streamText({
      model: getAIModel(),
      system: systemPrompt,
      messages: validatedBody.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxTokens: 1024,
      onFinish: async () => {
        logger.info("Chat completion finished", {
          provider: env.AI_PROVIDER,
          model: env.AI_MODEL,
        });
      },
    });

    return result.toDataStreamResponse({
      headers: {
        "X-Sources": JSON.stringify(embeddingsResponse.sources),
        "X-Roadmap-Id": embeddingsResponse.roadmap_id,
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Chat API error", error, {
      identifier: getRequestIdentifier(req),
    });

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return Response.json(
          { error: "Request timeout - embeddings API took too long" },
          { status: 504 },
        );
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
