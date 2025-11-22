import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { APP_CONFIG } from "@/config/app-config";
import { withErrorHandling, parseSearchParams } from "@/lib/api-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  categoryId: z.string().optional(),
  global: z.enum(["true", "false"]).optional(),
});

export const GET = withErrorHandling<Request>(
  async (request, _context) => {
    const { categoryId, global } = parseSearchParams(request, querySchema);
    const isGlobal = global === "true";

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
      return NextResponse.json(entries, { headers: cacheHeaders });
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
      return NextResponse.json(entries, { headers: cacheHeaders });
    }

    const categories = await db.fAQCategory.findMany({
      include: {
        faqEntries: {
          orderBy: [{ frequency: "desc" }, { displayOrder: "asc" }],
        },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(categories, { headers: cacheHeaders });
  },
  { requireAuth: false, loggerContext: "faq:get" },
);
