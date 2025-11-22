import { NextResponse } from "next/server";
import { db as prisma } from "@/server/db";
import { withErrorHandling, notFound } from "@/lib/api-handler";

/**
 * POST /api/profile/tutorial - Mark tutorial as completed
 */
export const POST = withErrorHandling<Request>(
  async (_request, { userId, logger }) => {
    // userId is guaranteed non-null due to requireAuth: true
    // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
    const authenticatedUserId = userId as string;

    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId: authenticatedUserId },
    });

    if (!existingProfile) {
      return notFound("Profile not found");
    }

    // Update tutorial completion timestamp
    const profile = await prisma.userProfile.update({
      where: { clerkUserId: authenticatedUserId },
      data: { tutorialCompletedAt: new Date() },
    });

    logger.info("Tutorial marked as completed", {
      userId: authenticatedUserId,
      profileId: profile.id,
    });

    return NextResponse.json({ success: true, profile });
  },
  { requireAuth: true, loggerContext: "tutorial:complete" },
);
