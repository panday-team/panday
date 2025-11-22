import { db } from "@/server/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  sanitizePlainText,
  sanitizeBasicFormat,
  sanitizeJsonContent,
} from "@/lib/sanitize";

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
  content: z
    .record(z.unknown())
    .optional()
    .describe("Rich content: { checklistItems, resources, notes, dueDate }"),
});

export type CreateCustomNodeInput = z.infer<typeof CreateCustomNodeSchema>;

export const UpdateCustomNodeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  parentId: z.string().optional(),
  type: z.enum(["checklist", "resource", "action", "roadblock"]).optional(),
  content: z
    .record(z.unknown())
    .optional()
    .describe("Rich content: { checklistItems, resources, notes, dueDate }"),
});

export type UpdateCustomNodeInput = z.infer<typeof UpdateCustomNodeSchema>;

export async function createCustomNode(
  userId: string,
  input: CreateCustomNodeInput,
) {
  const validated = CreateCustomNodeSchema.parse(input);

  // Sanitize user input to prevent XSS attacks
  const sanitizedTitle = sanitizePlainText(validated.title);
  const sanitizedDescription = sanitizeBasicFormat(validated.description);
  const sanitizedContent = validated.content
    ? sanitizeJsonContent(validated.content, "BASIC_FORMAT")
    : null;

  return db.customNode.create({
    data: {
      userId,
      roadmapId: validated.roadmapId,
      parentId: validated.parentId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      type: validated.type,
      content: (sanitizedContent as Prisma.JsonValue) ?? Prisma.JsonNull,
    },
  });
}

export async function updateCustomNode(
  userId: string,
  nodeId: string,
  input: UpdateCustomNodeInput,
) {
  const validated = UpdateCustomNodeSchema.parse(input);

  // First check if node exists and belongs to user
  const existing = await db.customNode.findFirst({
    where: {
      id: nodeId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Custom node not found or access denied");
  }

  // Sanitize user input to prevent XSS attacks
  const sanitizedTitle = validated.title
    ? sanitizePlainText(validated.title)
    : undefined;
  const sanitizedDescription =
    validated.description !== undefined
      ? sanitizeBasicFormat(validated.description)
      : undefined;
  const sanitizedContent =
    validated.content !== undefined
      ? sanitizeJsonContent(validated.content, "BASIC_FORMAT")
      : undefined;

  return db.customNode.update({
    where: {
      id: nodeId,
    },
    data: {
      ...(sanitizedTitle && { title: sanitizedTitle }),
      ...(sanitizedDescription !== undefined && {
        description: sanitizedDescription,
      }),
      ...(validated.parentId && { parentId: validated.parentId }),
      ...(validated.type && { type: validated.type }),
      ...(sanitizedContent !== undefined && {
        content: (sanitizedContent as Prisma.JsonValue) ?? Prisma.JsonNull,
      }),
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
