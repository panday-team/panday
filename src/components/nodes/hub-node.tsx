import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "motion/react";

import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";

export type HubNodeData = {
  label: string;
  glow?: boolean;
};

export type HubNodeType = Node<HubNodeData, "hub">;

function HubNodeComponent({ id, data }: NodeProps<HubNodeType>) {
  const { label, glow } = data;
  const hiddenHandleClass =
    "pointer-events-none opacity-0 h-3 w-3 bg-transparent border-transparent";

  return (
    <BaseNode
      id={id}
      aria-label={label}
      className="relative flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
    >
      {glow ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute z-0 h-[250px] w-[250px] rounded-full border-[12px] border-[#FFD84D]/30"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ) : null}
      <span
        aria-hidden
        className="pointer-events-none absolute z-10 h-[180px] w-[180px] rounded-full bg-[#FFD84D]/[0.18]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute z-10 h-32 w-32 rounded-full bg-[#FFD84D]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute z-10 h-32 w-32 rounded-full border-2 border-white"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute z-10 h-4 w-4 rounded-full bg-white"
      />
      <NodeAppendix
        position="left"
        className="pointer-events-none z-20 rounded-lg border-none bg-[#0B1021]/90 px-3 py-1.5 text-lg leading-tight font-bold text-[#D9DEE7] backdrop-blur-sm"
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

export const HubNode = memo(HubNodeComponent);
HubNode.displayName = "HubNode";
