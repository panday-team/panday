import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  updateCustomNode,
  deleteCustomNode,
  UpdateCustomNodeSchema,
} from "@/lib/custom-nodes";
import { logger } from "@/lib/logger";
import { chatRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nodeId } = await params;

  try {
    const body = await request.json();
    const validated = UpdateCustomNodeSchema.parse(body);

    const updatedNode = await updateCustomNode(userId, nodeId, validated);

    logger.info("Custom node updated", {
      nodeId,
      userId,
      updates: Object.keys(validated),
    });

    return NextResponse.json({
      success: true,
      node: updatedNode,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Custom node not found or access denied" },
        { status: 404 },
      );
    }

    logger.error("Failed to update custom node", error, {
      nodeId,
      userId,
    });

    return NextResponse.json(
      { error: "Failed to update custom node" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: 30 requests per minute per user (shared with chat)
  const rateLimitResult = await chatRateLimit.limit(userId);
  if (!rateLimitResult.success) {
    logger.warn("Rate limit exceeded for custom node deletion", {
      userId,
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

  const { nodeId } = await params;

  try {
    const result = await deleteCustomNode(userId, nodeId);

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Custom node not found or access denied" },
        { status: 404 },
      );
    }

    logger.info("Custom node deleted", {
      nodeId,
      userId,
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    logger.error("Failed to delete custom node", error, {
      nodeId,
      userId,
    });

    return NextResponse.json(
      { error: "Failed to delete custom node" },
      { status: 500 },
    );
  }
}
