"use client";

import { useMemo, useState, useCallback } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  CheckpointNode,
  HubNode,
  PortalNode,
  RequirementNode,
  TerminalNode,
  ChecklistNode,
  type CheckpointNodeType,
  type HubNodeType,
  type PortalNodeType,
  type RequirementNodeType,
  type TerminalNodeType,
  type ChecklistNodeType,
} from "@/components/nodes";
import { NodeInfoPanel } from "@/components/node-info-panel";
import type { Roadmap } from "@/data/types/roadmap";

type FlowNode =
  | HubNodeType
  | RequirementNodeType
  | PortalNodeType
  | CheckpointNodeType
  | TerminalNodeType
  | ChecklistNodeType;
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

/**
 * Convert Position string to Position enum
 */
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

  const nodes = useMemo<FlowNode[]>(() => {
    return roadmap.graph.nodes.map((graphNode) => {
      const content = roadmap.content.get(graphNode.id);
      if (!content) {
        throw new Error(`Content not found for node: ${graphNode.id}`);
      }

      const { frontmatter } = content;

      return {
        id: graphNode.id,
        type: frontmatter.type,
        position: graphNode.position,
        data: {
          label: frontmatter.title,
          glow: frontmatter.glow,
          labelPosition: frontmatter.labelPosition,
          showLabelDot: frontmatter.showLabelDot,
        },
        sourcePosition: stringToPosition(graphNode.sourcePosition),
        targetPosition: stringToPosition(graphNode.targetPosition),
      } as FlowNode;
    });
  }, [roadmap]);

  const edges = useMemo<FlowEdge[]>(() => {
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

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      hub: HubNode,
      requirement: RequirementNode,
      portal: PortalNode,
      checkpoint: CheckpointNode,
      terminal: TerminalNode,
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

  // Get the selected node content for the info panel
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
        minZoom={0.4}
        maxZoom={3.0}
        panOnScroll
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
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
