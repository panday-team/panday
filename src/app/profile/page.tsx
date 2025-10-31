"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Trade,
  type ApprenticeshipLevel,
  type EntryPath,
  type ResidencyStatus,
  TRADE_METADATA,
  LEVEL_METADATA,
  ENTRY_PATH_METADATA,
  RESIDENCY_STATUS_METADATA,
} from "@/lib/profile-types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Edit2, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

interface UserProfileData {
  id: number;
  clerkUserId: string;
  trade: Trade;
  currentLevel: ApprenticeshipLevel;
  entryPath: EntryPath;
  residencyStatus: ResidencyStatus;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = (await response.json()) as UserProfileData;
          setProfile(data);
        } else if (response.status === 404) {
          router.push("/onboarding");
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchProfile();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center p-4 pt-20">
      <div className="absolute top-4 right-4 md:top-10 md:right-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Profile</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your apprenticeship information
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/roadmap">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Roadmap
              </Button>
            </Link>
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Profile Information</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>

          {isEditing ? (
            <div className="space-y-4 rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                To edit your profile, please retake the onboarding survey.
              </p>
              <Link href="/onboarding">
                <Button className="w-full">Update Profile</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">
                  Trade:
                </span>
                <div className="text-right">
                  <div className="font-medium">
                    {TRADE_METADATA[profile.trade].label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {TRADE_METADATA[profile.trade].icon}{" "}
                    {TRADE_METADATA[profile.trade].description}
                  </div>
                </div>
              </div>

              <div className="flex justify-between border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">
                  Current Level:
                </span>
                <div className="text-right">
                  <div className="font-medium">
                    {LEVEL_METADATA[profile.currentLevel].label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {LEVEL_METADATA[profile.currentLevel].description}
                  </div>
                </div>
              </div>

              <div className="flex justify-between border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">
                  Entry Path:
                </span>
                <div className="text-right">
                  <div className="font-medium">
                    {ENTRY_PATH_METADATA[profile.entryPath].label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {ENTRY_PATH_METADATA[profile.entryPath].description}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">
                  Residency Status:
                </span>
                <div className="text-right">
                  <div className="font-medium">
                    {RESIDENCY_STATUS_METADATA[profile.residencyStatus].label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {
                      RESIDENCY_STATUS_METADATA[profile.residencyStatus]
                        .description
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Account Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profile Created:</span>
              <span>
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>
                {new Date(profile.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
