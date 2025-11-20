import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCustomNodes } from "@/lib/custom-nodes";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roadmapId = searchParams.get("roadmapId") ?? "electrician-bc";

  try {
    const nodes = await getCustomNodes(userId, roadmapId);

    return NextResponse.json({
      nodes,
    });
  } catch (error) {
    logger.error("Failed to fetch custom nodes", error, { userId, roadmapId });
    return NextResponse.json(
      { error: "Failed to fetch custom nodes" },
      { status: 500 },
    );
  }
}
