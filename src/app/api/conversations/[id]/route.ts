import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Schema for validating conversation ID
const ConversationIdSchema = z.string().uuid("Invalid conversation ID format.");

// Schema for validating PATCH request body
const UpdateConversationSchema = z.object({
  title: z.string().min(1, "Title cannot be empty.").max(255, "Title is too long."),
});

/**
 * GET /api/conversations/[id]
 * Fetches a specific conversation and its messages.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();

  if (!userId) {
    logger.warn("GET /api/conversations/[id] - Unauthorized: No userId");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const conversationId = ConversationIdSchema.parse(params.id);

    const conversation = await db.conversationThread.findUnique({
      where: {
        id: conversationId,
        userId: userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!conversation) {
      logger.info(
        `GET /api/conversations/[id] - Not Found: Conversation ${conversationId} for user ${userId} not found.`,
      );
      return new NextResponse("Conversation not found", { status: 404 });
    }

    logger.info(
      `GET /api/conversations/[id] - Success: Conversation ${conversationId} fetched for user ${userId}.`,
    );
    return NextResponse.json(conversation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(
        `GET /api/conversations/[id] - Bad Request: Invalid ID format.`,
        { message: error.message, issues: error.issues },
      );
      return new NextResponse(error.message, { status: 400 });
    }
    logger.error(
      `GET /api/conversations/[id] - Internal Server Error: Failed to fetch conversation ${params.id}.`,
      { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * PATCH /api/conversations/[id]
 * Updates a conversation's title.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();

  if (!userId) {
    logger.warn("PATCH /api/conversations/[id] - Unauthorized: No userId");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const conversationId = ConversationIdSchema.parse(params.id);
    const body = await req.json();
    const { title } = UpdateConversationSchema.parse(body);

    const updatedConversation = await db.conversationThread.update({
      where: {
        id: conversationId,
        userId: userId,
      },
      data: {
        title: title,
      },
    });

    logger.info(
      `PATCH /api/conversations/[id] - Success: Conversation ${conversationId} title updated to "${title}" for user ${userId}.`,
    );
    return NextResponse.json(updatedConversation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(
        `PATCH /api/conversations/[id] - Bad Request: Invalid input for title.`,
        { message: error.message, issues: error.issues },
      );
      return new NextResponse(error.message, { status: 400 });
    }
    logger.error(
      `PATCH /api/conversations/[id] - Internal Server Error: Failed to update conversation ${params.id}.`,
      { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * DELETE /api/conversations/[id]
 * Deletes a specific conversation.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();

  if (!userId) {
    logger.warn("DELETE /api/conversations/[id] - Unauthorized: No userId");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const conversationId = ConversationIdSchema.parse(params.id);

    const deletedConversation = await db.conversationThread.delete({
      where: {
        id: conversationId,
        userId: userId,
      },
    });

    logger.info(
      `DELETE /api/conversations/[id] - Success: Conversation ${conversationId} deleted for user ${userId}.`,
    );
    return NextResponse.json(deletedConversation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn(
        `DELETE /api/conversations/[id] - Bad Request: Invalid ID format.`,
        { message: error.message, issues: error.issues },
      );
      return new NextResponse(error.message, { status: 400 });
    }
    logger.error(
      `DELETE /api/conversations/[id] - Internal Server Error: Failed to delete conversation ${params.id}.`,
      { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}