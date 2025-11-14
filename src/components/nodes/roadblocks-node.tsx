import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { CategoryNode, type CategoryNodeType } from "./category-node";

/**
 * Roadblocks category node - orange/red with traffic-cone icon
 * Organizes potential roadblocks and challenges (eligibility issues, prerequisites, barriers)
 */
function RoadblocksNodeComponent(props: NodeProps<CategoryNodeType>) {
  return (
    <CategoryNode
      {...props}
      data={{
        ...props.data,
        icon: "traffic-cone",
        color: "#FE5000", // Orange
      }}
    />
  );
}

export const RoadblocksNode = memo(RoadblocksNodeComponent);
RoadblocksNode.displayName = "RoadblocksNode";
