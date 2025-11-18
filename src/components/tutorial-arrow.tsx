"use client";

import { motion } from "framer-motion";

interface TutorialArrowProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  show: boolean;
}

export function TutorialArrow({ from, to, show }: TutorialArrowProps) {
  if (!show) return null;

  // Calculate control points for curved arrow
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Create a smooth curve
  const controlPoint1X = from.x + dx * 0.3;
  const controlPoint1Y = from.y + dy * 0.1;
  const controlPoint2X = from.x + dx * 0.7;
  const controlPoint2Y = from.y + dy * 0.9;

  const pathD = `M ${from.x} ${from.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${to.x} ${to.y}`;

  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-none fixed top-0 left-0 z-[60]"
      style={{
        width: "100vw",
        height: "100vh",
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#FFD84D" />
        </marker>
      </defs>

      {/* Animated curved path */}
      <motion.path
        d={pathD}
        stroke="#FFD84D"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        markerEnd="url(#arrowhead)"
        initial={{ pathLength: 0 }}
        animate={{
          pathLength: 1,
        }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
      />

      {/* Animated circle at arrow tip */}
      <motion.circle
        cx={to.x}
        cy={to.y}
        r="8"
        fill="none"
        stroke="#FFD84D"
        strokeWidth="2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.svg>
  );
}
