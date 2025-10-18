import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";

export type TerminalNodeData = {
  label?: string;
};

export type TerminalNodeType = Node<TerminalNodeData, "terminal">;

function TerminalNodeComponent({ data, id }: NodeProps<TerminalNodeType>) {
  const { label } = data;
  const hiddenHandleClass =
    "pointer-events-none opacity-0 h-3 w-3 bg-transparent border-transparent";

  return (
    <BaseNode
      id={id}
      aria-label={label ?? "Terminal"}
      className="nodrag relative flex h-[60px] w-[60px] items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute h-[60px] w-[60px] rounded-full bg-[#FFD84D]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute h-[60px] w-[60px] rounded-full border-2 border-white"
      />
      <Handle
        id="top-target"
        className={hiddenHandleClass}
        position={Position.Top}
        type="target"
      />
      <Handle
        id="top-source"
        className={hiddenHandleClass}
        position={Position.Top}
        type="source"
      />
      <Handle
        id="left-target"
        className={hiddenHandleClass}
        position={Position.Left}
        type="target"
      />
      <Handle
        id="left-source"
        className={hiddenHandleClass}
        position={Position.Left}
        type="source"
      />
      {label ? (
        <NodeAppendix
          position="bottom"
          className="border-none bg-transparent p-0 text-sm font-semibold leading-tight text-[#D9DEE7]"
        >
          {label}
        </NodeAppendix>
      ) : null}
    </BaseNode>
  );
}

export const TerminalNode = memo(TerminalNodeComponent);
TerminalNode.displayName = "TerminalNode";
