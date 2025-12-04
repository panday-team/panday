import { getCustomNodes } from "@/lib/custom-nodes";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { roadmapCache } from "@/lib/roadmap-cache";
import { RoadmapClientWrapper } from "@/components/roadmap-client-wrapper";
import { ErrorBoundary } from "@/components/error-boundary";
import { db as prisma } from "@/server/db";
import type {
  UserProfile,
  Trade,
  ApprenticeshipLevel,
  ElectricianSpecialization,
  ResidencyStatus,
} from "@/lib/profile-types";

export default async function RoadmapPage() {
  const { userId } = await auth();
  const roadmap = await roadmapCache.get("electrician-bc");

  // Fetch user profile for personalization (guests will have null profile)
  let userProfile: UserProfile | null = null;
  let customNodes: Awaited<ReturnType<typeof getCustomNodes>> = [];

  if (userId) {
    const dbProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId: userId },
    });

    // Redirect to onboarding if authenticated but profile incomplete
    if (!dbProfile?.onboardingCompletedAt) {
      redirect("/onboarding");
    }

    // Cast to extended type to handle pendingLevelUp field (added in migration)
    const extendedProfile = dbProfile as typeof dbProfile & {
      pendingLevelUp?: string | null;
    };

    userProfile = {
      id: dbProfile.id,
      clerkUserId: dbProfile.clerkUserId,
      trade: dbProfile.trade as Trade,
      currentLevel: dbProfile.currentLevel as ApprenticeshipLevel,
      specialization: (dbProfile.specialization ||
        "undecided") as ElectricianSpecialization,
      residencyStatus: dbProfile.residencyStatus as ResidencyStatus,
      onboardingCompletedAt: dbProfile.onboardingCompletedAt,
      tutorialCompletedAt: dbProfile.tutorialCompletedAt,
      pendingLevelUp:
        (extendedProfile.pendingLevelUp as ApprenticeshipLevel) ?? null,
      createdAt: dbProfile.createdAt,
      updatedAt: dbProfile.updatedAt,
    };

    customNodes = await getCustomNodes(userId, "electrician-bc");
  }

  return (
    <ErrorBoundary>
      <RoadmapClientWrapper
        roadmap={roadmap}
        userProfile={userProfile}
        initialCustomNodes={customNodes}
        userId={userId}
      />
    </ErrorBoundary>
  );
}
