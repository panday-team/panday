"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  type Edge,
  type NodeTypes,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  CheckpointNode,
  HubNode,
  PortalNode,
  RequirementNode,
  TerminalNode,
  type CheckpointNodeType,
  type HubNodeType,
  type PortalNodeType,
  type RequirementNodeType,
  type TerminalNodeType,
} from "@/components/nodes";
import { NodeInfoPanel } from "@/components/node-info-panel";

type FlowNode =
  | HubNodeType
  | RequirementNodeType
  | PortalNodeType
  | CheckpointNodeType
  | TerminalNodeType;
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

const rawNodes: FlowNode[] = [
  {
    id: "level-2-work-based-training",
    type: "hub",
    position: { x: 320, y: 180 },
    data: { label: "Level 2 Work Based Training", glow: true },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
  {
    id: "level-2-technical-training",
    type: "hub",
    position: { x: 450, y: 360 },
    data: { label: "Level 2 Technical Training", glow: true },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Left,
  },
  {
    id: "foundation-program",
    type: "hub",
    position: { x: 360, y: 560 },
    data: { label: "Foundation Program", glow: true },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Left,
  },
  {
    id: "waiting-period",
    type: "checkpoint",
    position: { x: 490, y: 600 },
    data: { label: "Waiting Period" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "foundation-requirements",
    type: "requirement",
    position: { x: 580, y: 480 },
    data: {
      label: "Foundation Program Requirements",
      labelPosition: "right",
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "foundation-complete",
    type: "requirement",
    position: { x: 600, y: 660 },
    data: {
      label: "Completed!",
      labelPosition: "right",
      showLabelDot: false,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "employer-options",
    type: "requirement",
    position: { x: 660, y: 320 },
    data: {
      label: "Options for finding an employer as a sponsor",
      labelPosition: "right",
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "skilledtradesbc-portal",
    type: "portal",
    position: { x: 240, y: 420 },
    data: { label: "SkilledTradesBC Portal", labelPosition: "left" },
    sourcePosition: Position.Right,
    targetPosition: Position.Right,
  },
  {
    id: "level-3-technical-training",
    type: "hub",
    position: { x: 520, y: 210 },
    data: { label: "Level 3 Technical Training" },
    sourcePosition: Position.Right,
    targetPosition: Position.Bottom,
  },
  {
    id: "level-3-work-based-training",
    type: "hub",
    position: { x: 440, y: 40 },
    data: { label: "Level 3 Work Based Training" },
    sourcePosition: Position.Right,
    targetPosition: Position.Bottom,
  },
  {
    id: "level-4-technical-training",
    type: "hub",
    position: { x: 560, y: -120 },
    data: { label: "Level 4 Technical Training" },
    sourcePosition: Position.Right,
    targetPosition: Position.Bottom,
  },
  {
    id: "red-seal-certification",
    type: "terminal",
    position: { x: 640, y: -260 },
    data: { label: "Red Seal Certification" },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
  {
    id: "journey-start",
    type: "terminal",
    position: { x: 520, y: 800 },
    data: { label: "Direct Entry" },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  },
];

const rawEdges: FlowEdge[] = [
  {
    id: "edge-work-to-technical",
    source: "level-2-work-based-training",
    target: "level-2-technical-training",
    sourceHandle: "bottom-source",
    targetHandle: "left-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-technical-to-foundation",
    source: "level-2-technical-training",
    target: "foundation-program",
    sourceHandle: "bottom-source",
    targetHandle: "left-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-foundation-to-waiting",
    source: "foundation-program",
    target: "waiting-period",
    sourceHandle: "right-source",
    targetHandle: "left-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-foundation-to-requirements",
    source: "foundation-program",
    target: "foundation-requirements",
    sourceHandle: "right-source",
    targetHandle: "left-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-foundation-to-complete",
    source: "foundation-program",
    target: "foundation-complete",
    sourceHandle: "right-source",
    targetHandle: "left-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-waiting-to-direct",
    source: "waiting-period",
    target: "journey-start",
    sourceHandle: "right-source",
    targetHandle: "top-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-technical-to-employer",
    source: "level-2-technical-training",
    target: "employer-options",
    sourceHandle: "right-source",
    targetHandle: "left-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-portal-to-level3technical",
    source: "skilledtradesbc-portal",
    target: "level-3-technical-training",
    sourceHandle: "right-source",
    targetHandle: "right-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-level3technical-to-work",
    source: "level-3-technical-training",
    target: "level-3-work-based-training",
    sourceHandle: "top-source",
    targetHandle: "bottom-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-level3work-to-level4",
    source: "level-3-work-based-training",
    target: "level-4-technical-training",
    sourceHandle: "top-source",
    targetHandle: "bottom-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
  {
    id: "edge-level4-to-redseal",
    source: "level-4-technical-training",
    target: "red-seal-certification",
    sourceHandle: "top-source",
    targetHandle: "top-target",
    type: "bezier",
    style: baseEdgeStyle,
    markerEnd: arrowMarker,
  },
];

export default function App() {
  const nodes = useMemo<FlowNode[]>(
    () => structuredClone<FlowNode[]>(rawNodes),
    [],
  );

  const edges = useMemo<FlowEdge[]>(
    () => structuredClone<FlowEdge[]>(rawEdges),
    [],
  );

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      hub: HubNode,
      requirement: RequirementNode,
      portal: PortalNode,
      checkpoint: CheckpointNode,
      terminal: TerminalNode,
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

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0B1021]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={{ x: -160, y: -160, zoom: 0.85 }}
        minZoom={0.5}
        maxZoom={1.5}
        panOnScroll
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        className="[&_.react-flow__attribution]:hidden [&_.react-flow__edge-path]:drop-shadow-[0_0_6px_rgba(53,193,185,0.25)]"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="rgba(53, 193, 185, 0.2)"
          gap={36}
          variant={BackgroundVariant.Lines}
        />
      </ReactFlow>

      <div className="pointer-events-none absolute top-0 left-0 flex w-full justify-start pt-10 pl-10">
        <NodeInfoPanel
          badge="Start"
          subtitle="Level 2 Work Based Training • Chat"
          title="Red Seal Certification"
          description="Red Seal Certification is the final step to becoming a fully certified journeyperson Construction Electrician, recognized across Canada."
          eligibility={[
            "Complete all levels of technical training.",
            "Document 6,000 work-based hours with your sponsor.",
            "Demonstrate full-scope trade experience.",
          ]}
          benefits={[
            "Work anywhere in Canada as a Red Seal electrician.",
            "Gain national recognition for your qualifications.",
            "Signal mastery of electrical construction standards.",
          ]}
          outcomes={[
            "Pass the Interprovincial Red Seal exam.",
            "Earn the Certificate of Qualification with Red Seal.",
            "Advance from apprentice to journeyperson.",
          ]}
          resources={[
            {
              label: "Construction Electrician Profile",
              href: "https://skilledtradesbc.ca/sites/default/files/2023-08/construction-electrician-program-profile-december-2022-harmonized_v1.pdf",
            },
            {
              label: "Red Seal Exam Preparation Guide",
              href: "https://red-seal.ca/eng/resources/g.2tr.2.1dy.shtml",
            },
            {
              label: "SkilledTradesBC: About Exams",
              href: "https://skilledtradesbc.ca/get-certified/about-exams",
            },
          ]}
        />
      </div>
    </div>
  );
}
