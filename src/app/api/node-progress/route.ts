import { NextResponse } from "next/server";
import { z } from "zod";
import { db as prisma } from "@/server/db";
import {
  withErrorHandling,
  parseSearchParams,
  parseJsonBody,
} from "@/lib/api-handler";

// Validation schemas
const nodeStatusSchema = z.enum(["base", "in-progress", "completed"]);

const getQuerySchema = z.object({
  roadmapId: z.string().min(1),
});

const updateNodeProgressSchema = z.object({
  roadmapId: z.string().min(1),
  nodeId: z.string().min(1),
  status: nodeStatusSchema,
});

const batchUpdateNodeProgressSchema = z.object({
  roadmapId: z.string().min(1),
  nodeIds: z.array(z.string().min(1)).min(1).max(100),
  status: nodeStatusSchema,
});

/**
 * GET /api/node-progress?roadmapId={roadmapId} - Fetch all node progress for a roadmap
 */
export const GET = withErrorHandling<Request>(
  async (request, { userId, logger }) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;
    const { roadmapId } = parseSearchParams(request, getQuerySchema);

    const nodeProgress = await prisma.nodeProgress.findMany({
      where: {
        userId: authenticatedUserId,
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

    logger.info("Node progress fetched", {
      userId: authenticatedUserId,
      roadmapId,
      count: nodeProgress.length,
    });

    return NextResponse.json(progressMap);
  },
  { requireAuth: true, loggerContext: "node-progress:get" },
);

/**
 * PATCH /api/node-progress - Update node progress
 */
export const PATCH = withErrorHandling<Request>(
  async (request, { userId, logger }) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;
    const data = await parseJsonBody(request, updateNodeProgressSchema);

    // Upsert node progress (create or update)
    const nodeProgress = await prisma.nodeProgress.upsert({
      where: {
        userId_roadmapId_nodeId: {
          userId: authenticatedUserId,
          roadmapId: data.roadmapId,
          nodeId: data.nodeId,
        },
      },
      update: {
        status: data.status,
      },
      create: {
        userId: authenticatedUserId,
        roadmapId: data.roadmapId,
        nodeId: data.nodeId,
        status: data.status,
      },
    });

    logger.info("Node progress updated", {
      userId: authenticatedUserId,
      roadmapId: data.roadmapId,
      nodeId: data.nodeId,
      status: data.status,
    });

    return NextResponse.json(nodeProgress);
  },
  { requireAuth: true, loggerContext: "node-progress:update" },
);

/**
 * PUT /api/node-progress - Batch update node progress for multiple nodes
 */
export const PUT = withErrorHandling<Request>(
  async (request, { userId, logger }) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;
    const data = await parseJsonBody(request, batchUpdateNodeProgressSchema);

    // Use transaction to ensure all updates succeed or fail together
    const results = await prisma.$transaction(
      data.nodeIds.map((nodeId) =>
        prisma.nodeProgress.upsert({
          where: {
            userId_roadmapId_nodeId: {
              userId: authenticatedUserId,
              roadmapId: data.roadmapId,
              nodeId,
            },
          },
          update: {
            status: data.status,
          },
          create: {
            userId: authenticatedUserId,
            roadmapId: data.roadmapId,
            nodeId,
            status: data.status,
          },
        }),
      ),
    );

    logger.info("Batch node progress updated", {
      userId: authenticatedUserId,
      roadmapId: data.roadmapId,
      nodeCount: data.nodeIds.length,
      status: data.status,
    });

    // Return the updated statuses as a map
    const progressMap = results.reduce(
      (acc, item) => {
        acc[item.nodeId] = item.status;
        return acc;
      },
      {} as Record<string, string>,
    );

    return NextResponse.json({
      updated: results.length,
      statuses: progressMap,
    });
  },
  { requireAuth: true, loggerContext: "node-progress:batch-update" },
);
