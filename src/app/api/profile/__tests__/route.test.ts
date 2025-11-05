import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PATCH } from "../route";
import { NextRequest } from "next/server";
import {
  TRADES,
  APPRENTICESHIP_LEVELS,
  ELECTRICIAN_SPECIALIZATION,
  RESIDENCY_STATUS,
} from "@/lib/profile-types";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock Prisma client
vi.mock("@/server/db", () => ({
  db: {
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe("Profile API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/profile", () => {
    it("should return 401 if user is not authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: null } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if profile does not exist", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Profile not found");
    });

    it("should return user profile if it exists", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const mockProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(mockProfile);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
      });
      expect(db.userProfile.findUnique).toHaveBeenCalledWith({
        where: { clerkUserId: "user_123" },
      });
    });

    it("should return 500 on database error", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockRejectedValueOnce(
        new Error("Database error"),
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch profile");
    });
  });

  describe("POST /api/profile", () => {
    it("should return 401 if user is not authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        body: JSON.stringify({
          trade: TRADES.ELECTRICIAN,
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
          specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
          residencyStatus: RESIDENCY_STATUS.CITIZEN,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for invalid profile data", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        body: JSON.stringify({
          trade: "INVALID_TRADE",
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
          specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
          residencyStatus: RESIDENCY_STATUS.CITIZEN,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid profile data");
      expect(data.details).toBeDefined();
    });

    it("should create new profile with onboardingCompletedAt", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const mockProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.upsert).mockResolvedValueOnce(mockProfile);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        body: JSON.stringify({
          trade: TRADES.ELECTRICIAN,
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
          specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
          residencyStatus: RESIDENCY_STATUS.CITIZEN,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
      });
      expect(db.userProfile.upsert).toHaveBeenCalledWith({
        where: { clerkUserId: "user_123" },
        update: expect.objectContaining({
          trade: TRADES.ELECTRICIAN,
          onboardingCompletedAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          clerkUserId: "user_123",
          trade: TRADES.ELECTRICIAN,
          onboardingCompletedAt: expect.any(Date),
        }),
      });
    });

    it("should update existing profile and set onboardingCompletedAt", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const mockProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
        specialization: ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
        residencyStatus: RESIDENCY_STATUS.PERMANENT_RESIDENT,
        onboardingCompletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.upsert).mockResolvedValueOnce(mockProfile);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        body: JSON.stringify({
          trade: TRADES.ELECTRICIAN,
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
          specialization: ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
          residencyStatus: RESIDENCY_STATUS.PERMANENT_RESIDENT,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.currentLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_2);
    });
  });

  describe("PATCH /api/profile", () => {
    it("should return 401 if user is not authenticated", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: null } as any);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if profile does not exist", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(null);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Profile not found");
    });

    it("should update a single field (currentLevel)", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const existingProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const updatedProfile = {
        ...existingProfile,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
        updatedAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(
        existingProfile,
      );
      vi.mocked(db.userProfile.update).mockResolvedValueOnce(updatedProfile);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.currentLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_2);
      expect(db.userProfile.update).toHaveBeenCalledWith({
        where: { clerkUserId: "user_123" },
        data: { currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2 },
      });
    });

    it("should update a single field (trade)", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const existingProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.EXPLORING,
        currentLevel: APPRENTICESHIP_LEVELS.NOT_STARTED,
        specialization: ELECTRICIAN_SPECIALIZATION.UNDECIDED,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const updatedProfile = {
        ...existingProfile,
        trade: TRADES.ELECTRICIAN,
        updatedAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(
        existingProfile,
      );
      vi.mocked(db.userProfile.update).mockResolvedValueOnce(updatedProfile);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          trade: TRADES.ELECTRICIAN,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trade).toBe(TRADES.ELECTRICIAN);
    });

    it("should update a single field (specialization)", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const existingProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const updatedProfile = {
        ...existingProfile,
        specialization: ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
        updatedAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(
        existingProfile,
      );
      vi.mocked(db.userProfile.update).mockResolvedValueOnce(updatedProfile);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          specialization: ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.specialization).toBe(ELECTRICIAN_SPECIALIZATION.INDUSTRIAL);
    });

    it("should update a single field (residencyStatus)", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const existingProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const updatedProfile = {
        ...existingProfile,
        residencyStatus: RESIDENCY_STATUS.PERMANENT_RESIDENT,
        updatedAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(
        existingProfile,
      );
      vi.mocked(db.userProfile.update).mockResolvedValueOnce(updatedProfile);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          residencyStatus: RESIDENCY_STATUS.PERMANENT_RESIDENT,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.residencyStatus).toBe(RESIDENCY_STATUS.PERMANENT_RESIDENT);
    });

    it("should update multiple fields at once", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const existingProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const updatedProfile = {
        ...existingProfile,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
        specialization: ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
        updatedAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(
        existingProfile,
      );
      vi.mocked(db.userProfile.update).mockResolvedValueOnce(updatedProfile);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
          specialization: ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.currentLevel).toBe(APPRENTICESHIP_LEVELS.LEVEL_2);
      expect(data.specialization).toBe(ELECTRICIAN_SPECIALIZATION.INDUSTRIAL);
      expect(db.userProfile.update).toHaveBeenCalledWith({
        where: { clerkUserId: "user_123" },
        data: {
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
          specialization: ELECTRICIAN_SPECIALIZATION.INDUSTRIAL,
        },
      });
    });

    it("should return 400 for invalid field value", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const existingProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(
        existingProfile,
      );

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          trade: "INVALID_TRADE_TYPE",
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid profile data");
      expect(data.details).toBeDefined();
    });

    it("should allow empty partial update (no-op)", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const existingProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(
        existingProfile,
      );
      vi.mocked(db.userProfile.update).mockResolvedValueOnce(existingProfile);

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({}),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(db.userProfile.update).toHaveBeenCalledWith({
        where: { clerkUserId: "user_123" },
        data: {},
      });
    });

    it("should return 500 on database error", async () => {
      const { auth } = await import("@clerk/nextjs/server");
      const { db } = await import("@/server/db");

      const existingProfile = {
        id: 1,
        clerkUserId: "user_123",
        trade: TRADES.ELECTRICIAN,
        currentLevel: APPRENTICESHIP_LEVELS.LEVEL_1,
        specialization: ELECTRICIAN_SPECIALIZATION.CONSTRUCTION,
        residencyStatus: RESIDENCY_STATUS.CITIZEN,
        onboardingCompletedAt: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      vi.mocked(auth).mockResolvedValueOnce({ userId: "user_123" } as any);
      vi.mocked(db.userProfile.findUnique).mockResolvedValueOnce(
        existingProfile,
      );
      vi.mocked(db.userProfile.update).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const request = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          currentLevel: APPRENTICESHIP_LEVELS.LEVEL_2,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update profile");
    });
  });
});
