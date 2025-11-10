import { streamText } from "ai";
import type { NextRequest } from "next/server";

import { getChatModel } from "@/lib/ai-model";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { requireCronAuth } from "@/server/cron-auth";

import type { Prisma } from "@prisma/client";

const SESSION_IDLE_TIMEOUT_MS = 1000 * 60 * 30; // 30 minutes
const MAX_SESSIONS_PER_RUN = 5;

type SessionWithMessages = Prisma.ChatSessionGetPayload<{
  include: { messages: true };
}>;

type ExtractedQA = {
  question?: string;
  answer?: string;
  messageIds?: string[];
  confidence?: number;
};

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
[
  {
    "question": "Clear standalone question",
    "answer": "Complete consolidated answer",
    "messageIds": ["msg1", "msg2"],
    "confidence": 0.9
  }
]

Transcript:
${conversation}
`;

  const completion = streamText({
    model: getChatModel(),
    system: "You extract structured FAQs from chat transcripts.",
    messages: [{ role: "user", content: extractionPrompt }],
    temperature: 0.2,
    maxTokens: 2048,
  });

  const response = await completion.text;
  let parsed: ExtractedQA[] = [];

  try {
    const candidate = JSON.parse(response) as unknown;
    if (Array.isArray(candidate)) {
      parsed = candidate;
    } else {
      logger.warn("Extractor did not return an array", { sessionId: session.id });
    }
  } catch (error) {
    logger.error("Failed to parse extractor response", error, {
      sessionId: session.id,
      response,
    });
    return 0;
  }

  let savedCount = 0;
  for (const qa of parsed) {
    const question = qa.question?.trim();
    const answer = qa.answer?.trim();
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
