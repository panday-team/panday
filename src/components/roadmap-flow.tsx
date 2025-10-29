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
  type Node as FlowNodeType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  HubNode,
  ChecklistNode,
  TerminalNode,
  type HubNodeType,
  type ChecklistNodeType,
  type TerminalNodeType,
} from "@/components/nodes";
import { NodeInfoPanel } from "@/components/node-info-panel";
import { ChatWidget } from "@/components/chat/chat-widget";
import type { Roadmap } from "@/data/types/roadmap";
import {
  calculateChildOffsets,
  calculateChildPosition,
  createChildAnimation,
} from "@/lib/child-position-utils";
import {
  type NodeStatus,
  getAllNodeStatuses,
  setNodeStatus,
} from "@/lib/node-status";

type FlowNode = HubNodeType | ChecklistNodeType | TerminalNodeType;
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
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>(
    () => {
      if (typeof window === "undefined") return {};
      return getAllNodeStatuses(roadmap.metadata.id);
    },
  );

  const initialNodes = useMemo<FlowNode[]>(() => {
    //build nodes from graph/content
    const builtNodes: FlowNode[] = roadmap.graph.nodes.map((graphNode) => {
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
          status: nodeStatuses[graphNode.id] ?? "base",
        },
        sourcePosition: stringToPosition(graphNode.sourcePosition),
        targetPosition: stringToPosition(graphNode.targetPosition),
        draggable: isMainNode,
      } as FlowNode;
    });

    return builtNodes;
  }, [roadmap, nodeStatuses]);

  const initialEdges = useMemo<FlowEdge[]>(() => {
    return roadmap.graph.edges
      .filter((graphEdge) => {
        const targetNode = roadmap.graph.nodes.find(
          (n) => n.id === graphEdge.target,
        );
        const sourceNode = roadmap.graph.nodes.find(
          (n) => n.id === graphEdge.source,
        );
        if (targetNode?.parentId === sourceNode?.id) {
          return false;
        }
        return true;
      })
      .map((graphEdge) => ({
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

  const childOffsets = useMemo(
    () => calculateChildOffsets(initialNodes),
    [initialNodes],
  );

  const updateChildrenPositions = useCallback(
    (parentId: string, parentX: number, parentY: number, smooth = false) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const offset = childOffsets.get(node.id);
          if (offset && offset.parentId === parentId) {
            const targetPosition = {
              x: parentX + offset.offsetX,
              y: parentY + offset.offsetY,
            };
            const newPosition = calculateChildPosition(
              node.position,
              targetPosition,
              smooth,
            );
            return { ...node, position: newPosition };
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

      const existingAnimation = animationsRef.current.get(childId);
      if (existingAnimation) {
        existingAnimation();
      }

      const stopAnimation = createChildAnimation(
        childNode,
        targetX,
        targetY,
        (position) => {
          setNodes((currentNodes) =>
            currentNodes.map((n) =>
              n.id === childId ? { ...n, position } : n,
            ),
          );
        },
      );

      animationsRef.current.set(childId, stopAnimation);
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
      terminal: TerminalNode,
      requirement: HubNode,
      portal: HubNode,
      checkpoint: HubNode,
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

  const handleStatusChange = useCallback(
    (nodeId: string, status: NodeStatus) => {
      setNodeStatus(roadmap.metadata.id, nodeId, status);
      setNodeStatuses((prev) => ({ ...prev, [nodeId]: status }));

      // Update the node data
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, status } }
            : node,
        ),
      );
    },
    [roadmap.metadata.id, setNodes],
  );

  const selectedContent = selectedNodeId
    ? roadmap.content.get(selectedNodeId)
    : null;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0C1020]">
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
          color="rgba(39, 86, 205, 0.2)"
          gap={300}
          variant={BackgroundVariant.Lines}
        />
      </ReactFlow>

      {selectedContent && selectedNodeId && (
        <div className="pointer-events-none absolute top-0 left-0 flex w-full justify-start p-4 md:pt-10 md:pr-0 md:pl-10">
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
              nodeType={selectedContent.frontmatter.type}
              nodeId={selectedNodeId}
              nodeStatus={nodeStatuses[selectedNodeId] ?? "base"}
              onStatusChange={(status) =>
                handleStatusChange(selectedNodeId, status)
              }
            />
          </div>
        </div>
      )}

      <ChatWidget selectedNodeId={selectedNodeId ?? undefined} />
    </div>
  );
}
