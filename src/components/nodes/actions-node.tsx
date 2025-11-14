import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { CategoryNode, type CategoryNodeType } from "./category-node";

/**
 * Actions category node - green with clipboard-list icon
 * Organizes action-related checklist items (training requirements, certifications, tasks)
 */
function ActionsNodeComponent(props: NodeProps<CategoryNodeType>) {
  return (
    <CategoryNode
      {...props}
      data={{
        ...props.data,
        icon: "clipboard-list",
        color: "#00A36C", // Green
      }}
    />
  );
}

export const ActionsNode = memo(ActionsNodeComponent);
ActionsNode.displayName = "ActionsNode";
