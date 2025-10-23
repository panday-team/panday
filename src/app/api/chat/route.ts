/**
 * Chat API endpoint for RAG (Retrieval Augmented Generation).
 *
 * This endpoint:
 * 1. Queries the embeddings API for relevant context
 * 2. Sends the context + user question to the configured AI provider
 * 3. Streams the response back to the client
 */

// import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type LanguageModel } from "ai";
import { type NextRequest } from "next/server";

import { embeddingsClient } from "@/lib/embeddings-client";
import { env } from "@/env";

// Configure AI provider based on environment
function getAIModel(): LanguageModel {
  switch (env.AI_PROVIDER) {
    // case "anthropic": {
    //   const anthropic = createAnthropic({
    //     apiKey: env.ANTHROPIC_API_KEY,
    //   });
    //   return anthropic(env.AI_MODEL);
    // }
    // case "openai": {
    //   const openai = createOpenAI({
    //     apiKey: env.OPENAI_API_KEY,
    //   });
    //   return openai(env.AI_MODEL);
    // }
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

interface ChatRequest {
  message: string;
  roadmap_id?: string;
  top_k?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;

    if (!body.message || typeof body.message !== "string") {
      return Response.json(
        { error: "Message is required and must be a string" },
        { status: 400 },
      );
    }

    // 1. Query embeddings API for relevant context
    const embeddingsResponse = await embeddingsClient.query({
      query: body.message,
      roadmap_id: body.roadmap_id,
      top_k: body.top_k ?? 5,
    });

    // 2. Build system prompt with context
    const systemPrompt = `You are a helpful career guidance assistant for skilled trades in British Columbia, Canada.

You have access to the following relevant information from the career roadmap database:

${embeddingsResponse.context}

Use this information to answer the user's question accurately. If the information doesn't contain a direct answer, say so honestly and provide general guidance based on what you know about skilled trades in BC.

Always cite which specific sections or documents your answer comes from when possible.`;

    // 3. Stream response from AI provider using Vercel AI SDK
    const result = streamText({
      model: getAIModel(),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: body.message,
        },
      ],
      maxTokens: 1024,
      onFinish: async () => {
        // Log completion or store in database if needed
        console.log(
          `Chat completion finished (${env.AI_PROVIDER}/${env.AI_MODEL})`,
        );
      },
    });

    // 4. Return streaming response with sources in headers
    return result.toDataStreamResponse({
      headers: {
        "X-Sources": JSON.stringify(embeddingsResponse.sources),
        "X-Roadmap-Id": embeddingsResponse.roadmap_id,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
