import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/server/db";
import { toThreadResponse } from "@/lib/chat-threads";
import {
  withErrorHandling,
  parseJsonBody,
  notFound,
  noContent,
  type ApiContext,
} from "@/lib/api-handler";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  roadmapId: z.string().nullable().optional(),
  selectedNodeId: z.string().nullable().optional(),
});

export const GET = withErrorHandling(
  async (
    _req: Request,
    { userId }: ApiContext,
    _context: { params: Promise<{ threadId: string }> },
  ) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;
    const { threadId } = await _context.params;

    const thread = await db.chatThread.findFirst({
      where: { id: threadId, userId: authenticatedUserId, deletedAt: null },
      include: { _count: { select: { messages: true } } },
    });

    if (!thread) {
      return notFound("Thread not found");
    }

    return NextResponse.json({ thread: toThreadResponse(thread) });
  },
  { requireAuth: true, loggerContext: "chat-thread:get" },
);

export const PATCH = withErrorHandling(
  async (
    req: Request,
    { userId }: ApiContext,
    _context: { params: Promise<{ threadId: string }> },
  ) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;
    const { threadId } = await _context.params;
    const data = await parseJsonBody(req, updateSchema);

    const thread = await db.chatThread.update({
      where: { id: threadId, userId: authenticatedUserId },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.roadmapId !== undefined ? { roadmapId: data.roadmapId } : {}),
        ...(data.selectedNodeId !== undefined
          ? { selectedNodeId: data.selectedNodeId }
          : {}),
      },
      include: { _count: { select: { messages: true } } },
    });

    return NextResponse.json({ thread: toThreadResponse(thread) });
  },
  { requireAuth: true, loggerContext: "chat-thread:update" },
);

export const DELETE = withErrorHandling(
  async (
    _req: Request,
    { userId, logger }: ApiContext,
    _context: { params: Promise<{ threadId: string }> },
  ) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;
    const { threadId } = await _context.params;

    const result = await db.chatThread.updateMany({
      where: {
        id: threadId,
        userId: authenticatedUserId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      return notFound("Thread not found");
    }

    logger.info("Thread deleted", { threadId, userId: authenticatedUserId });

    return noContent();
  },
  { requireAuth: true, loggerContext: "chat-thread:delete" },
);
