"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  type Edge,
  type NodeTypes,
  Position,
  MiniMap,
  type Node as FlowNodeType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { animate } from "motion";

import {
  HubNode,
  ChecklistNode,
  type HubNodeType,
  type ChecklistNodeType,
} from "@/components/nodes";
import { NodeInfoPanel } from "@/components/node-info-panel";
import type { Roadmap } from "@/data/types/roadmap";

type FlowNode = HubNodeType | ChecklistNodeType;
type FlowEdge = Edge;

const flowColor = "#35C1B9";

const baseEdgeStyle: CSSProperties = {
  stroke: flowColor,
  strokeWidth: 2.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const arrowMarker = {
  type: MarkerType.ArrowClosed,
  color: flowColor,
  width: 18,
  height: 18,
} as const;

interface RoadmapFlowProps {
  roadmap: Roadmap;
}

function stringToPosition(pos?: string): Position | undefined {
  if (!pos) return undefined;
  const posMap: Record<string, Position> = {
    left: Position.Left,
    right: Position.Right,
    top: Position.Top,
    bottom: Position.Bottom,
  };
  return posMap[pos.toLowerCase()];
}

export function RoadmapFlow({ roadmap }: RoadmapFlowProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const animationsRef = useRef<Map<string, () => void>>(new Map());
  const isDraggingRef = useRef<string | null>(null);

  const initialNodes = useMemo<FlowNode[]>(() => {
    return roadmap.graph.nodes.map((graphNode) => {
      const content = roadmap.content.get(graphNode.id);
      if (!content) {
        throw new Error(`Content not found for node: ${graphNode.id}`);
      }

      const { frontmatter } = content;
      const isMainNode = !graphNode.parentId;

      return {
        id: graphNode.id,
        type: frontmatter.type,
        position: graphNode.position,
        data: {
          label: frontmatter.title,
          glow: frontmatter.glow,
          labelPosition: frontmatter.labelPosition,
          showLabelDot: frontmatter.showLabelDot,
          parentId: graphNode.parentId,
        },
        sourcePosition: stringToPosition(graphNode.sourcePosition),
        targetPosition: stringToPosition(graphNode.targetPosition),
        draggable: isMainNode,
      } as FlowNode;
    });
  }, [roadmap]);

  const initialEdges = useMemo<FlowEdge[]>(() => {
    return roadmap.graph.edges.map((graphEdge) => ({
      id: graphEdge.id,
      source: graphEdge.source,
      target: graphEdge.target,
      sourceHandle: graphEdge.sourceHandle,
      targetHandle: graphEdge.targetHandle,
      type: graphEdge.type ?? "bezier",
      style: baseEdgeStyle,
      markerEnd: arrowMarker,
    }));
  }, [roadmap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges] = useEdgesState(initialEdges);

  const childOffsets = useMemo(() => {
    const offsets = new Map<
      string,
      { parentId: string; offsetX: number; offsetY: number }
    >();

    initialNodes.forEach((node) => {
      const nodeData = node.data as { parentId?: string | null };
      if (nodeData.parentId) {
        const parent = initialNodes.find((n) => n.id === nodeData.parentId);
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
  }, [initialNodes]);

  const updateChildrenPositions = useCallback(
    (parentId: string, parentX: number, parentY: number, smooth = false) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const offset = childOffsets.get(node.id);
          if (offset && offset.parentId === parentId) {
            const targetX = parentX + offset.offsetX;
            const targetY = parentY + offset.offsetY;

            if (smooth) {
              const currentX = node.position.x;
              const currentY = node.position.y;
              const lagFactor = 0.3;
              return {
                ...node,
                position: {
                  x: currentX + (targetX - currentX) * lagFactor,
                  y: currentY + (targetY - currentY) * lagFactor,
                },
              };
            } else {
              return { ...node, position: { x: targetX, y: targetY } };
            }
          }
          return node;
        }),
      );
    },
    [childOffsets, setNodes],
  );

  const animateChildToTarget = useCallback(
    (childId: string, targetX: number, targetY: number) => {
      const childNode = nodes.find((n) => n.id === childId);
      if (!childNode) return;

      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
        return;
      }

      const existingAnimation = animationsRef.current.get(childId);
      if (existingAnimation) {
        existingAnimation();
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
              setNodes((currentNodes) =>
                currentNodes.map((n) =>
                  n.id === childId
                    ? { ...n, position: { x: pos.x, y: pos.y } }
                    : n,
                ),
              );
            }
          },
        },
      );

      animationsRef.current.set(childId, () => controls.stop());
    },
    [nodes, setNodes],
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: FlowNodeType) => {
      isDraggingRef.current = node.id;
      updateChildrenPositions(node.id, node.position.x, node.position.y, true);
    },
    [updateChildrenPositions],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: FlowNodeType) => {
      isDraggingRef.current = null;

      nodes.forEach((childNode) => {
        const offset = childOffsets.get(childNode.id);
        if (offset && offset.parentId === node.id) {
          const targetX = node.position.x + offset.offsetX;
          const targetY = node.position.y + offset.offsetY;
          animateChildToTarget(childNode.id, targetX, targetY);
        }
      });
    },
    [nodes, childOffsets, animateChildToTarget],
  );

  useEffect(() => {
    const animations = animationsRef.current;
    return () => {
      animations.forEach((stop) => stop());
      animations.clear();
    };
  }, []);

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      hub: HubNode,
      checklist: ChecklistNode,
    }),
    [],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "bezier" as const,
      style: baseEdgeStyle,
      markerEnd: arrowMarker,
    }),
    [],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNodeType) => {
      setSelectedNodeId(node.id);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const selectedContent = selectedNodeId
    ? roadmap.content.get(selectedNodeId)
    : null;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0B1021]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={{ x: 850, y: 400, zoom: 0.8 }}
        minZoom={0.2}
        maxZoom={3.0}
        panOnScroll
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodesChange={onNodesChange}
        disableKeyboardA11y={true}
        className="[&_.react-flow__attribution]:hidden [&_.react-flow__edge-path]:drop-shadow-[0_0_6px_rgba(53,193,185,0.25)]"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="rgba(53, 193, 185, 0.2)"
          gap={36}
          variant={BackgroundVariant.Lines}
        />

        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          className="bg-[#1D2740]/80 backdrop-blur"
        />
      </ReactFlow>

      {selectedContent && (
        <div className="pointer-events-none absolute top-0 left-0 flex w-full justify-start pt-10 pl-10">
          <div className="pointer-events-auto">
            <NodeInfoPanel
              badge={selectedContent.frontmatter.badge ?? "Node"}
              subtitle={
                selectedContent.frontmatter.subtitle ??
                selectedContent.frontmatter.duration
              }
              title={selectedContent.frontmatter.title}
              description={selectedContent.content
                .split("\n")
                .find((line) => line.startsWith("#") === false && line.trim())
                ?.trim()}
              eligibility={selectedContent.eligibility}
              benefits={selectedContent.benefits}
              outcomes={selectedContent.outcomes}
              resources={selectedContent.resources}
              checklists={selectedContent.frontmatter.checklists}
            />
          </div>
        </div>
      )}
    </div>
  );
}
