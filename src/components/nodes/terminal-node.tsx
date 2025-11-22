import { memo } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { FileBadge } from "lucide-react";
import { MainPathNode } from "./main-path-node";

export type TerminalNodeData = {
  label: string;
  glow?: boolean;
  status?: "base" | "in-progress" | "completed";
  isSelected?: boolean;
};

export type TerminalNodeType = Node<TerminalNodeData, "terminal">;

function TerminalNodeComponent(props: NodeProps<TerminalNodeType>) {
  return (
    <MainPathNode
      {...props}
      color="#EC4444"
      colorName="red-500"
      icon={FileBadge}
    />
  );
}

// Custom equality check to prevent unnecessary re-renders
export const TerminalNode = memo(TerminalNodeComponent, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.data.label === next.data.label &&
    prev.data.status === next.data.status &&
    prev.data.glow === next.data.glow &&
    prev.data.isSelected === next.data.isSelected &&
    prev.selected === next.selected &&
    prev.dragging === next.dragging
  );
});
TerminalNode.displayName = "TerminalNode";
