import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type LanguageModel } from "ai";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { queryEmbeddings, getActiveBackend } from "@/lib/embeddings-hybrid";
import { logger } from "@/lib/logger";
import { chatRateLimit } from "@/lib/rate-limit";
import { env } from "@/env";
import { getCookieName } from "@/lib/user-identifier";
import { loadNodeContent } from "@/lib/roadmap-loader";

import { auth } from "@clerk/nextjs/server";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(10000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  roadmap_id: z.string().optional(),
  selected_node_id: z.string().optional(),
  user_profile: z
    .object({
      trade: z.string().optional(),
      currentLevel: z.string().optional(),
      specialization: z.string().optional(),
      residencyStatus: z.string().optional(),
    })
    .optional(),
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
  const cookieName = getCookieName();
  const userIdCookie = req.cookies.get(cookieName)?.value;

  if (userIdCookie) {
    return userIdCookie;
  }

  return "anonymous";
}

export async function POST(req: NextRequest) {
  try {
    const { userId, isAuthenticated } = await auth();
    if (!isAuthenticated) throw new Error("user not logged in");

    const { success, limit, reset, remaining } =
      await chatRateLimit.limit(userId);

    logger.debug(`User ID: ${userId}`);

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

    // Create a custom streaming response with status updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const activeBackend = getActiveBackend();
          logger.info("Using embeddings backend", {
            backend: activeBackend,
            roadmapId: validatedBody.roadmap_id,
          });
          // Send initial status update
          const statusUpdate1 = {
            type: "status",
            message: "Retrieving Augmented info",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(statusUpdate1)}\n\n`),
          );
          // Query embeddings
          const embeddingsResponse = await queryEmbeddings({
            query: lastUserMessage.content,
            roadmap_id: validatedBody.roadmap_id,
            top_k: validatedBody.top_k ?? 5,
          });
          logger.info("Retrieved embeddings successfully", {
            backend: activeBackend,
            sourcesCount: embeddingsResponse.sources.length,
          });
          // Send second status update
          const statusUpdate2 = {
            type: "status",
            message: "Generating response",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(statusUpdate2)}\n\n`),
          );
          // Build user context string
          let userContext = "";
          if (validatedBody.user_profile) {
            const { trade, currentLevel, specialization, residencyStatus } =
              validatedBody.user_profile;
            const contextParts = [];

            if (trade) contextParts.push(`Trade: ${trade}`);
            if (currentLevel)
              contextParts.push(`Current Level: ${currentLevel}`);
            if (specialization)
              contextParts.push(`Specialization: ${specialization}`);
            if (residencyStatus)
              contextParts.push(`Residency Status: ${residencyStatus}`);

            if (contextParts.length > 0) {
              userContext = `User Profile:\n${contextParts.join("\n")}\n\n`;
            }
          }

          // Build node context string
          let nodeContext = "";
          if (validatedBody.selected_node_id && validatedBody.roadmap_id) {
            try {
              const nodeContent = await loadNodeContent(
                validatedBody.roadmap_id,
                validatedBody.selected_node_id,
              );
              if (nodeContent) {
                nodeContext = `Current Step Information:\nTitle: ${nodeContent.frontmatter.title}\n${
                  nodeContent.content
                    .split("\n")
                    .find(
                      (line) => line.startsWith("#") === false && line.trim(),
                    )
                    ?.trim() ?? ""
                }\n\n`;
              }
            } catch (error) {
              logger.warn("Failed to load node content for context", {
                error: error as Error,
                nodeId: validatedBody.selected_node_id,
                roadmapId: validatedBody.roadmap_id,
              });
            }
          }

          const systemPrompt = `You are a helpful career guidance assistant for skilled trades in British Columbia, Canada.

${userContext}${nodeContext}You have access to the following relevant information from the career roadmap database:

${embeddingsResponse.context}

Use this information to provide personalized guidance based on the user's current situation and the step they're asking about. If the information doesn't contain a direct answer, say so honestly and provide general guidance based on what you know about skilled trades in BC.

Always cite which specific sections or documents your answer comes from when possible.`;

          // start the AI response stream
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
                userId,
              });
            },
          });

          // send metadata before streaming starts
          const metadataUpdate = {
            type: "metadata",
            sources: embeddingsResponse.sources,
            roadmapId: embeddingsResponse.roadmap_id,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(metadataUpdate)}\n\n`),
          );

          // stream the AI response
          const reader = result.toDataStream().getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally {
            reader.releaseLock();
          }

          controller.close();
        } catch (error) {
          const errorUpdate = {
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorUpdate)}\n\n`),
          );
          controller.close();
        }
      },
    });

    const response = new Response(stream, {
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    // for debugging
    response.headers.set("X-User-Id", userId);

    return response;
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
