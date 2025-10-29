import { memo, useMemo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";
import { motion } from "motion/react";

export type ChecklistNodeData = {
  label: string;
  labelPosition?: "top" | "bottom" | "left" | "right";
  status?: "base" | "in-progress" | "completed";
};

export type ChecklistNodeType = Node<ChecklistNodeData, "checklist">;

/**
 * Smaller circular checklist node that branches off main milestone nodes
 * Purple circle (40x40px) with external label
 * Features Obsidian-inspired physics-based floating animation
 */
function ChecklistNodeComponent({ id, data }: NodeProps<ChecklistNodeType>) {
  const { label, status = "base" } = data;
  const hiddenHandleClass =
    "pointer-events-none opacity-0 h-3 w-3 bg-transparent border-transparent";

  // Determine colors based on status
  const colors = {
    base: {
      main: "#9F7AEA",
      glow: "#9F7AEA",
    },
    "in-progress": {
      main: "#BB1913",
      glow: "#BB1913",
    },
    completed: {
      main: "#61FF05",
      glow: "#61FF05",
    },
  };

  const currentColor = colors[status];

  // Generate unique animation parameters per node for organic, non-synchronized movement
  const animationParams = useMemo(() => {
    // Use node ID as seed for deterministic randomness
    const seed = id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min: number, max: number, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + (max - min) * (x - Math.floor(x));
    };

    return {
      // Drift range for x/y (Obsidian uses subtle 3-6px range)
      driftX: random(3, 6),
      driftY: random(3, 6),
      // Different durations create elliptical/figure-8 paths
      durationX: random(4, 7),
      durationY: random(5, 8),
      durationRotate: random(8, 12),
      // Rotation range (very subtle, 1-2 degrees)
      rotateRange: random(0.8, 1.5),
      // Phase offset so nodes don't all start at the same position
      phaseOffset: random(0, 2),
      // Glow pulse parameters
      glowDuration: random(3, 5),
      glowScale: random(1.02, 1.08),
    };
  }, [id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      whileHover={{
        scale: 1.1,
      }}
    >
      {/* Main floating container with physics-based drift */}
      <motion.div
        animate={{
          // Create smooth sinusoidal drift patterns
          x: [
            -animationParams.driftX,
            animationParams.driftX,
            -animationParams.driftX,
          ],
          y: [
            -animationParams.driftY,
            animationParams.driftY,
            -animationParams.driftY,
          ],
          // Very subtle rotation that follows drift
          rotate: [
            -animationParams.rotateRange,
            animationParams.rotateRange,
            -animationParams.rotateRange,
          ],
        }}
        transition={{
          x: {
            duration: animationParams.durationX,
            repeat: Infinity,
            ease: "easeInOut",
            delay: animationParams.phaseOffset,
          },
          y: {
            duration: animationParams.durationY,
            repeat: Infinity,
            ease: "easeInOut",
            delay: animationParams.phaseOffset * 0.7, // Slightly offset from x
          },
          rotate: {
            duration: animationParams.durationRotate,
            repeat: Infinity,
            ease: "easeInOut",
            delay: animationParams.phaseOffset * 0.5,
          },
        }}
        style={{
          willChange: "transform", // Performance optimization
        }}
      >
        <BaseNode
          id={id}
          aria-label={label}
          className="nodrag relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
        >
          <NodeAppendix
            position="bottom"
            className="pointer-events-none border-none bg-transparent text-sm leading-tight font-medium text-[#D9DEE7]"
          >
            {label}
          </NodeAppendix>

          {/* Outer glow with independent pulsing animation */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute h-[90px] w-[90px] rounded-full"
            style={{ backgroundColor: `${currentColor.glow}2E` }}
            animate={{
              scale: [1, animationParams.glowScale, 1],
              opacity: [0.18, 0.25, 0.18],
            }}
            transition={{
              duration: animationParams.glowDuration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: animationParams.phaseOffset * 1.3,
            }}
          />

          {/* Main circle with dynamic color based on status */}
          <span
            aria-hidden
            className="pointer-events-none absolute h-16 w-16 rounded-full"
            style={{ backgroundColor: currentColor.main }}
          />

          {/* White border ring */}
          <span
            aria-hidden
            className="pointer-events-none absolute h-16 w-16 rounded-full border-2 border-white"
          />

          {/* Center dot with subtle pulse */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute h-2 w-2 rounded-full bg-white"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: animationParams.glowDuration * 0.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: animationParams.phaseOffset * 1.8,
            }}
          />

          <Handle
            id="left-source"
            className={hiddenHandleClass}
            position={Position.Left}
            type="source"
          />
          <Handle
            id="left-target"
            className={hiddenHandleClass}
            position={Position.Left}
            type="target"
          />
          <Handle
            id="right-source"
            className={hiddenHandleClass}
            position={Position.Right}
            type="source"
          />
          <Handle
            id="right-target"
            className={hiddenHandleClass}
            position={Position.Right}
            type="target"
          />
          <Handle
            id="top-source"
            className={hiddenHandleClass}
            position={Position.Top}
            type="source"
          />
          <Handle
            id="top-target"
            className={hiddenHandleClass}
            position={Position.Top}
            type="target"
          />
          <Handle
            id="bottom-source"
            className={hiddenHandleClass}
            position={Position.Bottom}
            type="source"
          />
          <Handle
            id="bottom-target"
            className={hiddenHandleClass}
            position={Position.Bottom}
            type="target"
          />
        </BaseNode>
      </motion.div>
    </motion.div>
  );
}

export const ChecklistNode = memo(ChecklistNodeComponent);
ChecklistNode.displayName = "ChecklistNode";
