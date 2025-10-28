import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";

import { motion } from "motion/react";

export type ChecklistNodeData = {
  label: string;
  labelPosition?: "top" | "bottom" | "left" | "right";
};

export type ChecklistNodeType = Node<ChecklistNodeData, "checklist">;

/**
 * Smaller circular checklist node that branches off main milestone nodes
 * Purple circle (40x40px) with external label
 */
function ChecklistNodeComponent({ id, data }: NodeProps<ChecklistNodeType>) {
  const { label, labelPosition = "bottom" } = data;
  const hiddenHandleClass =
    "pointer-events-none opacity-0 h-3 w-3 bg-transparent border-transparent";

  return (
    <>
      <motion.div
        // initial={false}
        // The component will instantly appear with these styles
        animate={{
          opacity: 1,
          scale: 1.2,
          y: [5, -5, 5, -5],
          x: [5, -5, 5, -5],
        }}
        transition={{
          y: { duration: 3.5, repeat: Infinity, ease: "easeIn" },
          x: { duration: 3.5, repeat: Infinity, ease: "easeIn" },
        }}
        style={{ opacity: 0 }}
      >
        <BaseNode
          id={id}
          aria-label={label}
          className="nodrag relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
        >
          <NodeAppendix
            position={labelPosition}
            className="pointer-events-none border-none bg-transparent text-sm leading-tight font-medium text-[#D9DEE7]"
          >
            <motion.div whileHover={{ scale: 200 }} />
            {label}
          </NodeAppendix>
          <span
            aria-hidden
            className="pointer-events-none absolute h-[90px] w-[90px] rounded-full bg-[#9F7AEA]/[0.18]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute h-16 w-16 rounded-full bg-[#9F7AEA]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute h-16 w-16 rounded-full border-2 border-white"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute h-2 w-2 rounded-full bg-white"
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
    </>
  );
}

export const ChecklistNode = memo(ChecklistNodeComponent);
ChecklistNode.displayName = "ChecklistNode";
