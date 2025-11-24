/**
 * Utility functions for chat widget
 */

import type { Message } from "@ai-sdk/react";
import type { SourceDocument } from "@/lib/embeddings-service";
import type {
  MinimalMessage,
  StreamStatusEvent,
  StreamMetadataEvent,
} from "./types";
import type { ThreadMessageResponse } from "@/lib/chat-threads";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isStatusEvent = (value: unknown): value is StreamStatusEvent =>
  isRecord(value) &&
  value.type === "status" &&
  typeof value.message === "string";

export const isMetadataEvent = (value: unknown): value is StreamMetadataEvent =>
  isRecord(value) && value.type === "metadata";

export const filterEmptyMessages = <T extends MinimalMessage>(
  messages: T[],
): T[] => messages.filter((message) => message.content.trim().length > 0);

export const isSourceDocument = (value: unknown): value is SourceDocument => {
  if (!isRecord(value)) return false;
  return (
    typeof value.node_id === "string" &&
    typeof value.title === "string" &&
    typeof value.score === "number" &&
    typeof value.text_snippet === "string"
  );
};

export const formatRelativeTime = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  const diff = Date.now() - timestamp;
  if (Number.isNaN(diff)) return "";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
};

export const mapThreadMessagesToChatMessages = (
  messages: ThreadMessageResponse[],
): Message[] =>
  messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
  }));

export const extractLatestSources = (messages: ThreadMessageResponse[]) => {
  // Reverse iterate to find the most recent assistant message with sources
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message && message.role === "assistant" && message.sources) {
      // Parse sources array and filter to valid SourceDocument objects
      if (Array.isArray(message.sources)) {
        const validSources = message.sources.filter(isSourceDocument);
        if (validSources.length > 0) {
          return validSources;
        }
      }
    }
  }
  return [];
};

export const HISTORY_SKELETON_ITEMS = Array.from({ length: 3 });
