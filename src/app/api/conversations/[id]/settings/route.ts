import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Schema for validating conversation settings input
const ConversationSettingsSchema = z.object({
  knowledgeIds: z.array(z.string()).optional(),
  projectIds: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  const conversationId = params.id;

  if (!userId) {
    logger.warn("GET /api/conversations/[id]/settings: Unauthorized - No userId");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!conversationId) {
    logger.warn("GET /api/conversations/[id]/settings: Bad Request - No conversationId");
    return new NextResponse("Bad Request: Conversation ID is required", {
      status: 400,
    });
  }

  try {
    // Fetch user knowledge settings for the conversation
    const userKnowledgeSettings = await db.userKnowledge.findMany({
      where: {
        clerkUserId: userId,
        conversationId: conversationId,
      },
      select: {
        knowledgeId: true,
      },
    });

    // Fetch user project settings for the conversation
    const userProjectSettings = await db.userProject.findMany({
      where: {
        clerkUserId: userId,
        conversationId: conversationId,
      },
      select: {
        projectId: true,
      },
    });

    const settings = {
      knowledgeIds: userKnowledgeSettings.map((s: { knowledgeId: string }) => s.knowledgeId),
      projectIds: userProjectSettings.map((s: { projectId: string }) => s.projectId),
    };

    logger.info(
      `GET /api/conversations/${conversationId}/settings: Successfully fetched settings for userId: ${userId}`,
      { conversationId, userId, settings },
    );
    return NextResponse.json(settings);
  } catch (error) {
    logger.error(
      `GET /api/conversations/${conversationId}/settings: Failed to fetch settings for userId: ${userId}`,
      { conversationId, userId, error: error instanceof Error ? error.message : String(error) },
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  const conversationId = params.id;

  if (!userId) {
    logger.warn("PUT /api/conversations/[id]/settings: Unauthorized - No userId");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!conversationId) {
    logger.warn("PUT /api/conversations/[id]/settings: Bad Request - No conversationId");
    return new NextResponse("Bad Request: Conversation ID is required", {
      status: 400,
    });
  }

  try {
    const body = await req.json();
    const validatedBody = ConversationSettingsSchema.parse(body);

    const { knowledgeIds, projectIds } = validatedBody;

    // Update UserKnowledge settings
    if (knowledgeIds !== undefined) {
      // Delete existing knowledge settings for this conversation and user
      await db.userKnowledge.deleteMany({
        where: {
          clerkUserId: userId,
          conversationId: conversationId,
        },
      });
      // Create new knowledge settings
      if (knowledgeIds.length > 0) {
        await db.userKnowledge.createMany({
          data: knowledgeIds.map((knowledgeId) => ({
            clerkUserId: userId,
            conversationId: conversationId,
            knowledgeId: knowledgeId,
          })),
        });
      }
    }

    // Update UserProject settings
    if (projectIds !== undefined) {
      // Delete existing project settings for this conversation and user
      await db.userProject.deleteMany({
        where: {
          clerkUserId: userId,
          conversationId: conversationId,
        },
      });
      // Create new project settings
      if (projectIds.length > 0) {
        await db.userProject.createMany({
          data: projectIds.map((projectId) => ({
            clerkUserId: userId,
            conversationId: conversationId,
            projectId: projectId,
          })),
        });
      }
    }

    logger.info(
      `PUT /api/conversations/${conversationId}/settings: Successfully updated settings for userId: ${userId}`,
      { conversationId, userId, knowledgeIds, projectIds },
    );
    return NextResponse.json({ message: "Settings updated" }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Extract just the necessary information from the ZodError
      const simplifiedIssues = error.issues.map(issue => ({
        path: issue.path,
        code: issue.code,
        message: issue.message
      }));
      
      logger.warn(
        `PUT /api/conversations/${conversationId}/settings: Bad Request - Invalid input for userId: ${userId}`,
        { 
          errorType: 'ZodError',
          conversationId, 
          userId, 
          issues: simplifiedIssues 
        }
      );
      
      return NextResponse.json(
        { error: "Validation Error", issues: simplifiedIssues }, 
        { status: 400 }
      );
    }
    
    logger.error(
      `PUT /api/conversations/${conversationId}/settings: Failed to update settings for userId: ${userId}`,
      { conversationId, userId, error: error instanceof Error ? error.message : String(error) },
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
