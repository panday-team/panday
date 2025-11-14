import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db as prisma } from "@/server/db";
import { createLogger } from "@/lib/logger";

const tutorialLogger = createLogger({ context: "tutorial-api" });

/**
 * POST /api/profile/tutorial - Mark tutorial as completed
 */
export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId: userId },
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Update tutorial completion timestamp
    const profile = await prisma.userProfile.update({
      where: { clerkUserId: userId },
      data: { tutorialCompletedAt: new Date() },
    });

    tutorialLogger.info("Tutorial marked as completed", {
      userId,
      profileId: profile.id,
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    tutorialLogger.error("Failed to mark tutorial as completed", error as Error);
    return NextResponse.json(
      { error: "Failed to update tutorial status" },
      { status: 500 },
    );
  }
}
