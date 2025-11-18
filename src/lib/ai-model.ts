import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { env } from "@/env";

let cachedChatModel: LanguageModel | null = null;

export function getChatModel(): LanguageModel {
  if (cachedChatModel) return cachedChatModel;

  switch (env.AI_PROVIDER) {
    case "google": {
      if (!env.GOOGLE_API_KEY) {
        throw new Error("GOOGLE_API_KEY is not configured");
      }
      const google = createGoogleGenerativeAI({
        apiKey: env.GOOGLE_API_KEY,
      });
      cachedChatModel = google(env.AI_MODEL);
      return cachedChatModel;
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
      cachedChatModel = openai(env.AI_MODEL);
      return cachedChatModel;
    }
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
      }
      const anthropic = createAnthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      });
      cachedChatModel = anthropic(env.AI_MODEL);
      return cachedChatModel;
    }
    default:
      throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER as string}`);
  }
}

export function getEmbeddingModel() {
  const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  return openai.embedding("text-embedding-3-small");
}
