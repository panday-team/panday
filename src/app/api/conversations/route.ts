import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Schema for creating a new conversation
const createConversationSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
  initialMessage: z.string().optional(),
  roadmapId: z.string().optional(),
  nodeId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    logger.warn("Unauthorized attempt to access conversations: No userId");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Manually define the type as Prisma.ConversationThreadGetPayload is not directly exported
    type ConversationWithMessages = {
      id: string;
      userId: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
      roadmapId: string | null;
      nodeId: string | null;
      messages: {
        id: string;
        conversationId: string;
        content: string;
        role: "user" | "assistant";
        createdAt: Date;
        updatedAt: Date;
        roadmapId: string | null;
        nodeId: string | null;
      }[];
    };

    const conversations = (await db.conversationThread.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1, // Only fetch the first message for a preview
        },
      },
    })) as ConversationWithMessages[];

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessagePreview: conv.messages[0]?.content || "No messages yet",
      roadmapId: conv.roadmapId,
      nodeId: conv.nodeId,
    }));

    logger.info("Conversations fetched successfully", { userId, count: formattedConversations.length });
    return NextResponse.json(formattedConversations);
  } catch (error) {
    logger.error("Failed to fetch conversations", error, { userId });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    logger.warn("Unauthorized attempt to create conversation: No userId");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, initialMessage, roadmapId, nodeId } = createConversationSchema.parse(body);

    const newConversation = await db.conversationThread.create({
      data: {
        userId,
        title,
        roadmapId,
        nodeId,
        messages: initialMessage
          ? {
              create: {
                content: initialMessage,
                role: "user",
                roadmapId,
                nodeId,
              },
            }
          : undefined,
      },
      include: {
        messages: true,
      },
    });

    logger.info("Conversation created successfully", { userId, conversationId: newConversation.id, title });
    return NextResponse.json(newConversation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid input for conversation creation", { errors: error.errors, userId });
      return new NextResponse(error.message, { status: 400 });
    }
    logger.error("Failed to create conversation", error, { userId });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}