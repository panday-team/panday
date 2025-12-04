import { NextResponse } from "next/server";
import { db as prisma } from "@/server/db";
import { withErrorHandling } from "@/lib/api-handler";

interface ResetDemoResponse {
  success: boolean;
  deleted: {
    nodeProgress: number;
    customNodes: number;
    chatThreads: number;
    chatSessions: number;
  };
}

/**
 * POST /api/profile/reset-demo - Reset user's demo progress
 *
 * Clears all user progress data while keeping onboarding preferences intact:
 * - Sets tutorialCompletedAt to null (triggers tutorial on next roadmap visit)
 * - Deletes all NodeProgress records
 * - Deletes all CustomNode records
 * - Deletes all ChatThread records (messages cascade automatically)
 * - Deletes all ChatSession records (messages and QA pairs cascade automatically)
 */
export const POST = withErrorHandling(
  async (_request, { userId, logger }) => {
    logger.info("Starting demo progress reset", { userId });

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Delete NodeProgress records
      const nodeProgressResult = await tx.nodeProgress.deleteMany({
        where: { userId: userId! },
      });

      // Delete CustomNode records
      const customNodesResult = await tx.customNode.deleteMany({
        where: { userId: userId! },
      });

      // Delete ChatThread records (messages cascade via onDelete: Cascade)
      const chatThreadsResult = await tx.chatThread.deleteMany({
        where: { userId: userId! },
      });

      // Delete ChatSession records (messages and QA pairs cascade via onDelete: Cascade)
      const chatSessionsResult = await tx.chatSession.deleteMany({
        where: { userId: userId! },
      });

      // Reset tutorialCompletedAt to null (keeps onboardingCompletedAt intact)
      await tx.userProfile.update({
        where: { clerkUserId: userId! },
        data: { tutorialCompletedAt: null },
      });

      return {
        nodeProgress: nodeProgressResult.count,
        customNodes: customNodesResult.count,
        chatThreads: chatThreadsResult.count,
        chatSessions: chatSessionsResult.count,
      };
    });

    logger.info("Demo progress reset completed", {
      userId,
      deleted: result,
    });

    const response: ResetDemoResponse = {
      success: true,
      deleted: result,
    };

    return NextResponse.json(response);
  },
  {
    requireAuth: true,
    loggerContext: "reset-demo-api",
    errorPrefix: "Failed to reset demo progress",
  },
);
