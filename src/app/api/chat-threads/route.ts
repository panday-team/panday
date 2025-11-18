import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import {
  DEFAULT_THREAD_TITLE,
  toThreadResponse,
} from "@/lib/chat-threads";

const logger = createLogger({ context: "chat-threads-api" });

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
  roadmapId: z.string().optional(),
});

const createSchema = z.object({
  roadmapId: z.string().optional(),
  selectedNodeId: z.string().optional(),
  title: z.string().trim().min(1).max(120).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = listQuerySchema.safeParse({
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
    roadmapId: req.nextUrl.searchParams.get("roadmapId") ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(
      { error: "Invalid query", details: query.error.flatten() },
      { status: 400 },
    );
  }

  const { limit = 20, cursor, roadmapId } = query.data;

  try {
    const threads = await db.chatThread.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(roadmapId ? { roadmapId } : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { _count: { select: { messages: true } } },
    });

    const hasNext = threads.length > limit;
    const items = hasNext ? threads.slice(0, limit) : threads;

    return NextResponse.json({
      threads: items.map(toThreadResponse),
      nextCursor: hasNext ? threads[threads.length - 1]!.id : null,
    });
  } catch (error) {
    logger.error("Failed to list threads", error, { userId });
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const thread = await db.chatThread.create({
      data: {
        userId,
        roadmapId: parsed.data.roadmapId ?? null,
        selectedNodeId: parsed.data.selectedNodeId ?? null,
        title: parsed.data.title ?? DEFAULT_THREAD_TITLE,
      },
      include: { _count: { select: { messages: true } } },
    });

    logger.info("Chat thread created", { threadId: thread.id, userId });

    return NextResponse.json({ thread: toThreadResponse(thread) }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create thread", error, { userId });
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 },
    );
  }
}
