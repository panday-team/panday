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
  return <MainPathNode {...props} color="#EC4444" colorName="red-500" icon={FileBadge} />;
}

export const TerminalNode = memo(TerminalNodeComponent);
TerminalNode.displayName = "TerminalNode";
