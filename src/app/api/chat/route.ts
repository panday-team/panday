import { StreamData, streamText, type Message } from "ai";
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
import { APP_CONFIG } from "@/config/app-config";

import {
  createCustomNode,
  updateCustomNode,
  deleteCustomNode,
  getCustomNodes,
} from "@/lib/custom-nodes";
import { loadRoadmapGraph } from "@/lib/roadmap-loader";
import { auth } from "@clerk/nextjs/server";
import stringSimilarity from "string-similarity";

// Tool invocation schema for human-in-the-loop tools
const ToolInvocationSchema = z.object({
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()).optional(),
  state: z.enum(["partial-call", "call", "result"]),
  result: z.unknown().optional(),
});

const ChatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system", "data"]),
  content: z.string().max(10000),
  // Include tool invocations for human-in-the-loop pattern
  toolInvocations: z.array(ToolInvocationSchema).optional(),
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

const SESSION_IDLE_TIMEOUT_MS = APP_CONFIG.chat.sessionIdleTimeout;
const MAX_MESSAGES_PER_SESSION = APP_CONFIG.chat.maxMessagesPerSession;

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
      ...(source.excerpt && { excerpt: source.excerpt }),
      ...(source.section_heading && {
        section_heading: source.section_heading,
      }),
      ...(source.url && { url: source.url }),
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
    // NOTE: Do NOT close dataStream here - it must remain open during streaming
    // The stream will be closed automatically by toDataStreamResponse

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

    // Inject user's current level content as additional context for the AI
    // Note: We add this to the system prompt so the AI has personalized context,
    // but we DON'T add it as a fake high-relevance source. The embeddings system
    // will naturally include it in sources if the user's query is actually relevant
    // to their current level content.
    let levelContext = "";
    if (validatedBody.user_profile?.currentLevel && validatedBody.roadmap_id) {
      try {
        // Normalize level ID (e.g., "2" -> "level-2", "level-2" -> "level-2")
        const rawLevel = validatedBody.user_profile.currentLevel;
        const levelId = rawLevel.startsWith("level-")
          ? rawLevel
          : `level-${rawLevel}`;

        const levelContent = await loadNodeContent(
          validatedBody.roadmap_id,
          levelId,
        );

        if (levelContent) {
          // Add the level content as context for the AI (but not as a displayed source)
          levelContext = `Your Current Level (${levelContent.frontmatter.title}):\n${levelContent.content}\n\n`;
        }
      } catch (error) {
        // Silent fail - level content is supplementary, not critical
        logger.debug("Failed to load current level content", {
          error: error instanceof Error ? error.message : String(error),
          currentLevel: validatedBody.user_profile.currentLevel,
          roadmapId: validatedBody.roadmap_id,
        });
      }
    }

    const systemPrompt = `You are a helpful career guidance assistant for skilled trades in British Columbia, Canada.

${userContext}${levelContext}${nodeContext}You have access to the following relevant information from the career roadmap database:

${embeddingsResponse.context}

RESPONSE LENGTH - CRITICAL:
- Keep responses CONCISE: aim for 150-250 words maximum
- Use bullet points for lists (max 5 items)
- ALWAYS complete your thought - never end mid-sentence

INFORMATION vs ACTION - CRITICAL DISTINCTION:
- **INFORMATIONAL queries** (user asks "what", "how", "explain", "break down", "can you tell me"): 
  → Provide a helpful, detailed TEXT response. Do NOT create nodes.
  → These are questions seeking knowledge, not tracking tools.
  → Example: "Can you break down what counts as apprenticeship hours?" → Answer in text only
  → Example: "How does the Red Seal exam work?" → Answer in text only
  → Example: "What documentation do I need?" → Answer in text only
- **ACTIONABLE requests** (user wants to track, create, organize, remind):
  → Use proposeNode to create a trackable checklist
  → Example: "Create a checklist for my Level 2 prep" → Use proposeNode
  → Example: "Help me track my exam study topics" → Use proposeNode
  → Example: "Remind me to renew my safety tickets" → Use proposeNode

RESPONSE FORMAT:
- IMPORTANT: Always write your text response BEFORE calling any tools!

WHEN CREATING NODES (only when user explicitly requests tracking):
- First: Write a brief explanation in chat (1-2 sentences)
- Then: Call proposeNode tool with comprehensive details
- Node content: Contains the full detailed breakdown with all steps, requirements, timelines, etc.
- The node's checklistItems should be COMPREHENSIVE (5-10 items if needed)
- The node's description should explain the overall goal

INSTRUCTIONS:
1. Prioritize information from the provided context above.
2. ALWAYS write your text response FIRST, then call tools (if needed).
3. ONLY use proposeNode when user EXPLICITLY asks to track/create/organize something.
4. For informational questions (what/how/explain), answer in TEXT ONLY - no node creation.
5. CITATION RULES: Use exact titles from context blocks. Format: [Source: Exact Title]
6. Be conversational. Don't say "I don't have enough information" - offer helpful guidance.
7. DO NOT apologize for tool execution. Simply confirm successful results briefly.`;

    const result = streamText({
      model: getChatModel(),
      system: `${systemPrompt}

You have tools to help users manage their personalized roadmap nodes: 'listCustomNodes', 'proposeNode', 'createNode', 'updateNode', and 'deleteNode'.

CRITICAL: ALWAYS call 'listCustomNodes' FIRST before creating any new nodes to avoid duplicates!

TOOL SELECTION - CRITICAL RULES:
- **proposeNode**: ALWAYS use this tool to create nodes. NEVER use createNode. proposeNode shows an interactive card where users can review, edit, and accept/decline. The frontend creates the node when they accept.
- **createNode**: DEPRECATED - DO NOT USE THIS TOOL. Always use proposeNode instead.
- **NEVER ask "would you like me to create a checklist?" or similar questions**. Instead, just call proposeNode! The card itself gives users the choice to accept or decline.

CRITICAL - RESPONSE ORDER:
When using proposeNode, you MUST output your text explanation FIRST, then call the tool AFTER.
The user should see your explanation before they see the proposal card.

CORRECT ORDER:
1. First: Write your text response explaining the steps/requirements
2. Then: Call proposeNode with the checklist details

WRONG ORDER (don't do this):
1. Call proposeNode first
2. Then write explanation after

WHEN TO USE proposeNode (ONLY for actionable tracking requests):
- User EXPLICITLY asks to create, track, or organize something → Use proposeNode
- User says "yes", "sure", "ok", "please", "do it" after you OFFERED to create → Call proposeNode
- User says "create a checklist", "help me track", "remind me" → Use proposeNode
- DO NOT ask "want me to create...?" - just use proposeNode and let the card do the asking!

WHEN NOT TO USE proposeNode (CRITICAL - most questions are informational):
- User asks "what", "how", "explain", "break down", "can you tell me" → TEXT ONLY, no node
- User asks about requirements, steps, or processes without mentioning tracking → TEXT ONLY
- User asks general questions about trades, exams, or regulations → TEXT ONLY
- Example: "What counts as apprenticeship hours?" → Answer in text, do NOT create a node
- Example: "How does employer hour logging work?" → Answer in text, do NOT create a node
- Even if the answer has multiple steps, if user didn't ask to TRACK them, don't create a node

WHEN TO USE createNode:
- NEVER. This tool is deprecated. Always use proposeNode instead.

WHEN TO USE listCustomNodes:
- BEFORE creating any new node (to check for duplicates)
- When user mentions existing nodes or asks "what did I create?"
- When you need to reference a node ID for updates/deletes

WHEN TO USE updateNode:
- User wants to modify an existing custom node
- Get the node ID from listCustomNodes first if you don't have it

WHEN TO USE deleteNode:
- User wants to remove a SPECIFIC custom node by ID
- Get the node ID from listCustomNodes first if you don't have it

WHEN TO USE deleteDuplicateNodes:
- User mentions duplicates or you detect multiple nodes with the same title
- This automatically keeps the most recent and deletes the rest

PARENT SELECTION LOGIC:
- **DEFAULT TO USER'S CURRENT LEVEL** for general tasks/reminders
  * User's current level is: ${validatedBody.user_profile?.currentLevel ?? "Level 2"}
  * Use the exact level node ID format: "level-1", "level-2", "level-3", "level-4", etc.
  
- **Use specific milestone** ONLY when the user explicitly mentions it:
  * "Red Seal exam prep" → use "red-seal-construction" or "red-seal-industrial"
  * "Foundation Program" → use "foundation-program"
  * "Level 3 training" → use "level-3"

- RESOURCES FIELD: Only include if you have REAL, VALID URLs. Pass null otherwise.
  VERIFIED BC TRADES URLS (use these exact patterns - last verified Dec 2024):
  - SkilledTradesBC Electrician: https://skilledtradesbc.ca/electrician-construction
  - Find Your Trade: https://skilledtradesbc.ca/find-your-trade
  - Foundation Programs: https://skilledtradesbc.ca/foundation-programs
  - Start Apprenticeship: https://skilledtradesbc.ca/start-an-apprenticeship
  - Financial Support: https://skilledtradesbc.ca/financial-support
  - Youth Programs: https://skilledtradesbc.ca/youth
  - Exam Info: https://skilledtradesbc.ca/get-certified/about-exams
  - Exam Schedule: https://skilledtradesbc.ca/exam-schedule
  - Challenge Trade: https://skilledtradesbc.ca/challenge-skilled-trade
  - Training Providers: https://skilledtradesbc.ca/all-approved-training-providers-list
  - Portal: https://portal.skilledtradesbc.ca
  - Red Seal Electrician: https://www.red-seal.ca/trades/elec-eng.html
  - WorkBC Electrician: https://www.workbc.ca/career-profiles/electricians-except-industrial-and-power-system
  - WorkBC Find Jobs: https://www.workbc.ca/search-and-prepare-job/find-jobs
  - WorkBC Centres: https://www.workbc.ca/discover-employment-services/workbc-centre-locations
  DO NOT use old paths like /become-an-apprentice/foundation-programs, /Job-Seekers/, or /browse-career-profile/7241 - they're 404s!

EXAMPLE FLOWS:

INFORMATIONAL QUERY (no node creation):
User: "What are the steps to become a Level 2 apprentice?"
You: "To reach Level 2 in BC, you need to: 1) complete Level 1 technical training, 2) log roughly 1,800 on-the-job hours with employer sign-off, and 3) register for Level 2 intake with SkilledTradesBC."
→ DO NOT call proposeNode - this is an informational question

User: "Can you break down what counts as apprenticeship hours?"
You: [Detailed text explanation of hour types, logging requirements, etc.]
→ DO NOT call proposeNode - user asked for information, not tracking

ACTIONABLE REQUEST (use proposeNode):
User: "Create a checklist to track my Level 2 progress"
You: "I'll create a Level 2 progress tracker for you."
→ THEN call proposeNode with title="Level 2 Progress Tracker", checklistItems=[...]

User: *clicks Accept*
→ You receive: { accepted: true, created: true, nodeId: "...", title: "Level 2 Progress Tracker" }
→ Say: "Done! Your Level 2 Progress Tracker is now on your roadmap."

User: *clicks Decline*
→ You receive: { accepted: false, reason: "User declined" }
→ Say: "No problem! Let me know if you'd like something different."

BAD EXAMPLES (don't do these):
1. Calling tool BEFORE writing text ← WRONG ORDER! Text must come first.
2. "Would you like me to create a checklist?" ← WRONG! Just call proposeNode.
3. Creating a node when user asked "what/how/explain" ← WRONG! Answer in text only.

IMPORTANT: NEVER expose internal node IDs in your responses. Use proposeNode to give users an interactive confirmation experience.`,
      // Cast to the expected type - the AI SDK accepts messages with toolInvocations
      messages: validatedBody.messages.map((msg) => {
        // Filter out "data" role messages which are deprecated
        if (msg.role === "data") {
          return { role: "system" as const, content: msg.content };
        }

        // Build the message matching AI SDK Message type (without id)
        const baseMessage = {
          role: msg.role,
          content: msg.content,
        };

        // Include tool invocations if present (for human-in-the-loop tools)
        if (msg.toolInvocations && msg.toolInvocations.length > 0) {
          return {
            ...baseMessage,
            toolInvocations: msg.toolInvocations,
          } as Omit<Message, "id">;
        }

        return baseMessage;
      }),
      // 1500 tokens (~1100 words) provides enough room for complete responses
      // while preventing excessively long outputs
      maxTokens: 1500,
      maxSteps: 5,
      tools: {
        createNode: {
          description:
            "Create a new personalized node on the roadmap for the user. Use this when the user asks for a custom step, resource, or task that isn't already in the roadmap.",
          parameters: z.object({
            title: z
              .string()
              .describe(
                "The title of the new node (max 100 characters). Keep it concise.",
              ),
            description: z
              .string()
              .describe(
                "A brief description of what this node represents (max 1000 characters).",
              ),
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
              .nullable()
              .describe(
                "List of specific tasks or sub-items to track (e.g., ['Study transformers', 'Review motor controls', 'Practice PLC programming']). Pass null if not applicable.",
              ),
            resources: z
              .array(
                z.object({
                  label: z.string(),
                  href: z
                    .string()
                    .describe("A valid URL starting with https:// or http://"),
                }),
              )
              .nullable()
              .describe(
                "List of helpful resources with labels and VALID URLs (e.g., [{ label: 'ITA Study Guide', href: 'https://www.itabc.ca/...' }]). IMPORTANT: Only include resources if you have real, valid URLs. DO NOT use placeholders like '#' or 'https://example.com'. Pass null if no real URLs are available.",
              ),
            notes: z
              .string()
              .nullable()
              .describe(
                "Additional free-form notes or context. Pass null if not applicable.",
              ),
            dueDate: z
              .string()
              .nullable()
              .describe(
                "Target completion date if applicable (ISO format or natural language). Pass null if not applicable.",
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
            checklistItems: string[] | null;
            resources: Array<{ label: string; href: string }> | null;
            notes: string | null;
            dueDate: string | null;
          }) => {
            if (!currentUserId) {
              return "Error: User must be authenticated to create nodes.";
            }

            // Validate and truncate fields before processing
            if (title.length > 100) {
              return `Tool execution failed: Title is too long (${title.length} chars, max 100). Please shorten the title and try again.`;
            }
            if (description.length > 1000) {
              return `Tool execution failed: Description is too long (${description.length} chars, max 1000). Please shorten the description and try again.`;
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
                    "ACE-IT": "ace-it-program",
                    "ACE IT": "ace-it-program",
                    ACEIT: "ace-it-program",
                    "Ace-It": "ace-it-program",
                    "Ace It": "ace-it-program",
                    "ace-it": "ace-it-program",
                    "ace it": "ace-it-program",
                    "ACE-IT Program": "ace-it-program",
                    "ACE IT Program": "ace-it-program",
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

              const createdNode = await createCustomNode(currentUserId, {
                roadmapId,
                parentId: finalParentId,
                title,
                description,
                type,
                content: Object.keys(content).length > 0 ? content : undefined,
              });

              // Stream the node ID to the client for viewport panning
              // Wrap in try-catch because stream might already be closed
              if (dataStream) {
                try {
                  dataStream.append({
                    type: "custom_node_created",
                    nodeId: createdNode.id,
                    parentId: finalParentId,
                  });
                } catch (streamError) {
                  // Stream already closed - not a critical error, just log it
                  logger.warn(
                    "Failed to append to data stream (stream closed)",
                    {
                      nodeId: createdNode.id,
                      error:
                        streamError instanceof Error
                          ? streamError.message
                          : String(streamError),
                    },
                  );
                }
              }

              // Build success message with details (ID hidden from user, but logged for debugging)
              logger.info("Custom node created", {
                nodeId: createdNode.id,
                title,
                parentId: finalParentId,
                userId: currentUserId,
              });

              let successMsg = `I've added "${title}" to your roadmap`;
              if (checklistItems && checklistItems.length > 0) {
                successMsg += ` with ${checklistItems.length} checklist items`;
              }
              if (resources && resources.length > 0) {
                successMsg += ` and ${resources.length} resource${resources.length > 1 ? "s" : ""}`;
              }
              successMsg += "!";

              // Internal note: Store node ID for future reference
              return `${successMsg} [Internal: Node ID ${createdNode.id} for future updates/deletes]`;
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              logger.error("Failed to create custom node", error, {
                title,
                titleLength: title.length,
                descriptionLength: description.length,
                parentId,
                type,
                userId: currentUserId,
                errorMessage: errorMsg,
              });
              // Return detailed error - AI should analyze and inform user or fix the issue
              return `Tool execution failed with error: ${errorMsg}. Do NOT retry with the same parameters. Either: 1) If the error mentions a specific validation issue (like invalid URL, too long, etc.), fix that specific issue, or 2) Inform the user there was a technical issue and ask them to try again later. Note: Title must be ≤100 chars, description ≤1000 chars.`;
            }
          },
        },
        updateNode: {
          description:
            "Update an existing custom node on the roadmap. Use this when the user wants to modify, correct, or move a node they previously created.",
          parameters: z.object({
            nodeId: z
              .string()
              .describe(
                "The ID of the custom node to update. This should be from a recently created or discussed node.",
              ),
            title: z
              .string()
              .nullable()
              .describe("Updated title. Pass null to keep unchanged."),
            description: z
              .string()
              .nullable()
              .describe("Updated description. Pass null to keep unchanged."),
            parentId: z
              .string()
              .nullable()
              .describe(
                "Updated parent ID to move the node to a different milestone. Pass null to keep unchanged.",
              ),
            type: z
              .enum(["checklist", "resource", "action", "roadblock"])
              .nullable()
              .describe("Updated node type. Pass null to keep unchanged."),
            checklistItems: z
              .array(z.string())
              .nullable()
              .describe(
                "Updated list of checklist items. Pass null to keep unchanged.",
              ),
            resources: z
              .array(
                z.object({
                  label: z.string(),
                  href: z
                    .string()
                    .describe("A valid URL starting with https:// or http://"),
                }),
              )
              .nullable()
              .describe(
                "Updated list of resources with VALID URLs. Only include if you have real URLs - do not use placeholders. Pass null to keep unchanged.",
              ),
            notes: z
              .string()
              .nullable()
              .describe("Updated notes. Pass null to keep unchanged."),
            dueDate: z
              .string()
              .nullable()
              .describe("Updated due date. Pass null to keep unchanged."),
          }),
          execute: async ({
            nodeId,
            title,
            description,
            parentId,
            type,
            checklistItems,
            resources,
            notes,
            dueDate,
          }: {
            nodeId: string;
            title: string | null;
            description: string | null;
            parentId: string | null;
            type: "checklist" | "resource" | "action" | "roadblock" | null;
            checklistItems: string[] | null;
            resources: Array<{ label: string; href: string }> | null;
            notes: string | null;
            dueDate: string | null;
          }) => {
            if (!currentUserId) {
              return "You must be signed in to update nodes. Please sign in and try again.";
            }

            try {
              // Build content object if any content fields are provided
              let content: Record<string, unknown> | undefined;
              if (checklistItems || resources || notes || dueDate) {
                content = {};
                if (checklistItems) {
                  content.checklistItems = checklistItems.map(
                    (item, index) => ({
                      id: `item-${index + 1}`,
                      title: item,
                      completed: false,
                    }),
                  );
                }
                if (resources) {
                  content.resources = resources;
                }
                if (notes) {
                  content.notes = notes;
                }
                if (dueDate) {
                  content.dueDate = dueDate;
                }
              }

              const updateData: {
                title?: string;
                description?: string;
                parentId?: string;
                type?: "checklist" | "resource" | "action" | "roadblock";
                content?: Record<string, unknown>;
              } = {};
              if (title) updateData.title = title;
              if (description) updateData.description = description;
              if (parentId) updateData.parentId = parentId;
              if (type) updateData.type = type;
              if (content) updateData.content = content;

              await updateCustomNode(currentUserId, nodeId, updateData);

              const updatedFields = Object.keys(updateData).join(", ");
              return `Successfully updated the node (${updatedFields}). The changes are now visible on your roadmap.`;
            } catch (error) {
              logger.error("Failed to update custom node", error);
              return `I had trouble updating that node. Could you try again or let me know which specific node you want to modify?`;
            }
          },
        },
        deleteNode: {
          description:
            "Delete a custom node from the roadmap. Use this when the user wants to remove a node they previously created.",
          parameters: z.object({
            nodeId: z
              .string()
              .describe(
                "The ID of the custom node to delete. This should be from a recently created or discussed node.",
              ),
          }),
          execute: async ({ nodeId }: { nodeId: string }) => {
            if (!currentUserId) {
              return "You must be signed in to delete nodes. Please sign in and try again.";
            }

            try {
              await deleteCustomNode(currentUserId, nodeId);

              return `Successfully deleted the node. It has been removed from your roadmap.`;
            } catch (error) {
              logger.error("Failed to delete custom node", error);
              return `I had trouble deleting that node. Could you try again or let me know which specific node you want to remove?`;
            }
          },
        },
        listCustomNodes: {
          description:
            "List all custom nodes the user has created on their roadmap. Use this BEFORE creating nodes to avoid duplicates and when you need to reference existing node IDs for updates/deletes.",
          parameters: z.object({}),
          execute: async () => {
            if (!currentUserId) {
              return "You must be signed in to view your custom nodes.";
            }

            try {
              const roadmapId = validatedBody.roadmap_id ?? "electrician-bc";
              const nodes = await getCustomNodes(currentUserId, roadmapId);

              if (nodes.length === 0) {
                return "You haven't created any custom nodes yet.";
              }

              // Build user-facing list (hide IDs) and internal reference list
              const nodeListForUser = nodes
                .map((node) => `- "${node.title}" (${node.type})`)
                .join("\n");

              const nodeListInternal = nodes
                .map((node) => `[ID: ${node.id}] "${node.title}"`)
                .join(", ");

              return `You have ${nodes.length} custom node(s):\n${nodeListForUser}\n\n[Internal reference: ${nodeListInternal}]`;
            } catch (error) {
              logger.error("Failed to list custom nodes", error);
              return "I had trouble retrieving your custom nodes.";
            }
          },
        },
        proposeNode: {
          description:
            "Propose a new node to the user for confirmation before creating it. Shows an interactive card where the user can review, edit, and accept or decline. Use this instead of createNode when you want to give the user a chance to customize the node before it's created. IMPORTANT: This tool requires human confirmation - execution pauses until user accepts or declines.",
          parameters: z.object({
            title: z
              .string()
              .describe(
                "The title of the proposed node (max 100 characters). Keep it concise.",
              ),
            description: z
              .string()
              .describe(
                "A brief description of what this node represents (max 1000 characters).",
              ),
            parentId: z
              .string()
              .describe(
                "The ID of the existing node to attach this new node to (e.g., 'level-2', 'red-seal-construction').",
              ),
            parentLabel: z
              .string()
              .describe(
                "Human-readable label for the parent node (e.g., 'Level 2', 'Red Seal (Construction)').",
              ),
            type: z
              .enum(["checklist", "resource", "action", "roadblock"])
              .describe("The type of node to create"),
            checklistItems: z
              .array(z.string())
              .nullable()
              .describe(
                "List of specific tasks or sub-items to track. Make this COMPREHENSIVE with 5-10 items for complex topics. Pass null if not applicable.",
              ),
            resources: z
              .array(
                z.object({
                  label: z.string(),
                  href: z
                    .string()
                    .describe("A valid URL starting with https:// or http://"),
                }),
              )
              .nullable()
              .describe(
                "List of helpful resources with labels and VALID URLs. Pass null if no real URLs are available.",
              ),
            notes: z
              .string()
              .nullable()
              .describe(
                "Additional free-form notes or context. Pass null if not applicable.",
              ),
            dueDate: z
              .string()
              .nullable()
              .describe(
                "Target completion date if applicable (ISO format or natural language). Pass null if not applicable.",
              ),
          }),
          // NO execute function - this makes it a human-in-the-loop tool
          // The frontend will show a confirmation card, and when user accepts/declines,
          // it sends the result back via addToolOutput + sendMessage
        },
        deleteDuplicateNodes: {
          description:
            "Automatically find and delete duplicate nodes with the same title, keeping only the most recent one. Use this when the user mentions duplicates or when you detect multiple nodes with the same title.",
          parameters: z.object({
            title: z
              .string()
              .describe(
                "The title of the duplicate nodes to clean up (e.g., 'Transformer Study Checklist')",
              ),
          }),
          execute: async ({ title }: { title: string }) => {
            if (!currentUserId) {
              return "You must be signed in to delete nodes.";
            }

            try {
              const roadmapId = validatedBody.roadmap_id ?? "electrician-bc";
              const nodes = await getCustomNodes(currentUserId, roadmapId);

              // Find all nodes with matching title (case-insensitive)
              const duplicates = nodes.filter(
                (node) => node.title.toLowerCase() === title.toLowerCase(),
              );

              if (duplicates.length === 0) {
                return `I couldn't find any nodes titled "${title}".`;
              }

              if (duplicates.length === 1) {
                return `There's only one "${title}" node, so no duplicates to remove.`;
              }

              // Sort by creation date (newest first) and keep the first one
              duplicates.sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
              );
              const toDelete = duplicates.slice(1); // Keep first (most recent), delete rest

              // Delete all but the most recent
              const userId = currentUserId; // Capture for closure
              await Promise.all(
                toDelete.map((node) => deleteCustomNode(userId, node.id)),
              );

              return `I found ${duplicates.length} "${title}" nodes and kept the most recent one, removing ${toDelete.length} duplicate(s). Your roadmap is now cleaned up!`;
            } catch (error) {
              logger.error("Failed to delete duplicate nodes", error);
              return `I had trouble cleaning up those duplicates. Please try again.`;
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

        // Close the data stream after streaming completes
        if (dataStream) {
          try {
            await dataStream.close();
          } catch {
            // Stream might already be closed
          }
        }
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
