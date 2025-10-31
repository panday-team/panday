"use client";

import {
  type ApprenticeshipLevel,
  APPRENTICESHIP_LEVELS,
  LEVEL_METADATA,
} from "@/lib/profile-types";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface LevelSelectorProps {
  selectedLevel: ApprenticeshipLevel | null;
  onSelectLevel: (level: ApprenticeshipLevel) => void;
}

export function LevelSelector({
  selectedLevel,
  onSelectLevel,
}: LevelSelectorProps) {
  const levels = Object.values(APPRENTICESHIP_LEVELS);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Where are you in your journey?</h2>
        <p className="mt-2 text-muted-foreground">
          Select your current apprenticeship level
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {levels.map((level) => {
          const metadata = LEVEL_METADATA[level];
          const isSelected = selectedLevel === level;

          return (
            <Card
              key={level}
              onClick={() => onSelectLevel(level)}
              className={`cursor-pointer p-4 transition-all hover:scale-[1.02] ${
                isSelected
                  ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500"
                  : "border-border hover:border-teal-500/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                    isSelected
                      ? "bg-teal-500 text-white"
                      : "border-2 border-muted-foreground/30"
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{metadata.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {metadata.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
