import { StreamData, streamText } from "ai";
import { type NextRequest } from "next/server";
import { z } from "zod";
import type { ChatThread } from "@prisma/client";

import { queryEmbeddings, getActiveBackend } from "@/lib/embeddings-hybrid";
import { env } from "@/env";
import { getChatModel } from "@/lib/ai-model";
import { logger } from "@/lib/logger";
import { chatRateLimit } from "@/lib/rate-limit";
import { getCookieName } from "@/lib/user-identifier";
import { loadNodeContent } from "@/lib/roadmap-loader";
import { db } from "@/server/db";
import { buildMessagePreview, deriveThreadTitle } from "@/lib/chat-threads";

import { createCustomNode } from "@/lib/custom-nodes";
import { loadRoadmapGraph } from "@/lib/roadmap-loader";
import { auth } from "@clerk/nextjs/server";
import stringSimilarity from "string-similarity";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(10000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  roadmap_id: z.string().optional(),
  selected_node_id: z.string().optional(),
  thread_id: z.string().optional(),
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

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const SESSION_IDLE_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes
const MAX_MESSAGES_PER_SESSION = 30;

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

function formatStreamErrorMessage(
  error: unknown,
  userId: string | null,
): string {
  if (error instanceof Error) {
    logger.error("Chat stream error", error, { userId });
    return error.message;
  }

  if (typeof error === "string") {
    logger.error("Chat stream error", undefined, {
      userId,
      rawError: error,
    });
    return error;
  }

  logger.error("Chat stream error", undefined, { userId, rawError: error });
  return "An unexpected error occurred";
}

async function getOrCreateChatSession(
  userId: string,
  roadmapId?: string | null,
) {
  const existingSession = await db.chatSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
    include: {
      messages: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (existingSession) {
    const lastInteraction =
      existingSession.messages[0]?.createdAt ?? existingSession.startedAt;
    const isFresh =
      lastInteraction &&
      Date.now() - lastInteraction.getTime() <= SESSION_IDLE_TIMEOUT_MS;

    if (isFresh) {
      if (!existingSession.roadmapId && roadmapId) {
        await db.chatSession.update({
          where: { id: existingSession.id },
          data: { roadmapId },
        });
        return { ...existingSession, roadmapId };
      }
      return existingSession;
    }

    await db.chatSession.update({
      where: { id: existingSession.id },
      data: { endedAt: new Date() },
    });
  }

  return db.chatSession.create({
    data: {
      userId,
      roadmapId: roadmapId ?? null,
    },
  });
}

export async function POST(req: NextRequest) {
  let dataStream: StreamData | null = null;
  let currentUserId: string | null = null;

  try {
    const { userId, isAuthenticated } = await auth();
    currentUserId = userId;

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
    if (!userId || !isAuthenticated) {
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
    const threadId = validatedBody.thread_id ?? null;
    let threadForPersistence:
      | (ChatThread & {
          _count: { messages: number };
        })
      | null = null;

    if (threadId) {
      threadForPersistence = await db.chatThread.findFirst({
        where: { id: threadId, userId, deletedAt: null },
        include: { _count: { select: { messages: true } } },
      });

      if (!threadForPersistence) {
        return Response.json(
          { error: "Chat thread not found" },
          { status: 404 },
        );
      }
    }

    const lastUserMessage = validatedBody.messages
      .filter((msg) => msg.role === "user")
      .slice(-1)[0];

    if (!lastUserMessage) {
      return Response.json({ error: "No user message found" }, { status: 400 });
    }

    const defaultRoadmapId = validatedBody.roadmap_id ?? "global";
    const session = await getOrCreateChatSession(userId, defaultRoadmapId);
    const sessionId = session.id;

    await db.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: lastUserMessage.content,
        metadata: {
          roadmapId: validatedBody.roadmap_id,
          selectedNodeId: validatedBody.selected_node_id,
          userProfile: validatedBody.user_profile ?? null,
        },
      },
    });

    if (threadForPersistence) {
      const createdThreadMessage = await db.chatThreadMessage.create({
        data: {
          threadId: threadForPersistence.id,
          role: "user",
          content: lastUserMessage.content,
        },
      });

      const shouldAutoRename =
        (threadForPersistence._count?.messages ?? 0) === 0;

      await db.chatThread.update({
        where: { id: threadForPersistence.id },
        data: {
          lastMessageAt: createdThreadMessage.createdAt,
          messagePreview: buildMessagePreview(lastUserMessage.content),
          ...(shouldAutoRename
            ? { title: deriveThreadTitle(lastUserMessage.content) }
            : {}),
          ...(validatedBody.selected_node_id &&
          !threadForPersistence.selectedNodeId
            ? { selectedNodeId: validatedBody.selected_node_id }
            : {}),
          ...(validatedBody.roadmap_id && !threadForPersistence.roadmapId
            ? { roadmapId: validatedBody.roadmap_id }
            : {}),
        },
      });

      threadForPersistence = {
        ...threadForPersistence,
        roadmapId:
          threadForPersistence.roadmapId ?? validatedBody.roadmap_id ?? null,
        selectedNodeId:
          threadForPersistence.selectedNodeId ??
          validatedBody.selected_node_id ??
          null,
        _count: {
          messages: (threadForPersistence._count?.messages ?? 0) + 1,
        },
      };
    }

    const activeBackend = getActiveBackend();
    logger.info("Using embeddings backend", {
      backend: activeBackend,
      roadmapId: validatedBody.roadmap_id,
    });

    dataStream = new StreamData();
    dataStream.append({
      type: "status",
      message: "Preparing roadmap context...",
    });

    const embeddingsResponse = await queryEmbeddings({
      query: lastUserMessage.content,
      roadmap_id: validatedBody.roadmap_id,
      top_k: validatedBody.top_k ?? 5,
    });

    logger.info("Retrieved embeddings successfully", {
      backend: activeBackend,
      sourcesCount: embeddingsResponse.sources.length,
    });

    const normalizedSources = embeddingsResponse.sources.map((source) => ({
      node_id: source.node_id,
      title: source.title,
      score: source.score,
      text_snippet: source.text_snippet,
    }));

    const metadataPayload: JsonValue = {
      type: "metadata",
      roadmapId: embeddingsResponse.roadmap_id,
      sources: normalizedSources,
    };
    dataStream.append(metadataPayload);
    dataStream.append({
      type: "status",
      message: "Generating response...",
    });
    await dataStream.close();

    let userContext = "";
    if (validatedBody.user_profile) {
      const { trade, currentLevel, specialization, residencyStatus } =
        validatedBody.user_profile;
      const contextParts = [];

      if (trade) contextParts.push(`Trade: ${trade}`);
      if (currentLevel) contextParts.push(`Current Level: ${currentLevel}`);
      if (specialization)
        contextParts.push(`Specialization: ${specialization}`);
      if (residencyStatus)
        contextParts.push(`Residency Status: ${residencyStatus}`);

      if (contextParts.length > 0) {
        userContext = `User Profile:\n${contextParts.join("\n")}\n\n`;
      }
    }

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
              .find((line) => line.startsWith("#") === false && line.trim())
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

    const result = streamText({
      model: getChatModel(),
      system: `${systemPrompt}

You also have a tool called 'createNode' that you can use to create personalized checklist items, resources, or other nodes on the user's roadmap.
If the user asks for a specific step, resource, or reminder that isn't in the standard roadmap, USE THIS TOOL to create it for them.
Don't just tell them about it - actually create the node so they can see it.
When you create a node, tell the user you have done so.`,
      messages: validatedBody.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      maxTokens: 1024,
      maxSteps: 5,
      tools: {
        createNode: {
          description:
            "Create a new personalized node on the roadmap for the user. Use this when the user asks for a custom step, resource, or task that isn't already in the roadmap.",
          parameters: z.object({
            title: z.string().describe("The title of the new node"),
            description: z
              .string()
              .describe("A brief description of what this node represents"),
            parentId: z
              .string()
              .describe(
                "The ID of the existing node to attach this new node to. This should be the most relevant nearby node. You can provide multiple comma-separated IDs to attach to multiple parents (e.g., 'Level 4, Red Seal').",
              ),
            type: z
              .enum(["checklist", "resource", "action", "roadblock"])
              .describe("The type of node to create"),
          }),
          execute: async ({
            title,
            description,
            parentId,
            type,
          }: {
            title: string;
            description: string;
            parentId: string;
            type: "checklist" | "resource" | "action" | "roadblock";
          }) => {
            if (!currentUserId) {
              return "Error: User must be authenticated to create nodes.";
            }
            try {
              const roadmapId = validatedBody.roadmap_id ?? "electrician-bc";
              const graph = await loadRoadmapGraph(roadmapId);

              // Process multiple parent IDs
              const requestedParentIds = parentId
                .split(",")
                .map((p: string) => p.trim());
              const resolvedParentIds: string[] = [];

              for (const requestedId of requestedParentIds) {
                let resolvedId = requestedId;
                const exactMatch = graph.nodes.find(
                  (n) => n.id === requestedId,
                );

                if (!exactMatch) {
                  // Special case overrides for common terms
                  const overrides: Record<string, string> = {
                    "Level 1": "level-1",
                    "Level 2": "level-2",
                    "Level 3": "level-3",
                    "Red Seal": "red-seal-construction",
                    Foundation: "foundation-program",
                    "Foundation Program": "foundation-program",
                    "Direct Entry": "direct-entry",
                  };

                  const override = overrides[requestedId];
                  if (override) {
                    resolvedId = override;
                    logger.info(
                      `Mapped parentId "${requestedId}" to "${resolvedId}" via overrides`,
                    );
                  } else if (
                    requestedId.toLowerCase() === "level 4" ||
                    requestedId === "level-4"
                  ) {
                    // Special handling for Level 4: respect user specialization
                    if (
                      validatedBody.user_profile?.specialization ===
                      "industrial"
                    ) {
                      resolvedId = "level-4-industrial";
                    } else {
                      resolvedId = "level-4-construction";
                    }
                    logger.info(
                      `Mapped Level 4 to "${resolvedId}" based on specialization`,
                    );
                  } else if (requestedId.toLowerCase() === "red seal") {
                    // Special handling for Red Seal as well
                    if (
                      validatedBody.user_profile?.specialization ===
                      "industrial"
                    ) {
                      resolvedId = "red-seal-industrial";
                    } else {
                      resolvedId = "red-seal-construction";
                    }
                  } else {
                    // Find best fuzzy match
                    const nodeIds = graph.nodes.map((n) => n.id);
                    const matches = stringSimilarity.findBestMatch(
                      requestedId,
                      nodeIds,
                    );

                    if (matches.bestMatch.rating > 0.25) {
                      resolvedId = matches.bestMatch.target;
                      logger.info(
                        `Fuzzy matched parentId "${requestedId}" to "${resolvedId}"`,
                      );
                    } else {
                      // Fallback only if it's the only parent requested
                      if (requestedParentIds.length === 1) {
                        resolvedId = "direct-entry";
                        logger.warn(
                          `No good match for parentId "${requestedId}", falling back to "direct-entry"`,
                        );
                      } else {
                        // If multiple parents, just skip bad ones or keep as is?
                        // Keeping as is might break frontend if it can't find it.
                        // Let's skip adding it to resolved list if it's bad?
                        // Or fallback to direct-entry?
                        // Let's log warning and skip it to avoid cluttering direct-entry
                        logger.warn(
                          `Skipping unresolvable parent ID "${requestedId}" in multi-parent request`,
                        );
                        continue;
                      }
                    }
                  }
                }
                resolvedParentIds.push(resolvedId);
              }

              // If we lost all parents due to resolution failure, fallback to direct-entry
              if (resolvedParentIds.length === 0) {
                resolvedParentIds.push("direct-entry");
              }

              const finalParentId = resolvedParentIds.join(",");

              await createCustomNode(currentUserId, {
                roadmapId,
                parentId: finalParentId,
                title,
                description,
                type,
              });
              return `Successfully created new node "${title}" attached to parent(s) "${finalParentId}" (originally requested "${parentId}"). The user can now see this on their roadmap.`;
            } catch (error) {
              logger.error("Failed to create custom node", error);
              return "Error: Failed to create node. Please ensure the parent node ID is valid.";
            }
          },
        },
      },
      onFinish: async ({ text, sources, usage, finishReason }) => {
        try {
          await db.chatMessage.create({
            data: {
              sessionId,
              role: "assistant",
              content: text ?? "",
              metadata: {
                roadmapId: embeddingsResponse.roadmap_id,
                retrievedSources: normalizedSources,
                modelSources: sources ?? null,
                usage,
                finishReason,
              },
            },
          });

          if (threadForPersistence) {
            const assistantThreadMessage = await db.chatThreadMessage.create({
              data: {
                threadId: threadForPersistence.id,
                role: "assistant",
                content: text ?? "",
                sources: normalizedSources,
              },
            });

            await db.chatThread.update({
              where: { id: threadForPersistence.id },
              data: {
                lastMessageAt: assistantThreadMessage.createdAt,
                messagePreview: buildMessagePreview(text ?? ""),
              },
            });
          }

          if (
            !session.endedAt &&
            validatedBody.messages.length >= MAX_MESSAGES_PER_SESSION
          ) {
            await db.chatSession.update({
              where: { id: sessionId },
              data: { endedAt: new Date() },
            });
          }
        } catch (persistenceError) {
          logger.error(
            "Failed to persist assistant response",
            persistenceError,
            {
              sessionId,
            },
          );
        }

        logger.info("Chat completion finished", {
          provider: env.AI_PROVIDER,
          model: env.AI_MODEL,
          userId,
        });
      },
    });

    const response = result.toDataStreamResponse({
      data: dataStream ?? undefined,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
      getErrorMessage: (streamError) =>
        formatStreamErrorMessage(streamError, currentUserId),
    });

    response.headers.set("X-User-Id", userId);
    return response;
  } catch (error) {
    if (dataStream) {
      try {
        await dataStream.close();
      } catch {
        // ignore - stream might already be closed
      }
    }

    logger.error("Chat API error", error, {
      identifier: getRequestIdentifier(req, currentUserId),
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
