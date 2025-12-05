import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db as prisma } from "@/server/db";
import { withErrorHandling } from "@/lib/api-handler";

const resetDemoSchema = z.object({
  includeOnboarding: z.boolean().optional().default(false),
});

/**
 * Safely parse JSON body, returning empty object if body is empty or invalid
 */
async function safeParseBody(request: NextRequest) {
  try {
    const text = await request.text();
    if (!text || text.trim() === "") {
      return {};
    }
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

interface ResetDemoResponse {
  success: boolean;
  deleted: {
    nodeProgress: number;
    customNodes: number;
    chatThreads: number;
    chatSessions: number;
  };
  onboardingReset: boolean;
}

/**
 * POST /api/profile/reset-demo - Reset user's demo progress
 *
 * Clears all user progress data while keeping onboarding preferences intact:
 * - Sets tutorialCompletedAt to null (for analytics; caller should redirect to /roadmap?showTutorial=true)
 * - Deletes all NodeProgress records
 * - Deletes all CustomNode records
 * - Deletes all ChatThread records (messages cascade automatically)
 * - Deletes all ChatSession records (messages and QA pairs cascade automatically)
 *
 * If includeOnboarding is true, also deletes the UserProfile record entirely,
 * forcing the user to complete onboarding again.
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { userId, logger }) => {
    const body = await safeParseBody(request);
    const { includeOnboarding } = resetDemoSchema.parse(body);

    logger.info("Starting demo progress reset", { userId, includeOnboarding });

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

      if (includeOnboarding) {
        // Delete the entire profile for a fresh start
        await tx.userProfile.delete({
          where: { clerkUserId: userId! },
        });
      } else {
        // Reset tutorialCompletedAt to null (keeps onboardingCompletedAt intact)
        await tx.userProfile.update({
          where: { clerkUserId: userId! },
          data: { tutorialCompletedAt: null },
        });
      }

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
      onboardingReset: includeOnboarding,
    });

    const response: ResetDemoResponse = {
      success: true,
      deleted: result,
      onboardingReset: includeOnboarding,
    };

    return NextResponse.json(response);
  },
  {
    requireAuth: true,
    loggerContext: "reset-demo-api",
    errorPrefix: "Failed to reset demo progress",
  },
);
