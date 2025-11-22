import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { DEFAULT_THREAD_TITLE, toThreadResponse } from "@/lib/chat-threads";
import {
  withErrorHandling,
  parseSearchParams,
  parseJsonBody,
  created,
} from "@/lib/api-handler";

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

export const GET = withErrorHandling<Request>(
  async (req, { userId }) => {
    const {
      limit = 20,
      cursor,
      roadmapId,
    } = parseSearchParams(req, listQuerySchema);

    const threads = await db.chatThread.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
        ...(roadmapId ? { roadmapId } : undefined),
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
  },
  { requireAuth: true, loggerContext: "chat-threads:list" },
);

export const POST = withErrorHandling<Request>(
  async (req, { userId, logger }) => {
    const data = await parseJsonBody(req, createSchema);

    const thread = await db.chatThread.create({
      data: {
        userId: userId!,
        roadmapId: data.roadmapId,
        selectedNodeId: data.selectedNodeId,
        title: data.title ?? DEFAULT_THREAD_TITLE,
      },
      include: { _count: { select: { messages: true } } },
    });

    logger.info("Chat thread created", { threadId: thread.id, userId });

    return created({ thread: toThreadResponse(thread) });
  },
  { requireAuth: true, loggerContext: "chat-threads:create" },
);
