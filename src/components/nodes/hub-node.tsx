import { memo } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { MainPathNode } from "./main-path-node";

export type HubNodeData = {
  label: string;
  glow?: boolean;
  status?: "base" | "in-progress" | "completed";
  isSelected?: boolean;
};

export type HubNodeType = Node<HubNodeData, "hub">;

function HubNodeComponent(props: NodeProps<HubNodeType>) {
  return <MainPathNode {...props} color="#FDE047" colorName="yellow-300" />;
}

export const HubNode = memo(HubNodeComponent);
HubNode.displayName = "HubNode";
