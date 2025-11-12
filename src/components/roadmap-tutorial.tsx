"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
<<<<<<< HEAD
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface RoadmapTutorialProps {
  open: boolean;
  onComplete: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  body: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your Panday Career Roadmap!",
    body: "Your personalized guide to mastering your professional journey. This interactive tour will show you how to take full control of your growth from day one. Let's dive in!",
  },
  {
    id: "pan",
=======
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import type { Dispatch, SetStateAction } from "react";

const TUTORIAL_STEPS = [
  {
    id: 420,
>>>>>>> 63aafc6 (add: tutorial widget that appears for first time users + button to activate it)
    title: "Pan",
    description: "Click and drag empty space to move around the roadmap.",
  },
  {
<<<<<<< HEAD
    id: "zoom",
    title: "Step 2/5: Get the Perfect View",
    body: "Want to focus on a specific skill, or zoom out to grasp your overall growth? Achieve the ideal perspective instantly! Use the zoom slider in the bottom-left corner, CTRL + Scroll wheel (on your mouse/keyboard), or a pinch motion (on your trackpad) to fluidly adjust your view.",
  },
  {
<<<<<<< HEAD
    id: "select",
=======
    id: 67,
>>>>>>> 63aafc6 (add: tutorial widget that appears for first time users + button to activate it)
    title: "Select",
    description:
      "Click a node to open its details panel and update its status.",
  },
  {
<<<<<<< HEAD
    id: "chat",
=======
    id: 41,
>>>>>>> 63aafc6 (add: tutorial widget that appears for first time users + button to activate it)
    title: "Chat",
    description:
      "Get more assistance on your current progress with our AI Chatbot in the bottom-right corner",
  },
];

<<<<<<< HEAD
export function RoadmapTutorial({ open, onComplete }: RoadmapTutorialProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/70" />
        <DialogContent
          className="max-w-[500px] border-0 bg-transparent p-0 shadow-none"
          showCloseButton={false}
        >
          {/* Visually hidden title for screen reader accessibility */}
          <DialogTitle className="sr-only">
            Tutorial: {currentStepData.title}
          </DialogTitle>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="relative w-full rounded-[20px] bg-white p-8">
                {/* Skip button in top right corner */}
                <button
                  onClick={handleSkip}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white transition-colors hover:bg-red-600"
                  aria-label="Skip tutorial"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="mb-8 text-center">
                  <h3 className="mb-4 text-base font-bold text-black">
                    {currentStepData.title}
                  </h3>
                  <p className="text-sm leading-relaxed font-normal whitespace-pre-wrap text-black">
                    {currentStepData.body}
                  </p>
                </div>

        <DialogFooter>
          <Button onClick={onComplete}>Let&apos;s Go!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
=======
export default function RoadmapTutorialWidget({
  setShowTutorial,
  showTutorial,
}: {
  setShowTutorial: Dispatch<SetStateAction<boolean>>;
  showTutorial: boolean;
}) {
  return (
    <>
      <AlertDialog open={showTutorial ? true : false}>
        <AlertDialogContent className="mx-50">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-2xl">
              Roadmap Tutorial
            </AlertDialogTitle>
            <AlertDialogDescription>
              3 simple controls to navigate your career!
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div id="instructions" className="flex flex-col gap-4 text-center">
            {TUTORIAL_STEPS.map((step) => (
              <Card key={step.id} className="">
                <CardHeader>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          <AlertDialogAction onClick={() => setShowTutorial(false)}>
            Let&apos;s Go!
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
>>>>>>> 63aafc6 (add: tutorial widget that appears for first time users + button to activate it)
  );
}
