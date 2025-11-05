"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Trade,
  type ApprenticeshipLevel,
  type ElectricianSpecialization,
  type ResidencyStatus,
  TRADE_METADATA,
  LEVEL_METADATA,
  SPECIALIZATION_METADATA,
  RESIDENCY_STATUS_METADATA,
} from "@/lib/profile-types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TradeSelector } from "@/components/onboarding/trade-selector";
import { LevelSelector } from "@/components/onboarding/level-selector";
import { SpecializationSelector } from "@/components/onboarding/specialization-selector";
import { ResidencySelector } from "@/components/onboarding/residency-selector";
import { Edit2, ArrowLeft, Home, Check, X } from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";

const profileLogger = createLogger({ context: "profile-settings" });

interface UserProfileData {
  id: number;
  clerkUserId: string;
  trade: Trade;
  currentLevel: ApprenticeshipLevel;
  specialization: ElectricianSpecialization;
  residencyStatus: ResidencyStatus;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type EditableField = keyof Pick<
  UserProfileData,
  "trade" | "currentLevel" | "specialization" | "residencyStatus"
> | null;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Temporary state for editing
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [editLevel, setEditLevel] = useState<ApprenticeshipLevel | null>(null);
  const [editSpecialization, setEditSpecialization] =
    useState<ElectricianSpecialization | null>(null);
  const [editResidency, setEditResidency] = useState<ResidencyStatus | null>(
    null,
  );

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = (await response.json()) as UserProfileData;
          setProfile(data);
          profileLogger.info("Profile loaded successfully");
        } else if (response.status === 404) {
          router.push("/onboarding");
        }
      } catch (error) {
        profileLogger.error("Failed to load profile", error as Error);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchProfile();
  }, [router]);

  const startEditing = (field: EditableField) => {
    if (!profile || !field) return;

    setEditingField(field);

    // Initialize edit state with current value
    switch (field) {
      case "trade":
        setEditTrade(profile.trade);
        break;
      case "currentLevel":
        setEditLevel(profile.currentLevel);
        break;
      case "specialization":
        setEditSpecialization(profile.specialization);
        break;
      case "residencyStatus":
        setEditResidency(profile.residencyStatus);
        break;
    }
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditTrade(null);
    setEditLevel(null);
    setEditSpecialization(null);
    setEditResidency(null);
  };

  const saveField = async () => {
    if (!editingField) return;

    setIsSaving(true);

    try {
      const updateData: Partial<
        Pick<
          UserProfileData,
          "trade" | "currentLevel" | "specialization" | "residencyStatus"
        >
      > = {};

      switch (editingField) {
        case "trade":
          if (editTrade) updateData.trade = editTrade;
          break;
        case "currentLevel":
          if (editLevel) updateData.currentLevel = editLevel;
          break;
        case "specialization":
          if (editSpecialization)
            updateData.specialization = editSpecialization;
          break;
        case "residencyStatus":
          if (editResidency) updateData.residencyStatus = editResidency;
          break;
      }

      profileLogger.info("Updating profile field", {
        field: editingField,
        data: updateData,
      });

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: unknown;
        };
        profileLogger.error("API returned error", undefined, {
          status: response.status,
          errorData,
        });
        throw new Error(
          errorData.error ?? `Failed to update profile (${response.status})`,
        );
      }

      const updatedProfile = (await response.json()) as UserProfileData;
      setProfile(updatedProfile);
      profileLogger.info("Profile field updated successfully", {
        field: editingField,
      });
      cancelEditing();
    } catch (error) {
      profileLogger.error("Failed to update profile field", error as Error, {
        field: editingField,
      });
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      alert(`Failed to update your profile: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

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
              Click the edit button next to any field to update it
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

        <div className="space-y-4">
          {/* Trade Field */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-medium">Trade</CardTitle>
              {editingField !== "trade" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing("trade")}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingField === "trade" ? (
                <div className="space-y-4">
                  <TradeSelector
                    selectedTrade={editTrade}
                    onSelectTrade={setEditTrade}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveField}
                      disabled={!editTrade || isSaving}
                      className="bg-teal-500 hover:bg-teal-600"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {TRADE_METADATA[profile.trade].label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {TRADE_METADATA[profile.trade].icon}{" "}
                    {TRADE_METADATA[profile.trade].description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Level Field */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-medium">
                Current Level
              </CardTitle>
              {editingField !== "currentLevel" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing("currentLevel")}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingField === "currentLevel" ? (
                <div className="space-y-4">
                  <LevelSelector
                    selectedLevel={editLevel}
                    onSelectLevel={setEditLevel}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveField}
                      disabled={!editLevel || isSaving}
                      className="bg-teal-500 hover:bg-teal-600"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {LEVEL_METADATA[profile.currentLevel].label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {LEVEL_METADATA[profile.currentLevel].description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specialization Field */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-medium">
                Specialization
              </CardTitle>
              {editingField !== "specialization" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing("specialization")}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingField === "specialization" ? (
                <div className="space-y-4">
                  <SpecializationSelector
                    selectedSpecialization={editSpecialization}
                    onSelectSpecialization={setEditSpecialization}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveField}
                      disabled={!editSpecialization || isSaving}
                      className="bg-teal-500 hover:bg-teal-600"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {SPECIALIZATION_METADATA[profile.specialization].label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Red Seal{" "}
                    {SPECIALIZATION_METADATA[profile.specialization].redSealCode}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {SPECIALIZATION_METADATA[profile.specialization].description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Residency Status Field */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-medium">
                Residency Status
              </CardTitle>
              {editingField !== "residencyStatus" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditing("residencyStatus")}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingField === "residencyStatus" ? (
                <div className="space-y-4">
                  <ResidencySelector
                    selectedStatus={editResidency}
                    onSelectStatus={setEditResidency}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveField}
                      disabled={!editResidency || isSaving}
                      className="bg-teal-500 hover:bg-teal-600"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {RESIDENCY_STATUS_METADATA[profile.residencyStatus].label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {
                      RESIDENCY_STATUS_METADATA[profile.residencyStatus]
                        .description
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
