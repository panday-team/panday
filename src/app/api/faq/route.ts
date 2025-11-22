import type { NextRequest } from "next/server";

import { db } from "@/server/db";
import { APP_CONFIG } from "@/config/app-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const isGlobal = searchParams.get("global") === "true";

  // Cache headers: FAQ data changes infrequently (only when cron runs)
  // Configurable via environment variables (see APP_CONFIG.apiCache.faq)
  const cacheControl = [
    "public",
    `max-age=${APP_CONFIG.apiCache.faq.maxAge}`,
    `s-maxage=${APP_CONFIG.apiCache.faq.sMaxAge}`,
    `stale-while-revalidate=${APP_CONFIG.apiCache.faq.staleWhileRevalidate}`,
  ].join(", ");

  const cacheHeaders = {
    "Cache-Control": cacheControl,
  };

  if (isGlobal) {
    const entries = await db.fAQEntry.findMany({
      where: { isGlobal: true },
      orderBy: [
        { frequency: "desc" },
        { displayOrder: "asc" },
        { question: "asc" },
      ],
      take: 20,
    });
    return Response.json(entries, { headers: cacheHeaders });
  }

  if (categoryId) {
    const entries = await db.fAQEntry.findMany({
      where: { categoryId },
      orderBy: [
        { frequency: "desc" },
        { displayOrder: "asc" },
        { question: "asc" },
      ],
    });
    return Response.json(entries, { headers: cacheHeaders });
  }

  const categories = await db.fAQCategory.findMany({
    include: {
      faqEntries: {
        orderBy: [{ frequency: "desc" }, { displayOrder: "asc" }],
      },
    },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return Response.json(categories, { headers: cacheHeaders });
}
