import { streamText } from "ai";
import type { NextRequest } from "next/server";

import { getChatModel } from "@/lib/ai-model";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { requireCronAuth } from "@/server/cron-auth";

import type { FAQCategory, QAPair } from "@prisma/client";

const BATCH_SIZE = 25;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = requireCronAuth(request);
  if (unauthorized) return unauthorized;

  const [categories, qaPairs] = await Promise.all([
    db.fAQCategory.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    db.qAPair.findMany({
      where: { categoryId: null },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    }),
  ]);

  if (qaPairs.length === 0) {
    return Response.json({ categorized: 0, message: "No uncategorized Q&A pairs" });
  }

  let categorizedCount = 0;
  const mutableCategories = [...categories];

  for (const qa of qaPairs) {
    try {
      const category = await categorizeQAPair(qa, mutableCategories);
      mutableCategories.push(category);

      await db.qAPair.update({
        where: { id: qa.id },
        data: { categoryId: category.id },
      });
      categorizedCount += 1;
    } catch (error) {
      logger.error("Failed to categorize Q&A pair", error, { qaPairId: qa.id });
    }
  }

  return Response.json({ categorized: categorizedCount });
}

async function categorizeQAPair(
  qa: QAPair,
  categories: FAQCategory[],
): Promise<FAQCategory> {
  if (categories.length === 0) {
    const created = await db.fAQCategory.create({
      data: { name: "General", description: "General roadmap questions" },
    });
    categories.push(created);
    return created;
  }

  const categoryDescriptions = categories
    .map((category) => `- ${category.name}: ${category.description ?? "No description provided."}`)
    .join("\n");

  const prompt = `
You organize FAQ entries for a skilled trades guidance platform. Assign the following question and answer to the most fitting category from the list. If nothing fits, suggest a new category name.

Existing categories:
${categoryDescriptions}

Question: "${qa.question}"
Answer: "${qa.answer}"

Return ONLY valid JSON:
{
  "categoryName": "name",
  "isNewCategory": false,
  "description": "Why this category fits"
}
`;

  const completion = streamText({
    model: getChatModel(),
    system: "You classify FAQs by topic.",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    maxTokens: 512,
  });

  const response = await completion.text;
  type CategorizationResponse = {
    categoryName?: string;
    isNewCategory?: boolean;
    description?: string;
  };

  let parsed: CategorizationResponse | null = null;
  try {
    parsed = JSON.parse(response) as CategorizationResponse;
  } catch (error) {
    logger.error("Failed to parse categorization response", error, {
      qaPairId: qa.id,
      response,
    });
    throw error;
  }

  const categoryName = parsed?.categoryName?.trim();
  if (!categoryName) {
    throw new Error("Categorizer did not return a category name");
  }

  const existing = categories.find(
    (category) => category.name.toLowerCase() === categoryName.toLowerCase(),
  );
  if (existing && !parsed?.isNewCategory) {
    return existing;
  }

  const created = await db.fAQCategory.create({
    data: {
      name: categoryName,
      description: parsed?.description ?? undefined,
    },
  });

  return created;
}
