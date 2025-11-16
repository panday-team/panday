"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

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
    title: "Step 1/5: Explore Your Entire Career Path!",
    body: "This is your dynamic Panday Roadmap, visually charting your progress and future milestones. To effortlessly see your entire journey—where you've been and what's next—simply click and drag any empty space on the map to navigate with ease.",
  },
  {
    id: "zoom",
    title: "Step 2/5: Get the Perfect View",
    body: "Want to focus on a specific skill, or zoom out to grasp your overall growth? Achieve the ideal perspective instantly! Use CTRL + Scroll wheel (on your mouse/keyboard) or a pinch motion (on your trackpad) to fluidly adjust your view.",
  },
  {
    id: "select",
    title: "Step 3/5: Take Action & Update Your Status!",
    body: "Each glowing node on the map represents a crucial milestone or task in your career development. To dive into the details, track your progress, and mark off your achievements, simply click any node. Your journey, your updates!",
  },
  {
    id: "chat",
    title: "Step 4/5: Instant AI Career Support",
    body: "Never feel stuck on your path! Our intelligent AI Chatbot is your personal career assistant, available 24/7. Need quick advice, resources, or assistance on your current task? Just look for the friendly chat icon in the bottom-right corner of your screen.",
  },
  {
    id: "complete",
    title: "You're Ready!",
    body: "The Panday Roadmap is ready for your ambition. Use the controls you just learned to start charting your growth path now.\n\nNeed help? Find this tutorial anytime by clicking the book icon in the top-right corner.",
  },
];

export function RoadmapTutorial({ open, onComplete }: RoadmapTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleComplete = () => {
    setCurrentStep(0); // Reset for next time
    onComplete();
  };

  const currentStepData = TUTORIAL_STEPS[currentStep];
  const isWelcome = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  // Guard against invalid step
  if (!currentStepData) {
    return null;
  }

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
              <Card className="w-full rounded-[20px] bg-white p-8">
                {/* Step Indicators - Show arrows between steps except on welcome and last */}
                {!isWelcome && !isLastStep && (
                  <div className="mb-6 flex items-center justify-center gap-2">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                )}

                {/* Content */}
                <div className="mb-8 text-center">
                  <h3 className="mb-4 text-base font-bold text-black">
                    {currentStepData.title}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm font-normal leading-relaxed text-black">
                    {currentStepData.body}
                  </p>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-center gap-4">
                  {/* Back/Skip Button */}
                  {isWelcome ? (
                    <Button
                      onClick={handleSkip}
                      className="h-9 w-28 rounded-[20px] bg-[#ec4447] text-sm font-medium text-black hover:bg-[#ec4447]/90"
                    >
                      Skip
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBack}
                      className="h-9 w-28 rounded-[20px] bg-[#f2ee23] text-sm font-medium text-black hover:bg-[#f2ee23]/90"
                    >
                      Back
                    </Button>
                  )}

                  {/* Next/Start/Let's Go Button */}
                  {isWelcome ? (
                    <Button
                      onClick={handleNext}
                      className="h-9 w-28 rounded-[20px] bg-[#5deadc] text-sm font-medium text-black hover:bg-[#5deadc]/90"
                    >
                      Start
                    </Button>
                  ) : isLastStep ? (
                    <Button
                      onClick={handleComplete}
                      className="h-9 w-28 rounded-[20px] bg-[#76e54a] text-sm font-medium text-black hover:bg-[#76e54a]/90"
                    >
                      Let&apos;s Go
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      className="h-9 w-28 rounded-[20px] bg-[#5deadc] text-sm font-medium text-black hover:bg-[#5deadc]/90"
                    >
                      Next
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
