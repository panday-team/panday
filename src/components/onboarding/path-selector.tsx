"use client";

import {
  type EntryPath,
  ENTRY_PATHS,
  ENTRY_PATH_METADATA,
} from "@/lib/profile-types";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface PathSelectorProps {
  selectedPath: EntryPath | null;
  onSelectPath: (path: EntryPath) => void;
}

export function PathSelector({
  selectedPath,
  onSelectPath,
}: PathSelectorProps) {
  const paths = Object.values(ENTRY_PATHS);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Which entry path did you take?</h2>
        <p className="mt-2 text-muted-foreground">
          Select your apprenticeship entry route
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {paths.map((path) => {
          const metadata = ENTRY_PATH_METADATA[path];
          const isSelected = selectedPath === path;

          return (
            <Card
              key={path}
              onClick={() => onSelectPath(path)}
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
