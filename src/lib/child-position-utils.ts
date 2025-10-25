import { animate } from "motion";
import type { Node as FlowNodeType } from "@xyflow/react";

export interface ChildOffset {
  parentId: string;
  offsetX: number;
  offsetY: number;
}

export function calculateChildOffsets<T extends FlowNodeType>(
  nodes: T[],
): Map<string, ChildOffset> {
  const offsets = new Map<string, ChildOffset>();

  nodes.forEach((node) => {
    const nodeData = node.data as { parentId?: string | null };
    if (nodeData.parentId) {
      const parent = nodes.find((n) => n.id === nodeData.parentId);
      if (parent) {
        offsets.set(node.id, {
          parentId: nodeData.parentId,
          offsetX: node.position.x - parent.position.x,
          offsetY: node.position.y - parent.position.y,
        });
      }
    }
  });

  return offsets;
}

export function calculateChildPosition(
  currentPosition: { x: number; y: number },
  targetPosition: { x: number; y: number },
  smooth: boolean,
  lagFactor = 0.3,
): { x: number; y: number } {
  if (!smooth) {
    return targetPosition;
  }

  return {
    x: currentPosition.x + (targetPosition.x - currentPosition.x) * lagFactor,
    y: currentPosition.y + (targetPosition.y - currentPosition.y) * lagFactor,
  };
}

export function createChildAnimation(
  childNode: FlowNodeType,
  targetX: number,
  targetY: number,
  onUpdate: (position: { x: number; y: number }) => void,
): () => void {
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    return () => {
      return;
    };
  }

  const pos = {
    x: Number.isFinite(childNode.position.x) ? childNode.position.x : 0,
    y: Number.isFinite(childNode.position.y) ? childNode.position.y : 0,
  };

  const controls = animate(
    pos,
    { x: targetX, y: targetY },
    {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.5,
      onUpdate: () => {
        if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
          onUpdate({ x: pos.x, y: pos.y });
        }
      },
    },
  );

  return () => controls.stop();
}
