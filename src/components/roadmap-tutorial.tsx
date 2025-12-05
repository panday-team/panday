"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TutorialSpotlight } from "@/components/tutorial-spotlight";
import { useResponsive } from "@/lib/use-responsive";

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
  onStepChange?: (step: TutorialStep) => void;
}

export interface TutorialStepViewport {
  zoom?: number | "auto" | { mobile: number; tablet: number; desktop: number };
  center?: "auto" | "fit-all" | "no-change" | "user-level";
  closeNodePanel?: boolean;
  closeChatWidget?: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  highlightSelector?: string;
  highlightCount?: number;
  mergeHighlights?: boolean;
  adjustViewport?: boolean; // Whether to adjust viewport to show highlighted elements
  viewport?: TutorialStepViewport; // Responsive viewport configuration
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
  mobilePosition?: "center" | "bottom-sheet" | "fullscreen-overlay"; // Override position on mobile
  customYOffset?: number; // Custom Y-axis offset in pixels (positive = down, negative = up)
  customXOffset?: number; // Custom X-axis offset in pixels (positive = right, negative = left)
  requiresInteraction?: TutorialInteractionType;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Panday!",
    body: "Learn your career roadmap in 60 seconds.",
    position: "center",
    mobilePosition: "fullscreen-overlay",
    viewport: {
      zoom: { mobile: 0.4, tablet: 0.6, desktop: 0.8 },
      center: "user-level", // Move to user's current level (same as initial viewport)
      closeNodePanel: true,
      closeChatWidget: true,
    },
  },
  {
    id: "roadmap-structure",
    title: "Main Career Path",
    body: "The yellow circles represent the milestones in your apprenticeship, from Level 1 to Level 4.",
    highlightSelector: "[data-node-type='hub']",
    highlightCount: 5,
    position: "center",
    mobilePosition: "bottom-sheet",
    customYOffset: -100,
    viewport: {
      zoom: { mobile: 0.5, tablet: 0.7, desktop: 0.8 },
      center: "user-level", // Move to user's current level (same as initial viewport)
      closeNodePanel: true,
      closeChatWidget: true,
    },
  },
  {
    id: "connector-nodes",
    title: "Three Types of Help",
    body: "Blue (Resources) = learning materials\nGreen (Actions) = tasks to complete\nOrange (Roadblocks) = challenges",
    highlightSelector:
      "[data-node-type='resources'], [data-node-type='actions'], [data-node-type='roadblocks']",
    highlightCount: 30,
    position: "top-center",
    mobilePosition: "bottom-sheet",
    customYOffset: -80,
    viewport: {
      zoom: { mobile: 0.6, tablet: 0.8, desktop: 0.9 },
      center: "no-change",
      closeNodePanel: true,
      closeChatWidget: true,
    },
  },
  {
    id: "click-node",
    title: "Click a Yellow Node",
    body: "Try it now - click any yellow circle!",
    highlightSelector: "[data-node-type='hub']",
    highlightCount: 1,
    adjustViewport: false,
    position: "top-center",
    mobilePosition: "bottom-sheet",
    customYOffset: -100,
    viewport: {
      zoom: { mobile: 0.7, tablet: 0.9, desktop: 1.0 },
      center: "no-change",
      closeNodePanel: true,
      closeChatWidget: true,
    },
    requiresInteraction: "node-click",
  },
  {
    id: "node-details",
    title: "Click a Colored Connector",
    body: "Now click any blue, green, or orange circle to see its checklist!",
    highlightSelector:
      "[data-node-type='resources'], [data-node-type='actions'], [data-node-type='roadblocks']",
    highlightCount: 10,
    adjustViewport: false,
    position: "top-center",
    mobilePosition: "bottom-sheet",
    customYOffset: -100,
    viewport: {
      zoom: { mobile: 0.8, tablet: 1.0, desktop: 1.0 },
      center: "no-change",
      closeNodePanel: false, // Keep panel open after clicking
      closeChatWidget: true,
    },
    requiresInteraction: "node-click",
  },
  {
    id: "open-dropdown",
    title: "Open the Checklist",
    body: "Click any of the highlighted dropdown buttons in the side panel to reveal checklist items!",
    highlightSelector: "[data-tutorial='dropdown-trigger']",
    highlightCount: 5,
    highlightPanelContent: true,
    position: "right",
    mobilePosition: "bottom-sheet",
    customYOffset: -120,
    viewport: {
      zoom: { mobile: 1.0, tablet: 1.0, desktop: 1.0 },
      center: "no-change",
      closeNodePanel: false,
      closeChatWidget: true,
    },
    requiresInteraction: "dropdown-open",
  },
  {
    id: "mark-complete",
    title: "Track Your Progress",
    body: "Now check a box to mark it complete!",
    highlightSelector: "[data-tutorial='checklist-checkbox']",
    highlightCount: 10,
    mergeHighlights: true,
    highlightPanelContent: true,
    position: "right",
    mobilePosition: "bottom-sheet",
    viewport: {
      zoom: { mobile: 1.0, tablet: 1.0, desktop: 1.0 },
      center: "no-change",
      closeNodePanel: false,
      closeChatWidget: true,
    },
    requiresInteraction: "checkbox-click",
  },
  {
    id: "pan-zoom",
    title: "Navigate the Map",
    body: "Click and drag anywhere to explore.",
    highlightSelector: "[data-tutorial='react-flow']",
    position: "top-center",
    mobilePosition: "bottom-sheet",
    viewport: {
      zoom: { mobile: 0.6, tablet: 0.8, desktop: 0.8 },
      center: "no-change",
      closeNodePanel: true,
      closeChatWidget: true,
    },
  },
  {
    id: "zoom-slider",
    title: "Zoom Controls",
    body: "Use the slider, scroll, or pinch to zoom.",
    highlightSelector: "[data-tutorial='zoom-slider']",
    position: "top-right",
    mobilePosition: "bottom-sheet",
    viewport: {
      zoom: { mobile: 0.6, tablet: 0.8, desktop: 0.8 },
      center: "no-change",
      closeNodePanel: true,
      closeChatWidget: true,
    },
    requiresInteraction: "zoom-change",
  },
  {
    id: "chatbot",
    title: "AI Assistant",
    body: "Click here for instant help anytime.",
    highlightSelector: "[data-tutorial='chat-button']",
    position: "bottom-right",
    mobilePosition: "bottom-sheet",
    customXOffset: -100,
    viewport: {
      zoom: { mobile: 0.6, tablet: 0.8, desktop: 0.8 },
      center: "no-change",
      closeNodePanel: true,
      closeChatWidget: false, // Allow chat to stay open for demo
    },
    requiresInteraction: "chat-open",
  },
  {
    id: "complete",
    title: "You're Ready!",
    body: "Click the book icon anytime to replay this tutorial.",
    position: "center",
    mobilePosition: "fullscreen-overlay",
    viewport: {
      zoom: { mobile: 0.5, tablet: 0.7, desktop: 0.8 },
      center: "no-change",
      closeNodePanel: true,
      closeChatWidget: true,
    },
  },
];

export function RoadmapTutorial({
  open,
  onComplete,
  onSkip,
  onInteraction,
  onRequestViewportAdjustment,
  onStepChange,
}: RoadmapTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [cardDimensions, setCardDimensions] = useState({
    width: 500,
    height: 250,
  });
  const responsive = useResponsive();

  const currentStepData = TUTORIAL_STEPS[currentStep];
  const isWelcome = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const waitingForInteraction =
    currentStepData?.requiresInteraction && !isLastStep;

  // Notify parent when step changes (so it can control node panel, viewport, etc)
  useEffect(() => {
    if (open && currentStepData && onStepChange) {
      onStepChange(currentStepData);
    }
  }, [currentStep, open, currentStepData, onStepChange]);

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

  // Calculate responsive card dimensions and positions
  useEffect(() => {
    if (!open || !currentStepData) return;

    const updatePositions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Responsive card dimensions
      let cardWidth = 500;
      let cardHeight = 250;

      if (viewportWidth < 640) {
        // Mobile: smaller card, variable height
        cardWidth = Math.min(viewportWidth - 32, 400);
        cardHeight = Math.min(cardHeight, viewportHeight * 0.5);
      } else if (viewportWidth < 768) {
        // Small tablet
        cardWidth = Math.min(480, viewportWidth - 48);
      } else if (viewportWidth < 1024) {
        // Tablet
        cardWidth = Math.min(500, viewportWidth - 64);
      }

      setCardDimensions({ width: cardWidth, height: cardHeight });

      // Determine effective position (mobile override if specified)
      const effectivePosition =
        responsive.isMobile && currentStepData.mobilePosition
          ? currentStepData.mobilePosition
          : currentStepData.position;

      let x = 0;
      let y = 0;

      // Handle mobile-specific positions
      if (effectivePosition === "fullscreen-overlay") {
        x = (viewportWidth - cardWidth) / 2;
        y = (viewportHeight - cardHeight) / 2;
        setCardPosition({ x, y });
        return;
      }

      if (effectivePosition === "bottom-sheet") {
        x = (viewportWidth - cardWidth) / 2;
        y = viewportHeight - cardHeight - 16; // 16px from bottom
        setCardPosition({ x, y });
        return;
      }

      // Standard position handling
      const padding = responsive.isMobile ? 16 : 40;
      const topOffset = responsive.isMobile ? 80 : 120;

      switch (currentStepData.position) {
        case "center":
          x = (viewportWidth - cardWidth) / 2;
          y = (viewportHeight - cardHeight) / 2;
          break;
        case "top-center":
          x = (viewportWidth - cardWidth) / 2;
          y = Math.max(topOffset, viewportHeight * 0.15);
          break;
        case "top-left":
          x = padding;
          y = Math.max(topOffset, viewportHeight * 0.15);
          break;
        case "top-right":
          x = viewportWidth - cardWidth - padding;
          y = Math.max(topOffset, viewportHeight * 0.15);
          break;
        case "left":
          x = padding;
          y = Math.max(topOffset, (viewportHeight - cardHeight) / 2);
          break;
        case "right":
          x = viewportWidth - cardWidth - padding;
          y = (viewportHeight - cardHeight) / 2;
          break;
        case "bottom-left":
          x = padding;
          y = viewportHeight - cardHeight - padding;
          break;
        case "bottom-right":
          x = viewportWidth - cardWidth - padding;
          y = viewportHeight - cardHeight - padding;
          break;
      }

      // Apply custom X and Y offsets if provided
      if (currentStepData.customXOffset) {
        x += currentStepData.customXOffset;
      }
      if (currentStepData.customYOffset) {
        y += currentStepData.customYOffset;
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
  }, [open, currentStep, currentStepData, responsive.isMobile]);

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

        <DialogPrimitive.Content
          className="z-[10003] border-0 bg-transparent p-0 shadow-none"
          style={{
            position: "fixed",
            left: cardPosition.x,
            top: cardPosition.y,
            width: cardDimensions.width,
            maxHeight: cardDimensions.height,
          }}
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
              <Card
                className={`relative w-full rounded-[20px] bg-white shadow-2xl ${
                  responsive.isMobile ? "p-6" : "p-8"
                } max-h-full overflow-y-auto`}
              >
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
                <div
                  className={`flex items-center justify-center gap-3 ${
                    responsive.isMobile ? "flex-col" : "flex-row"
                  }`}
                >
                  {/* Back/Skip Button */}
                  {isWelcome ? (
                    <Button
                      onClick={handleSkip}
                      className={`h-9 rounded-[20px] bg-[#ec4447] text-sm font-medium text-black hover:bg-[#ec4447]/90 ${
                        responsive.isMobile ? "w-full" : "w-28"
                      }`}
                    >
                      Skip
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBack}
                      className={`h-9 rounded-[20px] bg-[#f2ee23] text-sm font-medium text-black hover:bg-[#f2ee23]/90 ${
                        responsive.isMobile ? "w-full" : "w-28"
                      }`}
                    >
                      Back
                    </Button>
                  )}

                  {/* Next/Start/Let's Go Button */}
                  {isWelcome ? (
                    <Button
                      onClick={handleNext}
                      className={`h-9 rounded-[20px] bg-[#5deadc] text-sm font-medium text-black hover:bg-[#5deadc]/90 ${
                        responsive.isMobile ? "w-full" : "w-28"
                      }`}
                    >
                      Start
                    </Button>
                  ) : isLastStep ? (
                    <Button
                      onClick={handleComplete}
                      className={`h-9 rounded-[20px] bg-[#76e54a] text-sm font-medium text-black hover:bg-[#76e54a]/90 ${
                        responsive.isMobile ? "w-full" : "w-28"
                      }`}
                    >
                      Let&apos;s Go
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={waitingForInteraction}
                      className={`h-9 rounded-[20px] bg-[#5deadc] text-sm font-medium text-black hover:bg-[#5deadc]/90 disabled:cursor-not-allowed disabled:opacity-50 ${
                        responsive.isMobile ? "w-full" : "w-28"
                      }`}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
