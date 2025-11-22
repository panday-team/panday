import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import {
  buildMessagePreview,
  isSupportedRole,
  toThreadMessageResponse,
} from "@/lib/chat-threads";
import {
  withErrorHandling,
  parseSearchParams,
  parseJsonBody,
  notFound,
  type ApiContext,
} from "@/lib/api-handler";

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const appendSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string().refine(isSupportedRole, "Unsupported role"),
        content: z.string().trim().min(1),
        sources: z.unknown().optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const GET = withErrorHandling(
  async (
    req: Request,
    { userId }: ApiContext,
    _context: { params: Promise<{ threadId: string }> },
  ) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;
    const { threadId } = await _context.params;
    const { limit } = parseSearchParams(req, paginationSchema);

    const thread = await db.chatThread.findFirst({
      where: {
        id: threadId,
        userId: authenticatedUserId,
        deletedAt: null,
      },
    });

    if (!thread) {
      return notFound("Thread not found");
    }

    const messages = await db.chatThreadMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json({
      messages: messages.map(toThreadMessageResponse),
    });
  },
  { requireAuth: true, loggerContext: "chat-thread-messages:list" },
);

export const POST = withErrorHandling(
  async (
    req: Request,
    { userId, logger }: ApiContext,
    _context: { params: Promise<{ threadId: string }> },
  ) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;
    const { threadId } = await _context.params;
    const data = await parseJsonBody(req, appendSchema);

    const thread = await db.chatThread.findFirst({
      where: {
        id: threadId,
        userId: authenticatedUserId,
        deletedAt: null,
      },
    });

    if (!thread) {
      return notFound("Thread not found");
    }

    const results = await db.$transaction(async (tx) => {
      const created = [];
      for (const message of data.messages) {
        const entry = await tx.chatThreadMessage.create({
          data: {
            threadId: thread.id,
            role: message.role,
            content: message.content,
            sources:
              message.sources !== undefined
                ? (message.sources as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          },
        });
        created.push(entry);
      }

      const last = created[created.length - 1]!;
      await tx.chatThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: last.createdAt,
          messagePreview: buildMessagePreview(last.content),
        },
      });

      return created;
    });

    logger.info("Messages appended to thread", {
      threadId,
      userId: authenticatedUserId,
      messageCount: results.length,
    });

    return NextResponse.json({
      messages: results.map(toThreadMessageResponse),
    });
  },
  { requireAuth: true, loggerContext: "chat-thread-messages:append" },
);
