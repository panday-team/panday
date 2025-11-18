"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TutorialSpotlightProps {
  targetSelector?: string;
  targetCount?: number;
  show: boolean;
  padding?: number;
  mergeHighlights?: boolean;
}

export function TutorialSpotlight({
  targetSelector,
  targetCount = 1,
  show,
  padding = 20,
  mergeHighlights = false,
}: TutorialSpotlightProps) {
  const [highlights, setHighlights] = useState<
    Array<{ x: number; y: number; width: number; height: number }>
  >([]);

  useEffect(() => {
    if (!show || !targetSelector) {
      setHighlights([]);
      return;
    }

    let animationFrameId: number;
    let isRunning = true;

    const updateHighlights = () => {
      if (!isRunning) return;

      const elements = document.querySelectorAll(targetSelector);
      const newHighlights: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      // Helper to check if element is in viewport
      const isInViewport = (rect: DOMRect) => {
        return (
          rect.top >= -100 &&
          rect.left >= -100 &&
          rect.bottom <= window.innerHeight + 100 &&
          rect.right <= window.innerWidth + 100
        );
      };

      // First, try to find visible elements
      const visibleElements: Element[] = [];
      const allElements: Element[] = [];

      for (const element of elements) {
        if (element) {
          allElements.push(element);
          const rect = element.getBoundingClientRect();
          if (isInViewport(rect) && rect.width > 0 && rect.height > 0) {
            visibleElements.push(element);
          }
        }
      }

      // Use visible elements if available, otherwise use all elements
      const elementsToHighlight =
        visibleElements.length > 0 ? visibleElements : allElements;
      const count = Math.min(elementsToHighlight.length, targetCount);

      // Collect individual rects
      const individualRects: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      for (let i = 0; i < count; i++) {
        const element = elementsToHighlight[i];
        if (element) {
          const rect = element.getBoundingClientRect();
          // Only add if it has dimensions
          if (rect.width > 0 && rect.height > 0) {
            individualRects.push({
              x: rect.left - padding,
              y: rect.top - padding,
              width: rect.width + padding * 2,
              height: rect.height + padding * 2,
            });
          }
        }
      }

      // If mergeHighlights is true, create a single bounding box
      if (mergeHighlights && individualRects.length > 0) {
        const minX = Math.min(...individualRects.map((r) => r.x));
        const minY = Math.min(...individualRects.map((r) => r.y));
        const maxX = Math.max(...individualRects.map((r) => r.x + r.width));
        const maxY = Math.max(...individualRects.map((r) => r.y + r.height));

        newHighlights.push({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        });
      } else {
        // Use individual highlights
        newHighlights.push(...individualRects);
      }

      setHighlights(newHighlights);

      // Continue tracking on every frame for smooth updates
      animationFrameId = requestAnimationFrame(updateHighlights);
    };

    // Start the animation loop
    updateHighlights();

    // Also listen to resize for responsiveness
    const handleResize = () => {
      if (isRunning) {
        updateHighlights();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isRunning = false;
      window.removeEventListener("resize", handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [targetSelector, show, padding, targetCount, mergeHighlights]);

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-[9998] bg-black"
            style={{
              maskImage:
                highlights.length > 0
                  ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs><mask id="spotlight"><rect width="100%" height="100%" fill="white"/>${highlights.map((h) => `<rect x="${h.x}" y="${h.y}" width="${h.width}" height="${h.height}" rx="12" fill="black"/>`).join("")}</mask></defs><rect width="100%" height="100%" mask="url(%23spotlight)"/></svg>')`
                  : undefined,
              maskSize: "100% 100%",
              maskRepeat: "no-repeat",
            }}
          />

          {/* Highlight boxes with pulse animation */}
          {highlights.map((highlight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="pointer-events-none fixed z-[9999] rounded-xl"
              style={{
                left: highlight.x,
                top: highlight.y,
                width: highlight.width,
                height: highlight.height,
                boxShadow: "0 0 0 3px rgba(255, 216, 77, 0.8)",
              }}
            >
              <div className="animate-tutorial-pulse h-full w-full rounded-xl" />
            </motion.div>
          ))}
        </>
      )}
    </AnimatePresence>
  );
}
