import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { Brain, ClipboardList, TrafficCone, ChevronRight, type LucideIcon } from "lucide-react";

export type CategoryNodeData = {
  label: string;
  icon?: "brain" | "clipboard-list" | "traffic-cone";
  color?: string;
  isSelected?: boolean;
  isExpanded?: boolean;
  isDimmed?: boolean;
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
function CategoryNodeComponent({ id, data }: NodeProps<CategoryNodeType>) {
  const {
    label,
    icon = "brain",
    color = "#0077CC",
    isSelected,
    isExpanded = false,
    isDimmed = false,
  } = data;

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

        {/* Main circle with dynamic color */}
        <span
          aria-hidden
          className="pointer-events-none absolute h-24 w-24 rounded-full"
          style={{ backgroundColor: color }}
        />

        {/* White border ring */}
        <span
          aria-hidden
          className="pointer-events-none absolute h-24 w-24 rounded-full border-2 border-white"
        />

        {/* Icon in center */}
        <IconComponent
          className="pointer-events-none relative z-10 h-10 w-10 text-white"
          strokeWidth={2}
        />

        {/* Expand/Collapse indicator */}
        <motion.div
          className="pointer-events-none absolute bottom-0 right-0 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md"
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
                src="/mascot.webp"
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

export const CategoryNode = memo(CategoryNodeComponent);
CategoryNode.displayName = "CategoryNode";
