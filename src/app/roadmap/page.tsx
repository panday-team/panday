import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { roadmapCache } from "@/lib/roadmap-cache";
import { RoadmapFlow } from "@/components/roadmap-flow";
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

  // Fetch user profile for personalization
  let userProfile: UserProfile | null = null;
  if (userId) {
    const dbProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId: userId },
    });

    // Redirect to onboarding if profile doesn't exist or onboarding not completed
    if (!dbProfile?.onboardingCompletedAt) {
      redirect("/onboarding");
    }

    userProfile = {
      id: dbProfile.id,
      clerkUserId: dbProfile.clerkUserId,
      trade: dbProfile.trade as Trade,
      currentLevel: dbProfile.currentLevel as ApprenticeshipLevel,
      specialization: dbProfile.specialization as ElectricianSpecialization,
      residencyStatus: dbProfile.residencyStatus as ResidencyStatus,
      onboardingCompletedAt: dbProfile.onboardingCompletedAt,
      createdAt: dbProfile.createdAt,
      updatedAt: dbProfile.updatedAt,
    };
  }

  return (
    <ErrorBoundary>
      <RoadmapFlow roadmap={roadmap} userProfile={userProfile} />
    </ErrorBoundary>
  );
}
