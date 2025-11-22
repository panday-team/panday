import { NextResponse } from "next/server";
import {
  updateCustomNode,
  deleteCustomNode,
  UpdateCustomNodeSchema,
} from "@/lib/custom-nodes";
import { chatRateLimit } from "@/lib/rate-limit";
import {
  withErrorHandling,
  parseJsonBody,
  notFound,
  type ApiContext,
} from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const PATCH = withErrorHandling(
  async (
    request: Request,
    { userId, logger }: ApiContext,
    _context: { params: Promise<{ nodeId: string }> },
  ) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;

    const { nodeId } = await _context.params;
    const validated = await parseJsonBody(request, UpdateCustomNodeSchema);

    try {
      const updatedNode = await updateCustomNode(
        authenticatedUserId,
        nodeId,
        validated,
      );

      logger.info("Custom node updated", {
        nodeId,
        userId: authenticatedUserId,
        updates: Object.keys(validated),
      });

      return NextResponse.json({
        success: true,
        node: updatedNode,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return notFound("Custom node not found or access denied");
      }
      throw error;
    }
  },
  {
    requireAuth: true,
    loggerContext: "custom-nodes-api",
    errorPrefix: "Failed to update custom node",
  },
);

export const DELETE = withErrorHandling(
  async (
    _request: Request,
    { userId, logger }: ApiContext,
    _context: { params: Promise<{ nodeId: string }> },
  ) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;

    // Rate limiting: 30 requests per minute per user (shared with chat)
    const rateLimitResult = await chatRateLimit.limit(authenticatedUserId);
    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded for custom node deletion", {
        userId: authenticatedUserId,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
      });
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.reset,
        },
        { status: 429 },
      );
    }

    const { nodeId } = await _context.params;
    const result = await deleteCustomNode(authenticatedUserId, nodeId);

    if (result.count === 0) {
      return notFound("Custom node not found or access denied");
    }

    logger.info("Custom node deleted", { nodeId, userId: authenticatedUserId });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  },
  {
    requireAuth: true,
    loggerContext: "custom-nodes-api",
    errorPrefix: "Failed to delete custom node",
  },
);
