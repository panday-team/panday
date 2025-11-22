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

// Custom equality check to prevent unnecessary re-renders
export const HubNode = memo(HubNodeComponent, (prev, next) => {
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
HubNode.displayName = "HubNode";
