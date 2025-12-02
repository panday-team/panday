import { memo, useMemo, useEffect, useRef } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { type LucideIcon } from "lucide-react";

import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";

export type MainPathNodeData = {
  label: string;
  glow?: boolean;
  status?: "base" | "in-progress" | "completed";
  isSelected?: boolean;
  progress?: number;
};

export type MainPathNodeProps = NodeProps<Node<MainPathNodeData>> & {
  color: string;
  colorName: string;
  icon?: LucideIcon;
};

/**
 * Shared component for main path nodes (hub and terminal)
 * Handles animations, mascot display, and theming
 */
/**
 * Darkens a hex color by a given percentage
 */
function darkenColor(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace("#", "");
  // Convert to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  // Darken each component
  const newR = Math.max(0, Math.floor(r * (1 - percent / 100)));
  const newG = Math.max(0, Math.floor(g * (1 - percent / 100)));
  const newB = Math.max(0, Math.floor(b * (1 - percent / 100)));
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

function MainPathNodeComponent({
  id,
  data,
  color,
  colorName,
  icon: Icon,
}: MainPathNodeProps) {
  const { label, glow, isSelected } = data;
  // Force 100% progress for hub (yellow) and terminal (red) nodes
  const isMainNode =
    color === "#FDE047" || color === "#EC4444" || id.includes("red-seal");
  const percentage = isMainNode ? 100 : (data.progress ?? 0);
  const baseFillColor = "#FFFFFF";
  const borderColor = darkenColor(color, 30); // Darken by 30%
  const fillRef = useRef<HTMLSpanElement>(null);

  // Sync WebkitClipPath with percentage changes (vendor prefix needs manual update)
  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.setProperty(
        "-webkit-clip-path",
        `inset(${100 - percentage}% 0 0 0)`,
      );
    }
  }, [percentage]);

  const hiddenHandleClass =
    "pointer-events-none opacity-0 h-3 w-3 bg-transparent border-transparent";

  // Generate unique animation parameters per node for organic variation
  const animationParams = useMemo(() => {
    const seed = id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min: number, max: number, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + (max - min) * (x - Math.floor(x));
    };

    return {
      glowDuration: random(3, 4.5),
      breathDuration: random(4, 6),
      shimmerDuration: random(2, 3.5),
      phaseOffset: random(0, 2),
    };
  }, [id]);

  return (
    <BaseNode
      id={id}
      data-node-type={id.includes("red-seal") ? "terminal" : "hub"}
      data-node-id={id}
      aria-label={label}
      className="relative flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
    >
      {/* Outer pulse ring - shown when glow is enabled or subtle always-on version */}
      {glow ? (
        <motion.span
          aria-hidden
          className={`pointer-events-none absolute z-0 h-[250px] w-[250px] rounded-full border-[12px] border-${colorName}/30`}
          style={{ borderColor: `${color}4D` }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: animationParams.phaseOffset * 0.3,
          }}
        />
      ) : null}

      {/* Outer glow with subtle breathing animation */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute z-10 h-[180px] w-[180px] rounded-full"
        style={{ backgroundColor: `${color}2E` }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.18, 0.25, 0.18],
        }}
        transition={{
          duration: animationParams.breathDuration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: animationParams.phaseOffset,
        }}
      />

      {/* Base circle */}
      <span
        aria-hidden
        className="pointer-events-none absolute z-0 h-32 w-32 rounded-full"
        style={{ backgroundColor: baseFillColor }}
      />
      {/* Progress fill overlay */}
      <motion.span
        ref={fillRef}
        aria-hidden
        className="pointer-events-none absolute z-10 h-32 w-32 rounded-full"
        style={{
          backgroundColor: color,
        }}
        initial={false}
        animate={{
          clipPath: `inset(${100 - percentage}% 0 0 0)`,
          opacity: percentage > 0 ? 1 : 0,
        }}
        transition={{
          duration: 0.6,
          ease: [0.4, 0, 0.2, 1], // ease-in-out cubic bezier
        }}
      />

      {/* Colored border ring with subtle pulse */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute z-20 h-32 w-32 rounded-full border-4"
        animate={{
          opacity: [1, 0.85, 1],
        }}
        transition={{
          duration: animationParams.glowDuration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: animationParams.phaseOffset * 1.5,
        }}
        style={{ borderColor: borderColor }}
      />

      {/* Center icon or dot */}
      {Icon ? (
        <Icon
          className="pointer-events-none relative z-30 h-12 w-12 text-black"
          strokeWidth={2}
        />
      ) : (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute z-30 h-4 w-4 rounded-full bg-black"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: animationParams.shimmerDuration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: animationParams.phaseOffset * 2,
          }}
        />
      )}

      {/* Mascot - only shown when node is selected */}
      <AnimatePresence mode="wait">
        {isSelected && (
          <motion.div
            key={`mascot-${id}`}
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            className="pointer-events-none absolute z-50"
            style={{
              width: 160,
              height: 160,
            }}
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
                src="/mascot.svg"
                alt="Panday Mascot"
                width={160}
                height={160}
                className="h-full w-full object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NodeAppendix
        position="bottom"
        className="pointer-events-none z-20 rounded-lg border-none bg-white/95 px-3 py-1.5 text-lg leading-tight font-bold text-gray-900 backdrop-blur-sm dark:bg-[#0B1021]/90 dark:text-[#D9DEE7]"
      >
        {label}
      </NodeAppendix>
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
  );
}

// Custom equality check to prevent unnecessary re-renders
export const MainPathNode = memo(MainPathNodeComponent, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.data.label === next.data.label &&
    prev.data.status === next.data.status &&
    prev.data.glow === next.data.glow &&
    prev.data.isSelected === next.data.isSelected &&
    prev.color === next.color &&
    prev.colorName === next.colorName &&
    prev.icon === next.icon &&
    prev.selected === next.selected &&
    prev.dragging === next.dragging
  );
});
MainPathNode.displayName = "MainPathNode";
