"use client";

import {
  type ElectricianSpecialization,
  ELECTRICIAN_SPECIALIZATION,
  SPECIALIZATION_METADATA,
} from "@/lib/profile-types";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface SpecializationSelectorProps {
  selectedSpecialization: ElectricianSpecialization | null;
  onSelectSpecialization: (specialization: ElectricianSpecialization) => void;
}

export function SpecializationSelector({
  selectedSpecialization,
  onSelectSpecialization,
}: SpecializationSelectorProps) {
  const specializations = Object.values(ELECTRICIAN_SPECIALIZATION);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          Which electrician specialization are you pursuing?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Choose between Construction (309A) or Industrial (442A) tracks
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {specializations.map((specialization) => {
          const metadata = SPECIALIZATION_METADATA[specialization];
          const isSelected = selectedSpecialization === specialization;

          return (
            <Card
              key={specialization}
              onClick={() => onSelectSpecialization(specialization)}
              className={`cursor-pointer p-5 transition-all hover:scale-[1.02] ${
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
                  {metadata.redSealCode !== "N/A" && (
                    <p className="mt-0.5 text-xs font-medium text-teal-500">
                      Red Seal {metadata.redSealCode}
                    </p>
                  )}
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
