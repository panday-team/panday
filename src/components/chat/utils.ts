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

/**
 * Represents a tool call parsed from JSON text content.
 * Some AI models output tool calls as JSON text instead of using native tool calling.
 */
export interface ParsedToolCall {
  toolName: string;
  args: Record<string, unknown>;
  toolCallId: string;
}

/**
 * Attempts to parse tool calls from message content that appears to be JSON.
 * This handles the case where AI models output tool calls as JSON text instead of
 * using the native tool calling mechanism.
 *
 * Supports formats:
 * - {"tool_uses":[{"recipient_name":"functions.toolName","parameters":{...}},...]}
 * - Malformed JSON with tool-like structures
 *
 * Returns null if no tool calls are detected or parsing fails.
 */
export function parseToolCallsFromContent(
  content: string,
): ParsedToolCall[] | null {
  if (!content.trim()) return null;

  // Quick check: does content look like it might contain tool call JSON?
  // The format we're seeing is: {"tool_uses":[{"recipient_name":"functions.X"...}]}
  if (
    !content.includes("tool_uses") &&
    !content.includes("recipient_name") &&
    !content.includes("functions.")
  ) {
    return null;
  }

  try {
    // Try to find JSON in the content - it might be mixed with text
    const jsonPattern = /\{[\s\S]*"tool_uses"[\s\S]*\}/;
    const jsonMatch = jsonPattern.exec(content);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    if (!isRecord(parsed)) return null;

    const toolUses = parsed.tool_uses;
    if (!Array.isArray(toolUses)) return null;

    const toolCalls: ParsedToolCall[] = [];

    for (let i = 0; i < toolUses.length; i++) {
      const toolUse: unknown = toolUses[i];
      if (!isRecord(toolUse)) continue;

      // Parse recipient_name to extract tool name
      // Format: "functions.toolName" or just "toolName"
      const recipientName = toolUse.recipient_name;
      if (typeof recipientName !== "string") continue;

      const toolName = recipientName.startsWith("functions.")
        ? recipientName.slice("functions.".length)
        : recipientName;

      const parameters = toolUse.parameters;
      const args = isRecord(parameters) ? parameters : {};

      toolCalls.push({
        toolName,
        args,
        // Generate a stable ID based on index and content
        toolCallId: `parsed-${toolName}-${i}-${Date.now()}`,
      });
    }

    return toolCalls.length > 0 ? toolCalls : null;
  } catch {
    // JSON parsing failed - not valid tool call JSON
    return null;
  }
}

/**
 * Strips tool call JSON from message content, returning only the human-readable text.
 * This is used to clean up messages where the model outputted tool calls as JSON.
 */
export function stripToolCallJsonFromContent(content: string): string {
  if (!content.trim()) return content;

  // Remove JSON blocks that look like tool calls
  const jsonPattern = /\{[\s\S]*"tool_uses"[\s\S]*\}/g;
  const cleaned = content.replace(jsonPattern, "").trim();

  // If we removed everything, return original (might have been legitimate content)
  return cleaned || content;
}
