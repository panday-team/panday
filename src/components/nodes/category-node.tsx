import { memo, useRef, useId } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";
import {
  motion,
  AnimatePresence,
  useInView,
  useTime,
  useTransform,
} from "motion/react";
import Image from "next/image";
import {
  Brain,
  ClipboardList,
  TrafficCone,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

export type CategoryNodeData = {
  label: string;
  icon?: "brain" | "clipboard-list" | "traffic-cone";
  color?: string;
  isSelected?: boolean;
  isExpanded?: boolean;
  isDimmed?: boolean;
  progress?: number;
};

export type CategoryNodeType = Node<CategoryNodeData, "category">;

const iconMap: Record<string, LucideIcon> = {
  brain: Brain,
  "clipboard-list": ClipboardList,
  "traffic-cone": TrafficCone,
};

// Animation constants
const NODE_SIZE = 96; // px
const WAVE_AMPLITUDE = 3; // px - how high the wave peaks
const WAVE_PERIOD = 2000; // ms - time for one full wave cycle
const WAVE_POINTS = 24; // Number of points for smooth wave curve
const WAVE_FREQUENCY = 3; // Creates 1.5 waves across width (Math.PI * WAVE_FREQUENCY)
const SHIMMER_PERIOD = 3000; // ms - time for shimmer to sweep across
const SHIMMER_START_OFFSET = -150; // Starting position as percentage
const SHIMMER_RANGE = 3; // Multiplier to sweep from -150% to 150%

/**
 * Darkens a hex color by a given percentage
 */
function darkenColor(hex: string, percent: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const newR = Math.max(0, Math.floor(r * (1 - percent / 100)));
  const newG = Math.max(0, Math.floor(g * (1 - percent / 100)));
  const newB = Math.max(0, Math.floor(b * (1 - percent / 100)));
  return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
}

/**
 * Generates an SVG path for the wave-topped fill area.
 * Creates a smooth sine wave at the top edge of the progress fill.
 *
 * @param percentage - Progress value (0-100)
 * @param waveOffset - Phase offset for wave animation (in radians)
 * @param size - Node size in pixels (coordinate system: origin at top-left)
 *
 * @returns SVG path string, or:
 *   - Empty string for 0% (nothing to render)
 *   - Full rectangle for 100% (no wave needed, solid fill)
 */
function generateWavePath(
  percentage: number,
  waveOffset: number,
  size: number,
): string {
  if (percentage <= 0) return "";
  if (percentage >= 100) {
    // Full fill - no wave needed, just a rectangle covering the entire area
    return `M 0 0 L ${size} 0 L ${size} ${size} L 0 ${size} Z`;
  }

  const fillHeight = (percentage / 100) * size;
  const baseY = size - fillHeight;

  // Create wave points across the width using smooth sine curve
  const points: string[] = [];

  for (let i = 0; i <= WAVE_POINTS; i++) {
    const x = (i / WAVE_POINTS) * size;
    // Sine wave with phase offset based on time
    const waveY =
      Math.sin((i / WAVE_POINTS) * Math.PI * WAVE_FREQUENCY + waveOffset) *
      WAVE_AMPLITUDE;
    const y = baseY + waveY;
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  // Build the path: start bottom-left, go up left edge, draw wave across top, down right edge, close
  return `M 0 ${size} L 0 ${points[0]?.split(" ")[1] ?? size} L ${points.join(" L ")} L ${size} ${size} Z`;
}

/**
 * Medium-sized category node (96x96px) that sits between hub nodes and checklist nodes
 * Used to organize checklist nodes into Resources, Actions, and Roadblocks
 * Features liquid wave animation and shimmer effect on progress fill
 */
function CategoryNodeComponent({ id, data }: NodeProps<CategoryNodeType>) {
  const {
    label,
    icon = "brain",
    color = "#0077CC",
    isSelected,
    isExpanded = false,
    isDimmed = false,
  } = data;

  const percentage = data.progress ?? 0;
  const borderColor = darkenColor(color, 30);

  // Refs for visibility detection
  const nodeRef = useRef<HTMLDivElement>(null);
  const rawClipPathId = useId();
  const clipPathId = `wave-${rawClipPathId.replace(/:/g, "")}`;

  // Detect if node is in viewport (with margin for smooth transition)
  const isInView = useInView(nodeRef, {
    margin: "100px",
  });

  // Time-based animation driver
  const time = useTime();

  // Wave animation - oscillates the wave phase when in view
  const wavePhase = useTransform(time, (t) => {
    if (!isInView || percentage === 0 || percentage >= 100) return 0;
    return (t / WAVE_PERIOD) * Math.PI * 2;
  });

  // Generate wave path reactively
  const wavePath = useTransform(wavePhase, (phase) =>
    generateWavePath(percentage, phase, NODE_SIZE),
  );

  // Shimmer animation - sweeps across every SHIMMER_PERIOD ms
  const shimmerX = useTransform(time, (t) => {
    if (!isInView || percentage === 0) return SHIMMER_START_OFFSET;
    const cycle = ((t % SHIMMER_PERIOD) / SHIMMER_PERIOD) * 100;
    return SHIMMER_START_OFFSET + cycle * SHIMMER_RANGE;
  });

  const hiddenHandleClass =
    "pointer-events-none opacity-0 h-3 w-3 bg-transparent border-transparent";

  const IconComponent = iconMap[icon] ?? Brain;

  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: isDimmed ? 0.3 : 1,
        scale: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      whileHover={{
        scale: 1.05,
      }}
    >
      <BaseNode
        id={id}
        data-node-type={
          icon === "brain"
            ? "resources"
            : icon === "clipboard-list"
              ? "actions"
              : "roadblocks"
        }
        data-node-id={id}
        aria-label={`${label}${percentage > 0 ? ` - ${percentage}% complete` : ""}`}
        className="group nodrag relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
      >
        <NodeAppendix
          position="bottom"
          className="pointer-events-none border-none bg-transparent text-sm leading-tight font-medium text-gray-900 dark:text-[#D9DEE7]"
        >
          <p>{label}</p>
        </NodeAppendix>

        {/* Outer glow with subtle pulsing - pauses when off-screen */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute h-[110px] w-[110px] rounded-full"
          style={{ backgroundColor: `${color}2E` }}
          animate={
            isInView
              ? {
                  scale: [1, 1.05, 1],
                  opacity: [0.2, 0.3, 0.2],
                }
              : { scale: 1, opacity: 0.2 }
          }
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* SVG definitions for wave clip path */}
        <svg
          className="pointer-events-none absolute"
          aria-hidden
          style={{ position: "absolute", width: 0, height: 0 }}
        >
          <defs>
            <clipPath id={clipPathId}>
              <motion.path d={wavePath} />
            </clipPath>
          </defs>
        </svg>

        {/* Base circle */}
        <span
          aria-hidden
          className="pointer-events-none absolute z-0 h-24 w-24 rounded-full"
          style={{ backgroundColor: "#FFFFFF" }}
        />

        {/* Progress fill with wave effect */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute z-10 h-24 w-24 overflow-hidden rounded-full"
          style={{
            backgroundColor: color,
            clipPath: `url(#${clipPathId})`,
          }}
          initial={false}
          animate={{
            opacity: percentage > 0 ? 1 : 0,
          }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
          }}
        />

        {/* Shimmer overlay - sweeps across the fill */}
        {percentage > 0 && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute z-[11] h-24 w-24 overflow-hidden rounded-full"
            style={{
              clipPath: `url(#${clipPathId})`,
            }}
          >
            <motion.span
              className="absolute inset-0"
              style={{
                background: `linear-gradient(
                  110deg,
                  transparent 0%,
                  transparent 40%,
                  rgba(255, 255, 255, 0.25) 50%,
                  transparent 60%,
                  transparent 100%
                )`,
                backgroundSize: "200% 100%",
                x: shimmerX,
              }}
            />
          </motion.span>
        )}

        {/* Colored border ring */}
        <span
          aria-hidden
          className="pointer-events-none absolute z-20 h-24 w-24 rounded-full border-4"
          style={{ borderColor: borderColor }}
        />

        {/* Icon in center */}
        <IconComponent
          className="pointer-events-none relative z-30 h-10 w-10 text-black"
          strokeWidth={2}
        />

        {/* Expand/Collapse indicator */}
        <motion.div
          className="pointer-events-none absolute right-0 bottom-0 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md"
          animate={{
            rotate: isExpanded ? 90 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
        >
          <ChevronRight
            className="h-4 w-4"
            style={{ color }}
            strokeWidth={2.5}
          />
        </motion.div>

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
                width: 100,
                height: 100,
              }}
            >
              <Image
                src="/mascot.svg"
                alt="Panday Mascot"
                width={200}
                height={200}
                className="h-full w-full object-contain drop-shadow-2xl"
                priority
              />
            </motion.div>
          )}
        </AnimatePresence>

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
  );
}

// Custom equality check to prevent unnecessary re-renders
export const CategoryNode = memo(CategoryNodeComponent, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.data.label === next.data.label &&
    prev.data.icon === next.data.icon &&
    prev.data.color === next.data.color &&
    prev.data.isSelected === next.data.isSelected &&
    prev.data.isExpanded === next.data.isExpanded &&
    prev.data.isDimmed === next.data.isDimmed &&
    prev.data.progress === next.data.progress &&
    prev.selected === next.selected &&
    prev.dragging === next.dragging
  );
});
CategoryNode.displayName = "CategoryNode";
