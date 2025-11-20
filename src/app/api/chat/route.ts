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

INSTRUCTIONS:
1. Prioritize information from the provided context above, but you can provide helpful guidance even when context is limited.
2. When the user asks to create a custom node (checklist, reminder, tracker), use the createNode tool to help them.
3. If you need clarification before answering or creating something, ask questions conversationally. Use phrases like:
   - "Before I help with that, could you tell me..."
   - "To make this more useful for you, what..."
   - "Just to clarify..."
4. Cite your sources using the format [Source: Title] when using specific information from the context.
5. Be conversational and helpful. Don't say "I don't have enough information" - instead, ask clarifying questions or offer to create something custom.

Example citation format:
- "According to the Foundation Program [Source: Electrician Foundation], students receive 375 work-based training hours."
- "The requirements include [Source: Level 1] completion of technical training."

Provide personalized guidance based on the user's current situation. When they want to track something or add a custom step, use the createNode tool to help them organize their learning journey.`;

    const result = streamText({
      model: getChatModel(),
      system: `${systemPrompt}

You have a 'createNode' tool to help users create personalized checklist items, resources, or trackers on their roadmap.

WHEN TO USE createNode:
- User wants to track something (e.g., "track my exam prep", "remind me to...", "I need to study...")
- User mentions specific tasks, topics, or goals they want to organize
- User provides resource links or mentions deadlines

HOW TO USE createNode:
- For parentId: Use the most relevant roadmap milestone (e.g., "Red Seal", "Level 4", "Foundation Program")
  * If the user mentions a specific level or milestone, use that
  * If unclear, ask: "Where on your roadmap would you like this? For example, is this for Level 4, Red Seal prep, or something else?"
- If the user provides rich details (tasks, resources, deadlines), extract them into the tool parameters
- If details are minimal, either:
  a) Ask clarifying questions, OR
  b) Create a basic node and tell them they can add more details later

Example (user provides details):
User: "I want to prepare for my Red Seal exam. I need to study transformers, motor controls, and PLC programming. I have the ITA study guide at https://itabc.ca/study-guide and want to finish by June 2025."
You: *Call createNode with all the details* → "I've created a Red Seal Exam Prep tracker for you with 3 study topics, your ITA study guide link, and a June 2025 target date. You can see it on your roadmap now!"

Example (user provides minimal info):
User: "Remind me to renew my safety tickets"
You: *Call createNode with basic info* → "I've added a reminder to renew your safety tickets. Before I finalize this, when do they expire?"`,
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
            checklistItems: z
              .array(z.string())
              .optional()
              .describe(
                "List of specific tasks or sub-items to track (e.g., ['Study transformers', 'Review motor controls', 'Practice PLC programming'])",
              ),
            resources: z
              .array(
                z.object({
                  label: z.string(),
                  href: z.string().url(),
                }),
              )
              .optional()
              .describe(
                "List of helpful resources with labels and URLs (e.g., [{ label: 'ITA Study Guide', href: 'https://...' }])",
              ),
            notes: z
              .string()
              .optional()
              .describe("Additional free-form notes or context"),
            dueDate: z
              .string()
              .optional()
              .describe(
                "Target completion date if applicable (ISO format or natural language)",
              ),
          }),
          execute: async ({
            title,
            description,
            parentId,
            type,
            checklistItems,
            resources,
            notes,
            dueDate,
          }: {
            title: string;
            description: string;
            parentId: string;
            type: "checklist" | "resource" | "action" | "roadblock";
            checklistItems?: string[];
            resources?: Array<{ label: string; href: string }>;
            notes?: string;
            dueDate?: string;
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
                  // Special case overrides for common terms (non-specialization-dependent)
                  const overrides: Record<string, string> = {
                    "Level 1": "level-1",
                    "Level 2": "level-2",
                    "Level 3": "level-3",
                    // Note: "Red Seal" and "Level 4" removed - handled by specialization logic below
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
                    const specialization =
                      validatedBody.user_profile?.specialization;

                    if (!specialization) {
                      // No specialization: attach to BOTH variants (multi-parent)
                      resolvedParentIds.push("level-4-industrial");
                      resolvedParentIds.push("level-4-construction");
                      logger.info(
                        `Level 4 → Multi-parent (no specialization): level-4-industrial, level-4-construction`,
                      );
                      continue; // Skip adding resolvedId to list since we already added both
                    } else if (specialization === "industrial") {
                      resolvedId = "level-4-industrial";
                      logger.info(
                        `Level 4 → level-4-industrial (user specialization: industrial)`,
                      );
                    } else {
                      resolvedId = "level-4-construction";
                      logger.info(
                        `Level 4 → level-4-construction (user specialization: ${specialization})`,
                      );
                    }
                  } else if (requestedId.toLowerCase() === "red seal") {
                    // Special handling for Red Seal: respect user specialization
                    const specialization =
                      validatedBody.user_profile?.specialization;

                    if (!specialization) {
                      // No specialization: attach to BOTH variants (multi-parent)
                      resolvedParentIds.push("red-seal-industrial");
                      resolvedParentIds.push("red-seal-construction");
                      logger.info(
                        `Red Seal → Multi-parent (no specialization): red-seal-industrial, red-seal-construction`,
                      );
                      continue; // Skip adding resolvedId to list since we already added both
                    } else if (specialization === "industrial") {
                      resolvedId = "red-seal-industrial";
                      logger.info(
                        `Red Seal → red-seal-industrial (user specialization: industrial)`,
                      );
                    } else {
                      resolvedId = "red-seal-construction";
                      logger.info(
                        `Red Seal → red-seal-construction (user specialization: ${specialization})`,
                      );
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

              // Build rich content object
              const content: Record<string, unknown> = {};
              if (checklistItems && checklistItems.length > 0) {
                content.checklistItems = checklistItems.map((item, index) => ({
                  id: `item-${index + 1}`,
                  title: item,
                  completed: false,
                }));
              }
              if (resources && resources.length > 0) {
                content.resources = resources;
              }
              if (notes) {
                content.notes = notes;
              }
              if (dueDate) {
                content.dueDate = dueDate;
              }

              await createCustomNode(currentUserId, {
                roadmapId,
                parentId: finalParentId,
                title,
                description,
                type,
                content: Object.keys(content).length > 0 ? content : undefined,
              });

              // Build success message with details
              let successMsg = `Successfully created "${title}" attached to ${finalParentId}`;
              if (checklistItems && checklistItems.length > 0) {
                successMsg += ` with ${checklistItems.length} checklist items`;
              }
              if (resources && resources.length > 0) {
                successMsg += ` and ${resources.length} resources`;
              }
              successMsg += ". The user can now see this on their roadmap.";

              return successMsg;
            } catch (error) {
              logger.error("Failed to create custom node", error);
              // Don't expose technical errors - ask for clarification instead
              return `I had trouble placing that on your roadmap. Could you tell me which part of your journey this relates to? For example:
- Foundation Program or Direct Entry?
- Level 1, 2, 3, or 4?
- Red Seal preparation?
- Something else?`;
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
