import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";
import { cn } from "@/lib/utils";

export type PortalNodeData = {
  label: string;
  labelPosition?: "left" | "bottom";
};

export type PortalNodeType = Node<PortalNodeData, "portal">;

function PortalNodeComponent({ data, id }: NodeProps<PortalNodeType>) {
  const { label, labelPosition = "left" } = data;
  const appendixPosition = labelPosition === "left" ? "left" : "bottom";
  const hiddenHandleClass =
    "pointer-events-none opacity-0 h-2.5 w-2.5 bg-transparent border-transparent";

  return (
    <BaseNode
      id={id}
      aria-label={label}
      className="nodrag relative flex h-5 w-5 items-center justify-center rounded-full border-none bg-transparent shadow-none outline-none hover:ring-0 focus-visible:ring-0"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute h-5 w-5 rounded-full bg-[#CFE2FF]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute h-5 w-5 rounded-full border-2 border-white"
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
        position={appendixPosition}
        className={cn(
          labelPosition === "left"
            ? "items-end text-right"
            : "items-center text-center",
          "border-none bg-transparent p-0 text-xs font-medium leading-tight text-[#D9DEE7]",
        )}
      >
        {label}
      </NodeAppendix>
    </BaseNode>
  );
}

export const PortalNode = memo(PortalNodeComponent);
PortalNode.displayName = "PortalNode";
