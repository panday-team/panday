"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type ApprenticeshipLevel,
  type ElectricianSpecialization,
  LEVEL_METADATA,
  getNextLevelProgression,
} from "@/lib/profile-types";
import type { ProgressData } from "@/lib/progress-utils";

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotation: number;
  scale: number;
}

const CONFETTI_COLORS = [
  "#FFD84D", // Yellow (hub color)
  "#35C1B9", // Teal (connector color)
  "#00A36C", // Green (completed color)
  "#FF6B6B", // Coral
  "#4ECDC4", // Mint
  "#FFE66D", // Light yellow
  "#95E1D3", // Seafoam
  "#F38181", // Salmon
];

function Confetti({ isActive }: { isActive: boolean }) {
  const pieces = useMemo<ConfettiPiece[]>(() => {
    if (!isActive) return [];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
    }));
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute top-0 h-3 w-3 rounded-sm"
          style={{
            left: `${piece.x}%`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
          }}
          initial={{ y: -20, opacity: 1 }}
          animate={{
            y: "100vh",
            opacity: [1, 1, 0],
            rotate: piece.rotation + 720,
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: piece.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

interface LevelUpCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLevel: ApprenticeshipLevel;
  specialization?: ElectricianSpecialization;
  completedNodeId: string;
  completedNodeTitle: string;
  progress: ProgressData;
  onAdvanceLevel: () => Promise<void>;
  onStayHere: () => void;
  isAdvancing?: boolean;
}

export function LevelUpCelebration({
  open,
  onOpenChange,
  currentLevel,
  specialization,
  completedNodeTitle,
  progress,
  onAdvanceLevel,
  onStayHere,
  isAdvancing = false,
}: LevelUpCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  const progression = useMemo(
    () => getNextLevelProgression(currentLevel, specialization),
    [currentLevel, specialization],
  );

  const nextLevelLabel = progression.nextLevel
    ? LEVEL_METADATA[progression.nextLevel].label
    : null;

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleAdvance = useCallback(async () => {
    await onAdvanceLevel();
  }, [onAdvanceLevel]);

  const handleStay = useCallback(() => {
    onStayHere();
    onOpenChange(false);
  }, [onStayHere, onOpenChange]);

  return (
    <>
      <Confetti isActive={showConfetti} />
      <AnimatePresence>
        {open && (
          <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
              className="sm:max-w-md"
              showCloseButton={!isAdvancing}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <DialogHeader className="text-center sm:text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      delay: 0.2,
                      stiffness: 200,
                      damping: 10,
                    }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-4xl shadow-lg"
                  >
                    {progression.isFinalLevel ? "🏆" : "🎉"}
                  </motion.div>

                  <DialogTitle className="text-2xl">
                    {progression.isFinalLevel
                      ? "Congratulations!"
                      : `${completedNodeTitle} Complete!`}
                  </DialogTitle>

                  <div className="space-y-3 pt-2">
                    <DialogDescription className="text-base">
                      {progression.celebrationMessage}
                    </DialogDescription>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Badge
                        variant="outline"
                        className="bg-green-500/10 text-green-600 dark:text-green-400"
                      >
                        {progress.completed} of {progress.total} items completed
                      </Badge>
                    </div>

                    {!progression.isFinalLevel && nextLevelLabel && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-2 pt-2"
                      >
                        <span className="text-muted-foreground text-sm">
                          Next up:
                        </span>
                        <Badge
                          variant="default"
                          className="bg-teal-500/20 text-teal-700 dark:text-teal-300"
                        >
                          {nextLevelLabel}
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                </DialogHeader>

                <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col">
                  {progression.nextLevel && !progression.isFinalLevel ? (
                    <>
                      <Button
                        onClick={handleAdvance}
                        disabled={isAdvancing}
                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-400 hover:to-emerald-400"
                      >
                        {isAdvancing ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Infinity,
                              duration: 1,
                              ease: "linear",
                            }}
                            className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                          />
                        ) : null}
                        {isAdvancing
                          ? "Advancing..."
                          : `Continue to ${nextLevelLabel}`}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleStay}
                        disabled={isAdvancing}
                        className="w-full"
                      >
                        Stay Here
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleStay}
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:from-yellow-400 hover:to-amber-400"
                    >
                      {progression.isFinalLevel ? "Amazing!" : "Continue"}
                    </Button>
                  )}
                </DialogFooter>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
