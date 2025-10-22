import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

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
      className="nodrag relative flex h-11 w-11 items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
    >
      <NodeAppendix
        position="left"
        className="pointer-events-none border-none bg-transparent text-sm leading-tight font-medium text-[#D9DEE7]"
      >
        {label}
      </NodeAppendix>
      <span
        aria-hidden
        className="pointer-events-none absolute h-[60px] w-[60px] rounded-full bg-[#FFD84D]/[0.18]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute h-11 w-11 rounded-full bg-[#FFD84D]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute h-11 w-11 rounded-full border-2 border-white"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white"
      />
      {glow ? (
        <span
          aria-hidden
          className="pointer-events-none absolute h-[84px] w-[84px] rounded-full border-[12px] border-[#FFD84D]/30"
        />
      ) : null}
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
