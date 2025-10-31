import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db as prisma } from "@/server/db";
import {
  TRADES,
  APPRENTICESHIP_LEVELS,
  ENTRY_PATHS,
  RESIDENCY_STATUS,
} from "@/lib/profile-types";
import { createLogger } from "@/lib/logger";

const profileLogger = createLogger({ context: "profile-api" });

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
  entryPath: z.enum([
    ENTRY_PATHS.FOUNDATION,
    ENTRY_PATHS.ACE_IT,
    ENTRY_PATHS.DIRECT_ENTRY,
    ENTRY_PATHS.EXPLORING,
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
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { clerkUserId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    profileLogger.info("Profile fetched", { userId });

    return NextResponse.json(profile);
  } catch (error) {
    profileLogger.error("Failed to fetch profile", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/profile - Create or update user profile
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const validatedData = createProfileSchema.parse(body);

    // Upsert profile (create or update)
    const profile = await prisma.userProfile.upsert({
      where: { clerkUserId: userId },
      update: {
        ...validatedData,
        onboardingCompletedAt: new Date(),
      },
      create: {
        clerkUserId: userId,
        ...validatedData,
        onboardingCompletedAt: new Date(),
      },
    });

    profileLogger.info("Profile created/updated", {
      userId,
      profileId: profile.id,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      profileLogger.warn("Profile validation failed", { error: error.errors });
      return NextResponse.json(
        { error: "Invalid profile data", details: error.errors },
        { status: 400 },
      );
    }

    profileLogger.error("Failed to create/update profile", error as Error);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/profile - Update existing user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const validatedData = updateProfileSchema.parse(body);

    // Check if profile exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId: userId },
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Update profile
    const profile = await prisma.userProfile.update({
      where: { clerkUserId: userId },
      data: validatedData,
    });

    profileLogger.info("Profile updated", { userId, profileId: profile.id });

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      profileLogger.warn("Profile validation failed", { error: error.errors });
      return NextResponse.json(
        { error: "Invalid profile data", details: error.errors },
        { status: 400 },
      );
    }

    profileLogger.error("Failed to update profile", error as Error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
