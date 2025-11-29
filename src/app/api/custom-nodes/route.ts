import { NextResponse } from "next/server";
import {
  getCustomNodes,
  createCustomNode,
  CreateCustomNodeSchema,
} from "@/lib/custom-nodes";
import { withErrorHandling, parseJsonBody, created } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling<Request>(
  async (request, { userId, logger }) => {
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

export const POST = withErrorHandling<Request>(
  async (request, { userId, logger }) => {
    const input = await parseJsonBody(request, CreateCustomNodeSchema);

    // Ensure type has a default value
    const nodeInput = {
      ...input,
      type: input.type ?? "checklist",
    };

    const node = await createCustomNode(userId!, nodeInput);

    logger.info("Custom node created via API", {
      userId,
      nodeId: node.id,
      roadmapId: nodeInput.roadmapId,
      parentId: nodeInput.parentId,
      type: nodeInput.type,
    });

    return created({ node });
  },
  {
    requireAuth: true,
    loggerContext: "custom-nodes-api",
    errorPrefix: "Failed to create custom node",
  },
);
