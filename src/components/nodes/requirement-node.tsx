import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { BaseNode } from "@/components/base-node";
import { NodeAppendix } from "@/components/node-appendix";
import { cn } from "@/lib/utils";

export type RequirementNodeData = {
  label: string;
  labelPosition?: "right" | "bottom";
  /**
   * When true, renders a leading lime dot beside the label so it aligns with the
   * visual language in the specification.
   */
  showLabelDot?: boolean;
};

export type RequirementNodeType = Node<RequirementNodeData, "requirement">;

function RequirementNodeComponent({
  data,
  id,
}: NodeProps<RequirementNodeType>) {
  const { label, labelPosition = "right", showLabelDot = true } = data;
  const appendixPosition = labelPosition === "right" ? "right" : "bottom";
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
        className="pointer-events-none absolute h-5 w-5 rounded-full bg-[#7DE068]"
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
          labelPosition === "right"
            ? "flex-row items-center gap-2"
            : "flex-col items-center gap-2",
          "border-none bg-transparent p-0 text-xs font-medium leading-tight text-[#D9DEE7]",
        )}
      >
        {showLabelDot ? (
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-[#7DE068]"
          />
        ) : null}
        <span>{label}</span>
      </NodeAppendix>
    </BaseNode>
  );
}

export const RequirementNode = memo(RequirementNodeComponent);
RequirementNode.displayName = "RequirementNode";
