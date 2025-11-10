import type { NextRequest } from "next/server";

import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const isGlobal = searchParams.get("global") === "true";

  if (isGlobal) {
    const entries = await db.fAQEntry.findMany({
      where: { isGlobal: true },
      orderBy: [{ frequency: "desc" }, { displayOrder: "asc" }, { question: "asc" }],
      take: 20,
    });
    return Response.json(entries);
  }

  if (categoryId) {
    const entries = await db.fAQEntry.findMany({
      where: { categoryId },
      orderBy: [{ frequency: "desc" }, { displayOrder: "asc" }, { question: "asc" }],
    });
    return Response.json(entries);
  }

  const categories = await db.fAQCategory.findMany({
    include: {
      faqEntries: {
        orderBy: [{ frequency: "desc" }, { displayOrder: "asc" }],
      },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return Response.json(categories);
}
