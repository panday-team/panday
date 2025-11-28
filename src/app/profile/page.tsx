"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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
import {
  Pencil,
  ArrowLeft,
  Check,
  X,
  LogOut,
  Settings,
  User,
  Zap,
  GraduationCap,
  MapPin,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
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

type EditableField =
  | keyof Pick<
      UserProfileData,
      "trade" | "currentLevel" | "specialization" | "residencyStatus"
    >
  | null;

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useUser();
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
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="text-muted-foreground text-sm">Loading profile...</p>
        </div>
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
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border/40 bg-card/50 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/roadmap"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Roadmap</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Profile Header Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="from-primary/10 via-primary/5 h-24 bg-gradient-to-r to-transparent" />
          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end gap-4">
              {/* Avatar */}
              <div className="ring-background flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-3xl font-bold text-white ring-4">
                {user?.firstName?.[0]?.toUpperCase() ??
                  user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ??
                  "U"}
              </div>
              <div className="mb-2 flex-1">
                <h1 className="text-2xl font-bold">
                  {user?.firstName
                    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
                    : "Your Profile"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {user?.emailAddresses[0]?.emailAddress ??
                    "Manage your apprenticeship journey"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings Section */}
        <div className="mb-6 flex items-center gap-2">
          <Settings className="text-muted-foreground h-5 w-5" />
          <h2 className="text-lg font-semibold">Apprenticeship Settings</h2>
        </div>

        <div className="space-y-4">
          {/* Trade Field */}
          <ProfileField
            icon={<Zap className="h-4 w-4" />}
            label="Trade"
            value={TRADE_METADATA[profile.trade].label}
            description={TRADE_METADATA[profile.trade].description}
            isEditing={editingField === "trade"}
            onEdit={() => startEditing("trade")}
            onCancel={cancelEditing}
            onSave={saveField}
            isSaving={isSaving}
            canSave={!!editTrade}
            editContent={
              <TradeSelector
                selectedTrade={editTrade}
                onSelectTrade={setEditTrade}
              />
            }
          />

          {/* Current Level Field */}
          <ProfileField
            icon={<GraduationCap className="h-4 w-4" />}
            label="Current Level"
            value={LEVEL_METADATA[profile.currentLevel].label}
            description={LEVEL_METADATA[profile.currentLevel].description}
            isEditing={editingField === "currentLevel"}
            onEdit={() => startEditing("currentLevel")}
            onCancel={cancelEditing}
            onSave={saveField}
            isSaving={isSaving}
            canSave={!!editLevel}
            editContent={
              <LevelSelector
                selectedLevel={editLevel}
                onSelectLevel={setEditLevel}
              />
            }
          />

          {/* Specialization Field */}
          <ProfileField
            icon={<User className="h-4 w-4" />}
            label="Specialization"
            value={SPECIALIZATION_METADATA[profile.specialization].label}
            description={
              SPECIALIZATION_METADATA[profile.specialization].description
            }
            badge={
              profile.specialization !== "undecided"
                ? `Red Seal ${SPECIALIZATION_METADATA[profile.specialization].redSealCode}`
                : undefined
            }
            isEditing={editingField === "specialization"}
            onEdit={() => startEditing("specialization")}
            onCancel={cancelEditing}
            onSave={saveField}
            isSaving={isSaving}
            canSave={!!editSpecialization}
            editContent={
              <SpecializationSelector
                selectedSpecialization={editSpecialization}
                onSelectSpecialization={setEditSpecialization}
              />
            }
          />

          {/* Residency Status Field */}
          <ProfileField
            icon={<MapPin className="h-4 w-4" />}
            label="Residency Status"
            value={RESIDENCY_STATUS_METADATA[profile.residencyStatus].label}
            description={
              RESIDENCY_STATUS_METADATA[profile.residencyStatus].description
            }
            isEditing={editingField === "residencyStatus"}
            onEdit={() => startEditing("residencyStatus")}
            onCancel={cancelEditing}
            onSave={saveField}
            isSaving={isSaving}
            canSave={!!editResidency}
            editContent={
              <ResidencySelector
                selectedStatus={editResidency}
                onSelectStatus={setEditResidency}
              />
            }
          />
        </div>

        {/* Account Section */}
        <div className="mt-10 mb-6 flex items-center gap-2">
          <Calendar className="text-muted-foreground h-5 w-5" />
          <h2 className="text-lg font-semibold">Account</h2>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Member Since
                </p>
                <p className="mt-1 font-medium">
                  {new Date(profile.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Last Updated
                </p>
                <p className="mt-1 font-medium">
                  {new Date(profile.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="border-border mt-6 border-t pt-6">
              <SignOutButton>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </SignOutButton>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface ProfileFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  badge?: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  canSave: boolean;
  editContent: React.ReactNode;
}

function ProfileField({
  icon,
  label,
  value,
  description,
  badge,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
  canSave,
  editContent,
}: ProfileFieldProps) {
  return (
    <Card
      className={`transition-all duration-200 ${isEditing ? "ring-primary/20 ring-2" : ""}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground">{icon}</div>
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit {label}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            {editContent}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={!canSave || isSaving}
                className="bg-teal-500 hover:bg-teal-600"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{value}</p>
              {badge && (
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
