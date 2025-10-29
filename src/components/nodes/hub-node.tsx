import { memo, useMemo } from "react";
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
      aria-label={label}
      className="relative flex h-32 w-32 cursor-pointer items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
    >
      {/* Outer pulse ring - shown when glow is enabled or subtle always-on version */}
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
            delay: animationParams.phaseOffset * 0.3,
          }}
        />
      ) : null}

      {/* Outer glow with subtle breathing animation */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute z-10 h-[180px] w-[180px] rounded-full bg-[#FFD84D]/[0.18]"
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

      {/* Main yellow circle */}
      <span
        aria-hidden
        className="pointer-events-none absolute z-10 h-32 w-32 rounded-full bg-[#FFD84D]"
      />

      {/* White border ring with subtle pulse */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute z-10 h-32 w-32 rounded-full border-2 border-white"
        animate={{
          opacity: [1, 0.85, 1],
        }}
        transition={{
          duration: animationParams.glowDuration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: animationParams.phaseOffset * 1.5,
        }}
      />

      {/* Center dot with shimmer effect */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute z-10 h-4 w-4 rounded-full bg-white"
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
      <NodeAppendix
        position="bottom"
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
