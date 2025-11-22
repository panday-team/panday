import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db as prisma } from "@/server/db";
import {
  TRADES,
  APPRENTICESHIP_LEVELS,
  ELECTRICIAN_SPECIALIZATION,
  RESIDENCY_STATUS,
} from "@/lib/profile-types";
import {
  withErrorHandling,
  parseJsonBody,
  notFound,
  created,
} from "@/lib/api-handler";

// Validation schemas
const createProfileSchema = z.object({
  trade: z.enum([TRADES.ELECTRICIAN, TRADES.EXPLORING, TRADES.OTHER]),
  currentLevel: z.enum([
    APPRENTICESHIP_LEVELS.NOT_STARTED,
    APPRENTICESHIP_LEVELS.FOUNDATION,
    APPRENTICESHIP_LEVELS.LEVEL_1,
    APPRENTICESHIP_LEVELS.LEVEL_2,
    APPRENTICESHIP_LEVELS.LEVEL_3,
    APPRENTICESHIP_LEVELS.LEVEL_4,
    APPRENTICESHIP_LEVELS.RED_SEAL,
  ]),
  specialization: z.enum([
    ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
    ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
    ELECTRICIAN_SPECIALIZATION.UNDECIDED,
  ]),
  residencyStatus: z.enum([
    RESIDENCY_STATUS.CITIZEN,
    RESIDENCY_STATUS.PERMANENT_RESIDENT,
    RESIDENCY_STATUS.OTHER,
  ]),
});

const updateProfileSchema = createProfileSchema.partial();

/**
 * GET /api/profile - Fetch current user's profile
 */
export const GET = withErrorHandling(
  async (_request, { userId, logger }) => {
    const profile = await prisma.userProfile.findUnique({
      where: { clerkUserId: userId! },
    });

    if (!profile) {
      return notFound("Profile not found");
    }

    logger.info("Profile fetched", { userId });

    return NextResponse.json(profile);
  },
  { requireAuth: true, loggerContext: "profile-api" },
);

/**
 * POST /api/profile - Create or update user profile
 */
export const POST = withErrorHandling(
  async (request: NextRequest, { userId, logger }) => {
    const validatedData = await parseJsonBody(request, createProfileSchema);

    // Upsert profile (create or update)
    const profile = await prisma.userProfile.upsert({
      where: { clerkUserId: userId! },
      update: {
        ...validatedData,
        onboardingCompletedAt: new Date(),
      },
      create: {
        clerkUserId: userId!,
        ...validatedData,
        onboardingCompletedAt: new Date(),
      },
    });

    logger.info("Profile created/updated", {
      userId,
      profileId: profile.id,
    });

    return created(profile);
  },
  {
    requireAuth: true,
    loggerContext: "profile-api",
    errorPrefix: "Failed to create/update profile",
  },
);

/**
 * PATCH /api/profile - Update existing user profile
 */
export const PATCH = withErrorHandling(
  async (request: NextRequest, { userId, logger }) => {
    const validatedData = await parseJsonBody(request, updateProfileSchema);

    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId: userId! },
    });

    if (!existingProfile) {
      return notFound("Profile not found");
    }

    // Update profile
    const profile = await prisma.userProfile.update({
      where: { clerkUserId: userId! },
      data: validatedData,
    });

    logger.info("Profile updated", { userId, profileId: profile.id });

    return NextResponse.json(profile);
  },
  {
    requireAuth: true,
    loggerContext: "profile-api",
    errorPrefix: "Failed to update profile",
  },
);
