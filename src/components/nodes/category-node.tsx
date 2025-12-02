import { memo, useEffect, useRef } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";
import { motion, AnimatePresence } from "motion/react";
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

/**
 * Medium-sized category node (96x96px) that sits between hub nodes and checklist nodes
 * Used to organize checklist nodes into Resources, Actions, and Roadblocks
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

  const IconComponent = iconMap[icon] ?? Brain;

  return (
    <motion.div
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
        aria-label={label}
        className="group nodrag relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
      >
        <NodeAppendix
          position="bottom"
          className="pointer-events-none border-none bg-transparent text-sm leading-tight font-medium text-gray-900 dark:text-[#D9DEE7]"
        >
          <p>{label}</p>
        </NodeAppendix>

        {/* Outer glow with subtle pulsing */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute h-[110px] w-[110px] rounded-full"
          style={{ backgroundColor: `${color}2E` }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Base circle */}
        <span
          aria-hidden
          className="pointer-events-none absolute z-0 h-24 w-24 rounded-full"
          style={{ backgroundColor: "#FFFFFF" }}
        />
        {/* Progress fill overlay */}
        <motion.span
          ref={fillRef}
          aria-hidden
          className="pointer-events-none absolute z-10 h-24 w-24 rounded-full"
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
