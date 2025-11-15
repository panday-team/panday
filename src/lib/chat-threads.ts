import type { ChatThread, ChatThreadMessage } from "@prisma/client";

import type { SourceDocument } from "@/lib/embeddings-service";

export const DEFAULT_THREAD_TITLE = "New chat";
const TITLE_MAX_LENGTH = 80;
const PREVIEW_MAX_LENGTH = 180;

const THREAD_ROLES = ["user", "assistant", "system"] as const;
export type ThreadMessageRole = (typeof THREAD_ROLES)[number];

export interface ThreadResponse {
  id: string;
  title: string;
  roadmapId: string | null;
  selectedNodeId: string | null;
  messagePreview: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
}

export interface ThreadMessageResponse {
  id: string;
  role: ThreadMessageRole;
  content: string;
  sources: SourceDocument[] | null;
  createdAt: string;
}

export const sanitizeText = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const deriveThreadTitle = (content: string): string => {
  const clean = sanitizeText(content);
  if (!clean) return DEFAULT_THREAD_TITLE;
  if (clean.length <= TITLE_MAX_LENGTH) return clean;
  return `${clean.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`;
};

export const buildMessagePreview = (content: string): string => {
  const clean = sanitizeText(content);
  if (clean.length <= PREVIEW_MAX_LENGTH) return clean;
  return `${clean.slice(0, PREVIEW_MAX_LENGTH - 1).trimEnd()}…`;
};

export const toThreadResponse = (
  thread: ChatThread & { _count?: { messages: number } },
): ThreadResponse => ({
  id: thread.id,
  title: thread.title,
  roadmapId: thread.roadmapId ?? null,
  selectedNodeId: thread.selectedNodeId ?? null,
  messagePreview: thread.messagePreview ?? null,
  lastMessageAt: thread.lastMessageAt.toISOString(),
  createdAt: thread.createdAt.toISOString(),
  updatedAt: thread.updatedAt.toISOString(),
  messagesCount: thread._count?.messages ?? 0,
});

export const toThreadMessageResponse = (
  message: ChatThreadMessage,
): ThreadMessageResponse => ({
  id: message.id,
  role: (message.role as ThreadMessageRole) ?? "assistant",
  content: message.content,
  sources: (message.sources ?? null) as SourceDocument[] | null,
  createdAt: message.createdAt.toISOString(),
});

export const isSupportedRole = (
  role: string,
): role is ThreadMessageRole => THREAD_ROLES.includes(role as ThreadMessageRole);
