import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";

export type CheckpointNodeData = {
  label: string;
};

export type CheckpointNodeType = Node<CheckpointNodeData, "checkpoint">;

function CheckpointNodeComponent({ data, id }: NodeProps<CheckpointNodeType>) {
  const { label } = data;
  const hiddenHandleClass =
    "pointer-events-none opacity-0 h-2.5 w-2.5 bg-transparent border-transparent";

  return (
    <BaseNode
      id={id}
      aria-label={label}
      className="nodrag relative flex h-8 w-8 items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute h-8 w-8 rounded-full border-[6px] border-[#8A5BFF]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute h-2 w-2 rounded-full bg-white"
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
      <NodeAppendix
        position="right"
        className="border-none bg-transparent p-0 text-xs leading-tight font-medium text-[#D9DEE7]"
      >
        {label}
      </NodeAppendix>
    </BaseNode>
  );
}

export const CheckpointNode = memo(CheckpointNodeComponent);
CheckpointNode.displayName = "CheckpointNode";
