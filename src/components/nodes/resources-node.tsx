import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { CategoryNode, type CategoryNodeType } from "./category-node";

/**
 * Resources category node - blue with brain icon
 * Organizes resource-related checklist items (program outlines, exam breakdowns, guides)
 */
function ResourcesNodeComponent(props: NodeProps<CategoryNodeType>) {
  return (
    <CategoryNode
      {...props}
      data={{
        ...props.data,
        icon: "brain",
        color: "#0077CC", // Blue
      }}
    />
  );
}

export const ResourcesNode = memo(ResourcesNodeComponent);
ResourcesNode.displayName = "ResourcesNode";
