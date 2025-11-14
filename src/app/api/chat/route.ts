import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type LanguageModel } from "ai";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { queryEmbeddings, getActiveBackend } from "@/lib/embeddings-hybrid";
import { getRCRContext, updateRCRContext, generateRCRContextPrompt } from "@/lib/rcr-processor";
import { logger } from "@/lib/logger";
import { chatRateLimit } from "@/lib/rate-limit";
import { env } from "@/env";
import { getCookieName } from "@/lib/user-identifier";
import { loadNodeContent } from "@/lib/roadmap-loader";
import { db } from "@/server/db"; // Import db

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
  enable_rcr: z.boolean().optional().default(false),
  conversation_id: z.string().optional(), // Add conversation_id to schema
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

/**
 * Get request identifier for rate limiting and error logging.
 * Prefers authenticated userId, falls back to IP address for unauthenticated requests.
 */
function getRequestIdentifier(
  req: NextRequest,
  userId?: string | null,
): string {
  if (userId) {
    return userId;
  }

  // Fallback to IP address for rate limiting unauthenticated requests
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "anonymous";
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Last resort - use cookie-based identifier for error logging only
  const cookieName = getCookieName();
  const userIdCookie = req.cookies.get(cookieName)?.value;
  if (userIdCookie) {
    return userIdCookie;
  }

  return "anonymous";
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    // Apply rate limiting BEFORE authentication check to prevent abuse
    const identifier = getRequestIdentifier(req, userId);
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

    // Require authentication for chat
    if (!userId) {
      return Response.json(
        { error: "Authentication required to use chat" },
        { status: 401 },
      );
    }

    logger.debug(`User ID: ${userId}`);

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
        let rcrContext; // Declare rcrContext here
        let aiResponseContent = ""; // Declare aiResponseContent here
        try {
          let conversationId = validatedBody.conversation_id;

          if (!conversationId && userId) {
            const existingConversation = await db.conversationThread.findUnique({
              where: {
                userId_roadmapId: {
                  userId: userId,
                  roadmapId: validatedBody.roadmap_id || "electrician-bc",
                },
              },
            });

            if (existingConversation) {
              conversationId = existingConversation.id;
            } else {
              const newConversation = await db.conversationThread.create({
                data: {
                  userId: userId,
                  title: lastUserMessage.content.substring(0, 50), // Use first 50 chars of user message as title
                  roadmapId: validatedBody.roadmap_id ?? "electrician-bc", // Default to electrician-bc if not provided
                },
              });
              conversationId = newConversation.id;
            }
          }

          if (conversationId && userId) {
            await db.conversationMessage.create({
              data: {
                threadId: conversationId,
                role: "user",
                content: lastUserMessage.content,
                nodeId: validatedBody.selected_node_id,
              },
            });
          }

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

          let nodeTitle: string | undefined;
          let nodeContext = "";
          if (validatedBody.selected_node_id && validatedBody.roadmap_id) {
            try {
              const nodeContent = await loadNodeContent(
                validatedBody.roadmap_id,
                validatedBody.selected_node_id,
              );
              if (nodeContent) {
                nodeTitle = nodeContent.frontmatter.title;
                nodeContext = `Current Step Information:\nTitle: ${nodeTitle}\n${
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
 
          // Get RCR context for enhanced conversation understanding
          let rcrContextPrompt = "";
          const isRCREnabled = env.ENABLE_RCR === "true" && validatedBody.enable_rcr;

          if (isRCREnabled) {
            rcrContext = await getRCRContext( // Assign to the declared variable
              userId,
              validatedBody.roadmap_id || "electrician-bc",
              lastUserMessage.content,
              validatedBody.messages.slice(-10).map(msg => msg.content), // Last 10 messages for history
              validatedBody.selected_node_id, // nodeId
              nodeTitle, // nodeTitle
            );
            rcrContextPrompt = generateRCRContextPrompt(rcrContext);
          }
 
          const systemPrompt = `You are a helpful career guidance assistant for skilled trades in British Columbia, Canada.
 
 ${userContext}${nodeContext}${rcrContextPrompt}You have access to the following relevant information from the career roadmap database:
 
 ${embeddingsResponse.context}
 
 CRITICAL INSTRUCTIONS:
 1. ONLY use information from the provided context above. Do not use any external knowledge or make assumptions.
 2. If the context does not contain sufficient information to answer the user's question, explicitly state: "I don't have enough information in the provided sources to answer this question."
 3. Cite your sources using the format [Source: Title] when referencing specific information.
 4. When multiple sources are relevant, cite each one appropriately.
 5. Do not provide general guidance or advice that is not directly supported by the provided context.
 6. Be precise and accurate - if you're not certain about information from the context, acknowledge the limitation.
 
 Example citation format:
 - "According to the Foundation Program [Source: Electrician Foundation], students receive 375 work-based training hours."
 - "The requirements include [Source: Level 1] completion of technical training."
 
 Provide personalized guidance based strictly on the user's current situation and the step they're asking about, using only the information provided in the context.`;
 
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
                
                // Decode the raw content from the model
                const rawContent = new TextDecoder().decode(value);
                
                // Clean the content by removing Gemini's internal formatting tokens
                const cleanedContent = rawContent.replace(/f:\{.*?\}|0:"|"|e:\{.*?\}|d:\{.*?\}/g, "");
                
                // Capture the cleaned content
                aiResponseContent += cleanedContent;
                
                // If there's cleaned content, wrap it in AI SDK message event format and enqueue
                if (cleanedContent.trim()) {
                  const messageEvent = `data: ${JSON.stringify({ content: cleanedContent })}\n\n`;
                  controller.enqueue(encoder.encode(messageEvent));
                }
              }
            } finally {
              reader.releaseLock();
              // Update RCR context with the latest interaction, only if RCR was enabled
              if (isRCREnabled && rcrContext?.conversationThreadId && rcrContext?.conversationMessageId) {
                await updateRCRContext(
                  userId,
                  validatedBody.roadmap_id || "electrician-bc",
                  lastUserMessage.content, // userMessageContent
                  aiResponseContent, // assistantResponse
                  rcrContext.conversationThreadId,
                  rcrContext.conversationMessageId,
                  validatedBody.selected_node_id, // nodeId
                  nodeTitle, // nodeTitle
                );
              }

              // Save assistant message
              if (conversationId && userId) {
                await db.conversationMessage.create({
                  data: {
                    threadId: conversationId,
                    role: "assistant",
                    content: aiResponseContent,
                    nodeId: validatedBody.selected_node_id,
                  },
                });
              }
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
    const { userId } = await auth();
    logger.error("Chat API error", error, {
      identifier: getRequestIdentifier(req, userId),
    });

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return Response.json(
          { error: "Request timeout - embeddings API took too long" },
          { status: 504 },
        );
      }

      // Handle Redis/connection errors
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("Redis") ||
        error.message.includes("Connection refused")
      ) {
        return Response.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 },
        );
      }

      // Handle rate limit errors
      if (error.message.includes("rate limit")) {
        return Response.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 },
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
