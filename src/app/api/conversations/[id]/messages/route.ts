import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();

  if (!userId) {
    logger.warn("Unauthorized attempt to fetch conversation messages", {
      ip: req.headers.get("x-forwarded-for") ?? "unknown",
    });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id: conversationId } = await params;

  try {
    // First, verify that the conversation thread belongs to the authenticated user
    const conversationThread = await db.conversationThread.findUnique({
      where: {
        id: conversationId,
        userId: userId,
      },
    });

    if (!conversationThread) {
      logger.warn("Unauthorized attempt to fetch messages for conversation", {
        conversationId,
        userId,
        ip: req.headers.get("x-forwarded-for") ?? "unknown",
      });
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const messages = await db.conversationMessage.findMany({
      where: {
        threadId: conversationId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    logger.info("Successfully fetched conversation messages", {
      conversationId,
      userId,
      messageCount: messages.length,
    });

    return NextResponse.json(messages);
  } catch (error) {
    logger.error("Failed to fetch conversation messages", error, {
      conversationId,
      userId,
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
