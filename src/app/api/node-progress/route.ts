import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db as prisma } from "@/server/db";
import { createLogger } from "@/lib/logger";

const nodeProgressLogger = createLogger({ context: "node-progress-api" });

// Validation schemas
const nodeStatusSchema = z.enum(["base", "in-progress", "completed"]);

const updateNodeProgressSchema = z.object({
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
  status: nodeStatusSchema,
});

/**
 * GET /api/node-progress?roadmapId={roadmapId} - Fetch all node progress for a roadmap
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roadmapId = searchParams.get("roadmapId");

    if (!roadmapId) {
      return NextResponse.json(
        { error: "roadmapId is required" },
        { status: 400 },
      );
    }

    const nodeProgress = await prisma.nodeProgress.findMany({
      where: {
        userId,
        roadmapId,
      },
    });

    // Convert to Record<nodeId, status> format for easy lookup
    const progressMap = nodeProgress.reduce(
      (acc, item) => {
        acc[item.nodeId] = item.status;
        return acc;
      },
      {} as Record<string, string>,
    );

    nodeProgressLogger.info("Node progress fetched", {
      userId,
      roadmapId,
      count: nodeProgress.length,
    });

    return NextResponse.json(progressMap);
  } catch (error) {
    nodeProgressLogger.error("Failed to fetch node progress", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch node progress" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/node-progress - Update node progress
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const validatedData = updateNodeProgressSchema.parse(body);

    // Upsert node progress (create or update)
    const nodeProgress = await prisma.nodeProgress.upsert({
      where: {
        userId_roadmapId_nodeId: {
          userId,
          roadmapId: validatedData.roadmapId,
          nodeId: validatedData.nodeId,
        },
      },
      update: {
        status: validatedData.status,
      },
      create: {
        userId,
        roadmapId: validatedData.roadmapId,
        nodeId: validatedData.nodeId,
        status: validatedData.status,
      },
    });

    nodeProgressLogger.info("Node progress updated", {
      userId,
      roadmapId: validatedData.roadmapId,
      nodeId: validatedData.nodeId,
      status: validatedData.status,
    });

    return NextResponse.json(nodeProgress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      nodeProgressLogger.warn("Node progress validation failed", {
        error: error.errors,
      });
      return NextResponse.json(
        { error: "Invalid node progress data", details: error.errors },
        { status: 400 },
      );
    }

    nodeProgressLogger.error("Failed to update node progress", error as Error);
    return NextResponse.json(
      { error: "Failed to update node progress" },
      { status: 500 },
    );
  }
}
