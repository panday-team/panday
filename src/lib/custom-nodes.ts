import { db } from "@/server/db";
import { z } from "zod";

import type { CustomNode } from "@prisma/client";

export type { CustomNode };
export const CreateCustomNodeSchema = z.object({
  roadmapId: z.string(),
  parentId: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(1000),
  type: z
    .enum(["checklist", "resource", "action", "roadblock"])
    .default("checklist"),
});

export type CreateCustomNodeInput = z.infer<typeof CreateCustomNodeSchema>;

export async function createCustomNode(
  userId: string,
  input: CreateCustomNodeInput,
) {
  const validated = CreateCustomNodeSchema.parse(input);

  return db.customNode.create({
    data: {
      userId,
      ...validated,
    },
  });
}

export async function getCustomNodes(userId: string, roadmapId: string) {
  return db.customNode.findMany({
    where: {
      userId,
      roadmapId,
    },
  });
}

export async function deleteCustomNode(userId: string, nodeId: string) {
  return db.customNode.deleteMany({
    where: {
      id: nodeId,
      userId,
    },
  });
}
