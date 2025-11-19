"use client";

import { useState, useEffect, useCallback } from "react";
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
import { X } from "lucide-react";
import { TutorialSpotlight } from "@/components/tutorial-spotlight";

export type TutorialInteractionType =
  | "node-click"
  | "checkbox-click"
  | "zoom-change"
  | "chat-open"
  | "dropdown-open";

interface RoadmapTutorialProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onInteraction?: (interactionType: TutorialInteractionType) => void;
  onRequestViewportAdjustment?: (selector?: string) => void;
}

interface TutorialStep {
  id: string;
  title: string;
  body: string;
  highlightSelector?: string;
  highlightCount?: number;
  mergeHighlights?: boolean;
  adjustViewport?: boolean; // Whether to adjust viewport to show highlighted elements
  highlightPanelContent?: boolean; // Whether highlighting elements inside node-info-panel (requires higher z-index)
  position:
    | "center"
    | "top-center"
    | "top-left"
    | "top-right"
    | "left"
    | "right"
    | "bottom-left"
    | "bottom-right";
  requiresInteraction?: TutorialInteractionType;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Panday!",
    body: "Learn your career roadmap in 60 seconds.",
    position: "center",
  },
  {
    id: "roadmap-structure",
    title: "Main Career Path",
    body: "The yellow circles represent the milestones in your apprenticeship, from Level 1 to Level 4.",
    highlightSelector: "[data-node-type='hub']",
    highlightCount: 5,
    position: "top-center",
  },
  {
    id: "connector-nodes",
    title: "Three Types of Help",
    body: "Blue (Resources) = learning materials\nGreen (Actions) = tasks to complete\nOrange (Roadblocks) = challenges",
    highlightSelector:
      "[data-node-type='resources'], [data-node-type='actions'], [data-node-type='roadblocks']",
    highlightCount: 30, // Increase to capture all connector nodes
    position: "top-center",
  },
  {
    id: "click-node",
    title: "Click a Yellow Node",
    body: "Try it now - click any yellow circle!",
    highlightSelector: "[data-node-type='hub']",
    highlightCount: 1, // Just highlight the closest one
    adjustViewport: true, // Adjust viewport to show hub nodes clearly
    position: "top-center",
    requiresInteraction: "node-click",
  },
  {
    id: "node-details",
    title: "Click a Colored Connector",
    body: "Now click any blue, green, or orange circle to see its checklist!",
    highlightSelector:
      "[data-node-type='resources'], [data-node-type='actions'], [data-node-type='roadblocks']",
    highlightCount: 10,
    adjustViewport: true, // Adjust viewport to show connector nodes
    position: "top-right",
    requiresInteraction: "node-click",
  },
  {
    id: "open-dropdown",
    title: "Open the Checklist",
    body: "Click any of the highlighted dropdown buttons in the side panel to reveal checklist items!",
    highlightSelector: "[data-tutorial='dropdown-trigger']",
    highlightCount: 5, // Show multiple dropdowns so user can see all options
    highlightPanelContent: true, // Highlight elements inside node-info-panel
    position: "right",
    requiresInteraction: "dropdown-open",
  },
  {
    id: "mark-complete",
    title: "Track Your Progress",
    body: "Now check a box to mark it complete!",
    highlightSelector: "[data-tutorial='checklist-checkbox']",
    highlightCount: 10,
    mergeHighlights: true, // Merge all checkboxes into one bounding box
    highlightPanelContent: true, // Highlight elements inside node-info-panel
    position: "right",
    requiresInteraction: "checkbox-click",
  },
  {
    id: "pan-zoom",
    title: "Navigate the Map",
    body: "Click and drag anywhere to explore.",
    highlightSelector: "[data-tutorial='react-flow']",
    position: "top-center",
  },
  {
    id: "zoom-slider",
    title: "Zoom Controls",
    body: "Use the slider, scroll, or pinch to zoom.",
    highlightSelector: "[data-tutorial='zoom-slider']",
    position: "top-right",
    requiresInteraction: "zoom-change",
  },
  {
    id: "chatbot",
    title: "AI Assistant",
    body: "Click here for instant help anytime.",
    highlightSelector: "[data-tutorial='chat-button']",
    position: "top-right",
    requiresInteraction: "chat-open",
  },
  {
    id: "complete",
    title: "You're Ready!",
    body: "Click the book icon anytime to replay this tutorial.",
    position: "center",
  },
];

export function RoadmapTutorial({
  open,
  onComplete,
  onSkip,
  onInteraction,
  onRequestViewportAdjustment,
}: RoadmapTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });

  const currentStepData = TUTORIAL_STEPS[currentStep];
  const isWelcome = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const waitingForInteraction =
    currentStepData?.requiresInteraction && !isLastStep;

  // Request viewport adjustment when step changes
  useEffect(() => {
    if (
      open &&
      currentStepData?.adjustViewport &&
      currentStepData.highlightSelector &&
      onRequestViewportAdjustment
    ) {
      // Small delay to ensure elements are rendered
      const timer = setTimeout(() => {
        onRequestViewportAdjustment(currentStepData.highlightSelector);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, open, currentStepData, onRequestViewportAdjustment]);

  // Calculate card and arrow positions
  useEffect(() => {
    if (!open || !currentStepData) return;

    const updatePositions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const cardWidth = 500;
      const cardHeight = 250;

      let x = 0;
      let y = 0;

      switch (currentStepData.position) {
        case "center":
          x = (viewportWidth - cardWidth) / 2;
          y = (viewportHeight - cardHeight) / 2;
          break;
        case "top-center":
          x = (viewportWidth - cardWidth) / 2;
          y = Math.max(120, viewportHeight * 0.15);
          break;
        case "top-left":
          x = 40;
          y = Math.max(120, viewportHeight * 0.15);
          break;
        case "top-right":
          x = viewportWidth - cardWidth - 40;
          y = Math.max(120, viewportHeight * 0.15);
          break;
        case "left":
          x = 40;
          y = Math.max(120, (viewportHeight - cardHeight) / 2);
          break;
        case "right":
          x = viewportWidth - cardWidth - 40;
          y = (viewportHeight - cardHeight) / 2;
          break;
        case "bottom-left":
          x = 40;
          y = viewportHeight - cardHeight - 40;
          break;
        case "bottom-right":
          x = viewportWidth - cardWidth - 40;
          y = viewportHeight - cardHeight - 40;
          break;
      }

      setCardPosition({ x, y });
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions);

    // Update on a slight delay to ensure DOM is ready
    const timeout = setTimeout(updatePositions, 100);

    return () => {
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions);
      clearTimeout(timeout);
    };
  }, [open, currentStep, currentStepData]);

  // Handle interaction from parent
  const handleInteractionReceived = useCallback(
    (interactionType: TutorialInteractionType) => {
      if (
        currentStepData?.requiresInteraction === interactionType &&
        !isLastStep
      ) {
        // Auto-advance to next step
        setCurrentStep((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
      }
    },
    [currentStepData, isLastStep],
  );

  // Expose interaction handler via prop
  useEffect(() => {
    if (onInteraction) {
      // This is a bit of a hack, but we need to forward interactions
      // In practice, the parent will call this directly
    }
  }, [onInteraction]);

  // Store the handler so parent can call it
  useEffect(() => {
    if (open && onInteraction) {
      (
        window as Window & {
          __tutorialInteractionHandler?: (
            type: TutorialInteractionType,
          ) => void;
        }
      ).__tutorialInteractionHandler = handleInteractionReceived;
    }
    return () => {
      const win = window as Window & {
        __tutorialInteractionHandler?: (type: TutorialInteractionType) => void;
      };
      delete win.__tutorialInteractionHandler;
    };
  }, [open, onInteraction, handleInteractionReceived]);

  const handleNext = () => {
    if (!waitingForInteraction) {
      if (currentStep < TUTORIAL_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onSkip();
  };

  const handleComplete = () => {
    setCurrentStep(0);
    onComplete();
  };

  // Guard against invalid step
  if (!currentStepData) {
    return null;
  }

  return (
    <Dialog open={open} modal={false}>
      <DialogPortal>
        <DialogOverlay className="pointer-events-none bg-transparent" />

        {/* Tutorial Spotlight */}
        <TutorialSpotlight
          targetSelector={currentStepData.highlightSelector}
          targetCount={currentStepData.highlightCount}
          show={open}
          padding={20}
          mergeHighlights={currentStepData.mergeHighlights}
          highlightPanelContent={currentStepData.highlightPanelContent}
        />

        <DialogContent
          className="z-[10003] border-0 bg-transparent p-0 shadow-none"
          style={{
            position: "fixed",
            left: cardPosition.x,
            top: cardPosition.y,
            maxWidth: "500px",
            transform: "none",
          }}
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
              <Card className="relative w-full rounded-[20px] bg-white p-8 shadow-2xl">
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

                  {waitingForInteraction && (
                    <p className="mt-4 text-xs text-gray-600 italic">
                      Waiting for you to try it...
                    </p>
                  )}
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
                      disabled={waitingForInteraction}
                      className="h-9 w-28 rounded-[20px] bg-[#5deadc] text-sm font-medium text-black hover:bg-[#5deadc]/90 disabled:cursor-not-allowed disabled:opacity-50"
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
