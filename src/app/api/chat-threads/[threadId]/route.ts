import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { toThreadResponse } from "@/lib/chat-threads";

const logger = createLogger({ context: "chat-thread-api" });

const paramsSchema = z.object({
  threadId: z.string().min(1),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  roadmapId: z.string().nullable().optional(),
  selectedNodeId: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  const thread = await db.chatThread.findFirst({
    where: { id: parsedParams.data.threadId, userId, deletedAt: null },
    include: { _count: { select: { messages: true } } },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  return NextResponse.json({ thread: toThreadResponse(thread) });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const parsedBody = updateSchema.safeParse(payload);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const thread = await db.chatThread.update({
      where: { id: parsedParams.data.threadId, userId },
      data: {
        ...(parsedBody.data.title ? { title: parsedBody.data.title } : {}),
        ...(parsedBody.data.roadmapId !== undefined
          ? { roadmapId: parsedBody.data.roadmapId }
          : {}),
        ...(parsedBody.data.selectedNodeId !== undefined
          ? { selectedNodeId: parsedBody.data.selectedNodeId }
          : {}),
      },
      include: { _count: { select: { messages: true } } },
    });

    return NextResponse.json({ thread: toThreadResponse(thread) });
  } catch (error) {
    logger.error("Failed to update thread", error, {
      threadId: parsedParams.data.threadId,
      userId,
    });
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ threadId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  try {
    const result = await db.chatThread.updateMany({
      where: {
        id: parsedParams.data.threadId,
        userId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    logger.info("Thread deleted", {
      threadId: parsedParams.data.threadId,
      userId,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Failed to delete thread", error, {
      threadId: parsedParams.data.threadId,
      userId,
    });
    return NextResponse.json(
      { error: "Failed to delete thread" },
      { status: 500 },
    );
  }
}
