import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import {
  buildMessagePreview,
  isSupportedRole,
  toThreadMessageResponse,
} from "@/lib/chat-threads";

const logger = createLogger({ context: "chat-thread-messages-api" });

const paramsSchema = z.object({
  threadId: z.string().min(1),
});

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

export async function GET(
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

  const parsedLimit = paginationSchema.safeParse({
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsedLimit.success) {
    return NextResponse.json(
      { error: "Invalid limit", details: parsedLimit.error.flatten() },
      { status: 400 },
    );
  }

  const thread = await db.chatThread.findFirst({
    where: {
      id: parsedParams.data.threadId,
      userId,
      deletedAt: null,
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const messages = await db.chatThreadMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    ...(parsedLimit.data.limit ? { take: parsedLimit.data.limit } : {}),
  });

  return NextResponse.json({
    messages: messages.map(toThreadMessageResponse),
  });
}

export async function POST(
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

  const parsedBody = appendSchema.safeParse(payload);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const thread = await db.chatThread.findFirst({
    where: {
      id: parsedParams.data.threadId,
      userId,
      deletedAt: null,
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  try {
    const results = await db.$transaction(async (tx) => {
      const created = [];
      for (const message of parsedBody.data.messages) {
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

    return NextResponse.json({
      messages: results.map(toThreadMessageResponse),
    });
  } catch (error) {
    logger.error("Failed to append messages", error, {
      threadId: parsedParams.data.threadId,
      userId,
    });
    return NextResponse.json(
      { error: "Failed to append messages" },
      { status: 500 },
    );
  }
}
