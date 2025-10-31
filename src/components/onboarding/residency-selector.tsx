"use client";

import {
  type ResidencyStatus,
  RESIDENCY_STATUS,
  RESIDENCY_STATUS_METADATA,
} from "@/lib/profile-types";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ResidencySelectorProps {
  selectedStatus: ResidencyStatus | null;
  onSelectStatus: (status: ResidencyStatus) => void;
}

export function ResidencySelector({
  selectedStatus,
  onSelectStatus,
}: ResidencySelectorProps) {
  const statuses = Object.values(RESIDENCY_STATUS);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          What is your residency status in Canada?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Apprenticeship programs in BC require Canadian citizenship or
          permanent resident status
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {statuses.map((status) => {
          const metadata = RESIDENCY_STATUS_METADATA[status];
          const isSelected = selectedStatus === status;
          const isEligible = metadata.eligible;

          return (
            <Card
              key={status}
              onClick={() => onSelectStatus(status)}
              className={`cursor-pointer p-5 transition-all hover:scale-[1.01] ${
                isSelected
                  ? isEligible
                    ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500"
                    : "border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500"
                  : "border-border hover:border-teal-500/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                    isSelected
                      ? isEligible
                        ? "bg-teal-500 text-white"
                        : "bg-yellow-500 text-white"
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
                  {isSelected && !isEligible && (
                    <div className="mt-3 flex items-start gap-2 rounded-md bg-yellow-500/20 p-3 text-sm">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      <p className="text-yellow-700 dark:text-yellow-300">
                        You may have limited eligibility for apprenticeship
                        programs. We recommend contacting the Industry Training
                        Authority (ITA) for specific requirements.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
