import { NextResponse } from "next/server";
import { getCustomNodes } from "@/lib/custom-nodes";
import { withErrorHandling } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(
  async (request: Request, { userId, logger }) => {
    const { searchParams } = new URL(request.url);
    const roadmapId = searchParams.get("roadmapId") ?? "electrician-bc";

    const nodes = await getCustomNodes(userId!, roadmapId);

    logger.info("Custom nodes fetched", {
      userId,
      roadmapId,
      count: nodes.length,
    });

    return NextResponse.json({ nodes });
  },
  {
    requireAuth: true,
    loggerContext: "custom-nodes-api",
    errorPrefix: "Failed to fetch custom nodes",
  },
);
