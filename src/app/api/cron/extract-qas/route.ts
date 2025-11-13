import { generateObject } from "ai";
import type { NextRequest } from "next/server";

import { getChatModel } from "@/lib/ai-model";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { requireCronAuth } from "@/server/cron-auth";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

const SESSION_IDLE_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes
const MAX_SESSIONS_PER_RUN = 5;

type SessionWithMessages = Prisma.ChatSessionGetPayload<{
  include: { messages: true };
}>;

type ExtractedQA = {
  question: string;
  answer: string;
  messageIds?: string[];
  confidence?: number;
};

const ExtractedQASchema = z.object({
  pairs: z.array(
    z.object({
      question: z.string().min(1).describe("Clear standalone question"),
      answer: z.string().min(1).describe("Complete consolidated answer"),
      messageIds: z
        .array(z.string())
        .optional()
        .describe("Message IDs referenced in this Q&A"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Model confidence between 0-1"),
    }),
  ),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const sessions = await loadProcessableSessions();
  let totalPairs = 0;

  for (const session of sessions) {
    try {
      totalPairs += await extractPairsForSession(session);
    } catch (error) {
      logger.error("Failed to extract Q&A pairs", error, { sessionId: session.id });
    }
  }

  return Response.json({
    sessionsProcessed: sessions.length,
    totalPairs,
  });
}

async function loadProcessableSessions(): Promise<SessionWithMessages[]> {
  const idleBoundary = new Date(Date.now() - SESSION_IDLE_TIMEOUT_MS);

  const candidateSessions = await db.chatSession.findMany({
    where: {
      qaPairs: { none: {} },
      messages: { some: {} },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { startedAt: "asc" },
    take: 20,
  });

  const processable = candidateSessions.filter((session) => {
    const lastMessage = session.messages.at(-1);
    if (!lastMessage) return false;
    if (session.endedAt) return true;
    return lastMessage.createdAt < idleBoundary;
  });

  return processable.slice(0, MAX_SESSIONS_PER_RUN);
}

async function extractPairsForSession(session: SessionWithMessages) {
  logger.info("Extracting session", {
    sessionId: session.id,
    endedAt: session.endedAt,
    messageCount: session.messages.length,
  });
  const conversation = session.messages
    .map(
      (message) =>
        `[${message.id}] ${message.role === "user" ? "User" : "Assistant"}: ${message.content}`,
    )
    .join("\n\n");

  if (!conversation) return 0;

  const extractionPrompt = `
You are analyzing a conversation between a prospective tradesperson and an AI guide. Extract distinct, high-signal question and answer pairs.

Guidelines:
1. A single Q&A may span multiple interleaved messages. Combine them into one cohesive pair.
2. Ignore greetings or chit-chat.
3. Rewrite questions so they stand alone (e.g., "What certifications do I need?" instead of "What about that?").
4. Answers should be complete, actionable, and cite all relevant details the assistant shared.
5. Include the message IDs (from the transcript) that contributed to each Q&A.

Return ONLY valid JSON with this shape:
{
  "pairs": [
    {
      "question": "Clear standalone question",
      "answer": "Complete consolidated answer",
      "messageIds": ["msg1", "msg2"],
      "confidence": 0.9
    }
  ]
}

Transcript:
${conversation}
`;

  const parsed = await (async (): Promise<ExtractedQA[] | null> => {
    try {
      const completion = await generateObject({
        model: getChatModel(),
        system: "You extract structured FAQs from chat transcripts.",
        prompt: extractionPrompt,
        schema: ExtractedQASchema,
        temperature: 0.2,
        maxTokens: 2048,
      });
      logger.info("Extractor response received", {
        sessionId: session.id,
        preview: (completion.text ?? "").slice(0, 200),
        pairCount: completion.object.pairs.length,
      });
      return completion.object.pairs;
    } catch (err) {
      logger.error("Extractor model call failed", err, { sessionId: session.id });
      return null;
    }
  })();

  if (parsed === null) {
    return 0;
  }

  let savedCount = 0;
  for (const qa of parsed) {
    const question = qa.question.trim();
    const answer = qa.answer.trim();
    if (!question || !answer) continue;

    const sanitizedIds = Array.isArray(qa.messageIds)
      ? qa.messageIds.filter((id) => session.messages.some((message) => message.id === id))
      : [];

    await db.qAPair.create({
      data: {
        sessionId: session.id,
        question,
        answer,
        messageIds: sanitizedIds,
        confidence: typeof qa.confidence === "number" ? qa.confidence : null,
      },
    });

    savedCount += 1;
  }

  if (!session.endedAt) {
    await db.chatSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });
  }

  return savedCount;
}
