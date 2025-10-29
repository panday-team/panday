"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";

interface NodeMascotProps {
  nodeId: string | null;
  nodePosition?: { x: number; y: number };
  nodeType?: string;
  zoom?: number;
}

/**
 * Mascot component that appears on the currently selected node
 * Randomly selects one of 6 mascot variations (1.webp - 6.webp)
 * Uses React Flow's Panel component to render on top of the flow
 */
export function NodeMascot({
  nodeId,
  nodePosition,
  nodeType,
  zoom = 1,
}: NodeMascotProps) {
  const [mounted, setMounted] = useState(false);

  // Use the mascot.webp image
  const mascotImage = useMemo(() => {
    if (!nodeId) return null;
    return "/mascot.webp";
  }, [nodeId]);

  // Determine base mascot size based on node type
  // Hub nodes are larger (160px), checklist nodes are smaller (80px)
  const baseMascotSize =
    nodeType === "hub" || nodeType === "terminal" ? 160 : 80;

  // Scale the mascot size based on zoom level
  const mascotSize = baseMascotSize * zoom;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !nodeId || !nodePosition || !mascotImage) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {nodeId && (
        <motion.div
          key={nodeId}
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0, rotate: 180 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
          }}
          style={{
            position: "absolute",
            left: nodePosition.x,
            top: nodePosition.y,
            width: mascotSize,
            height: mascotSize,
            pointerEvents: "none",
            zIndex: 1000,
            transform: `translate(-${mascotSize / 2}px, -${mascotSize / 2}px)`,
          }}
          className="drop-shadow-2xl"
        >
          <motion.div
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src={mascotImage}
              alt="Panday Mascot"
              width={mascotSize}
              height={mascotSize}
              className="h-full w-full object-contain"
              priority
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
