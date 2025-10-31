"use client";

import { useState } from "react";
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
import { TradeSelector } from "@/components/onboarding/trade-selector";
import { LevelSelector } from "@/components/onboarding/level-selector";
import { PathSelector } from "@/components/onboarding/path-selector";
import { ResidencySelector } from "@/components/onboarding/residency-selector";
import { ProgressIndicator } from "@/components/onboarding/progress-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { createLogger } from "@/lib/logger";

const onboardingLogger = createLogger({ context: "onboarding" });

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ApprenticeshipLevel | null>(
    null,
  );
  const [selectedPath, setSelectedPath] = useState<EntryPath | null>(null);
  const [selectedResidency, setSelectedResidency] =
    useState<ResidencyStatus | null>(null);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedTrade !== null;
      case 2:
        return selectedLevel !== null;
      case 3:
        return selectedPath !== null;
      case 4:
        return selectedResidency !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed() && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTrade || !selectedLevel || !selectedPath || !selectedResidency) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade: selectedTrade,
          currentLevel: selectedLevel,
          entryPath: selectedPath,
          residencyStatus: selectedResidency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create profile");
      }

      onboardingLogger.info("Onboarding completed successfully");
      router.push("/roadmap");
    } catch (error) {
      onboardingLogger.error("Onboarding submission failed", error as Error);
      alert("Failed to save your profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to Panday</h1>
          <p className="mt-2 text-muted-foreground">
            Let&apos;s personalize your apprenticeship roadmap
          </p>
        </div>

        <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        <Card className="p-6 md:p-8">
          {currentStep === 1 && (
            <TradeSelector
              selectedTrade={selectedTrade}
              onSelectTrade={setSelectedTrade}
            />
          )}

          {currentStep === 2 && (
            <LevelSelector
              selectedLevel={selectedLevel}
              onSelectLevel={setSelectedLevel}
            />
          )}

          {currentStep === 3 && (
            <PathSelector
              selectedPath={selectedPath}
              onSelectPath={setSelectedPath}
            />
          )}

          {currentStep === 4 && selectedResidency === null && (
            <ResidencySelector
              selectedStatus={selectedResidency}
              onSelectStatus={setSelectedResidency}
            />
          )}

          {currentStep === 4 && selectedResidency !== null && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-teal-500" />
                <h2 className="mt-4 text-2xl font-bold">
                  Review Your Information
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Make sure everything looks correct before continuing
                </p>
              </div>

              <div className="space-y-4 rounded-lg bg-muted/50 p-6">
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="font-medium">Trade:</span>
                  <span className="text-muted-foreground">
                    {selectedTrade && TRADE_METADATA[selectedTrade].label}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="font-medium">Current Level:</span>
                  <span className="text-muted-foreground">
                    {selectedLevel && LEVEL_METADATA[selectedLevel].label}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="font-medium">Entry Path:</span>
                  <span className="text-muted-foreground">
                    {selectedPath && ENTRY_PATH_METADATA[selectedPath].label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Residency Status:</span>
                  <span className="text-muted-foreground">
                    {selectedResidency &&
                      RESIDENCY_STATUS_METADATA[selectedResidency].label}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < TOTAL_STEPS || selectedResidency === null ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-teal-500 hover:bg-teal-600"
            >
              {isSubmitting ? "Saving..." : "Complete Onboarding"}
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
