"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { CSSProperties, SetStateAction } from "react";
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
  ResourcesNode,
  ActionsNode,
  RoadblocksNode,
  type HubNodeType,
  type ChecklistNodeType,
  type TerminalNodeType,
} from "@/components/nodes";
import { NodeInfoPanel } from "@/components/node-info-panel";
import { ChatWidget } from "@/components/chat/chat-widget";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Home, BookOpenText } from "lucide-react";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import type { Roadmap } from "@/data/types/roadmap";
import { logger } from "@/lib/logger";
import {
  calculateChildOffsets,
  calculateChildPosition,
  createChildAnimation,
} from "@/lib/child-position-utils";
import {
  type NodeStatus,
  fetchNodeStatuses,
  setNodeStatus,
} from "@/lib/node-status";
import {
  type UserProfile,
  getCompletedLevels,
  getIrrelevantNodes,
  getCurrentLevelNodeId,
  LEVEL_METADATA,
} from "@/lib/profile-types";
import { calculateViewportForNode } from "@/lib/viewport-utils";
import { nullable } from "zod";

import useLocalStorage from "./local-storage";

import RoadmapTutorialWidget from "./roadmap-tutorial";
import { C } from "vitest/dist/chunks/reporters.d.BFLkQcL6.js";
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
  userProfile: UserProfile | null;
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

export function RoadmapFlow({ roadmap, userProfile }: RoadmapFlowProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const animationsRef = useRef<Map<string, () => void>>(new Map());
  const isDraggingRef = useRef<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>(
    {},
  );

  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const tutorialKey = `${userProfile?.clerkUserId ?? "guest-account"}:tutorial-finished`;
  // use the users id to identify if they have completed the tutorial already.
  const { getItem: getTutorialCompleted, setItem: setTutorialCompleted } =
    useLocalStorage(tutorialKey);

  // check local storage when roadmap renders
  useEffect(() => {
    const tutorialCompleted = getTutorialCompleted();
    // console.log(`Showed Tutorial: ${tutorialCompleted || false}`);

    if (!tutorialCompleted) {
      setTutorialCompleted("burger ate");
      return setShowTutorial(true);
    }
    // console.log(`Showed : ${tutorialCompleted || false}`);
  }, [getTutorialCompleted, setTutorialCompleted]);

  // Load statuses from database on mount, with localStorage fallback
  useEffect(() => {
    void fetchNodeStatuses(roadmap.metadata.id).then(setNodeStatuses);
  }, [roadmap.metadata.id]);

  // Calculate initial viewport based on user's current level
  const initialViewport = useMemo(() => {
    const currentNodeId = userProfile
      ? getCurrentLevelNodeId(userProfile.currentLevel)
      : null;

    return calculateViewportForNode(currentNodeId, roadmap.graph.nodes);
  }, [userProfile, roadmap.graph.nodes]);

  const initialNodes = useMemo<FlowNode[]>(() => {
    // Get personalization data from user profile
    const completedLevelIds = userProfile
      ? getCompletedLevels(userProfile.currentLevel)
      : [];
    const irrelevantNodeIds = userProfile
      ? getIrrelevantNodes(userProfile.specialization)
      : [];
    const currentLevelNodeId = userProfile
      ? getCurrentLevelNodeId(
          userProfile.currentLevel,
          userProfile.specialization,
        )
      : null;

    //build nodes from graph/content
    const builtNodes: FlowNode[] = roadmap.graph.nodes.map((graphNode) => {
      const content = roadmap.content.get(graphNode.id);

      // Category nodes don't have markdown content files
      const isCategoryNode = graphNode.id.includes("-resources") ||
                            graphNode.id.includes("-actions") ||
                            graphNode.id.includes("-roadblocks");

      if (!content && !isCategoryNode) {
        throw new Error(`Content not found for node: ${graphNode.id}`);
      }

      const isMainNode = !graphNode.parentId;

      // For category nodes, determine type and label from ID
      let nodeType: string;
      let nodeLabel: string;
      let nodeIcon: "brain" | "clipboard-list" | "traffic-cone" | undefined;

      if (isCategoryNode) {
        if (graphNode.id.includes("-resources")) {
          nodeType = "resources";
          nodeLabel = "Resources";
          nodeIcon = "brain";
        } else if (graphNode.id.includes("-actions")) {
          nodeType = "actions";
          nodeLabel = "Actions";
          nodeIcon = "clipboard-list";
        } else {
          nodeType = "roadblocks";
          nodeLabel = "Roadblocks";
          nodeIcon = "traffic-cone";
        }
      } else {
        const { frontmatter } = content!;
        nodeType = frontmatter.type;
        nodeLabel = frontmatter.title;
      }

      // Determine if this node should be auto-completed based on user profile
      const isCompletedByProfile = completedLevelIds.includes(graphNode.id);
      const isCurrentLevel = currentLevelNodeId === graphNode.id;
      const isDimmed = irrelevantNodeIds.includes(graphNode.id);

      // Prioritize user-set status over profile-based status
      let nodeStatus: NodeStatus = nodeStatuses[graphNode.id] ?? "base";
      if (!nodeStatuses[graphNode.id] && isCompletedByProfile) {
        nodeStatus = "completed";
      }

      return {
        id: graphNode.id,
        type: nodeType,
        position: graphNode.position,
        data: {
          label: nodeLabel,
          icon: nodeIcon,
          glow: content?.frontmatter.glow ?? isCurrentLevel,
          labelPosition: content?.frontmatter.labelPosition,
          showLabelDot: content?.frontmatter.showLabelDot,
          parentId: graphNode.parentId,
          status: nodeStatus,
          isCurrentLevel,
          isDimmed,
        },
        sourcePosition: stringToPosition(graphNode.sourcePosition),
        targetPosition: stringToPosition(graphNode.targetPosition),
        draggable: isMainNode,
        style: isDimmed ? { opacity: 0.3 } : undefined,
      } as FlowNode;
    });

    return builtNodes;
  }, [roadmap, nodeStatuses, userProfile]);

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

  // Update nodes when statuses change
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: nodeStatuses[node.id] ?? "base",
        },
      })),
    );
  }, [nodeStatuses, setNodes]);

  const childOffsets = useMemo(
    () => calculateChildOffsets(initialNodes),
    [initialNodes],
  );

  const updateChildrenPositions = useCallback(
    (parentId: string, parentX: number, parentY: number, smooth = false) => {
      setNodes((currentNodes) => {
        const updatedNodes = new Map(currentNodes.map(n => [n.id, n]));

        // Recursively update children and their descendants
        const updateNodeAndDescendants = (nodeId: string, newX: number, newY: number) => {
          // Find all direct children of this node
          currentNodes.forEach((node) => {
            const offset = childOffsets.get(node.id);
            if (offset && offset.parentId === nodeId) {
              const targetPosition = {
                x: newX + offset.offsetX,
                y: newY + offset.offsetY,
              };
              const newPosition = calculateChildPosition(
                node.position,
                targetPosition,
                smooth,
              );
              updatedNodes.set(node.id, { ...node, position: newPosition });

              // Recursively update this node's children
              updateNodeAndDescendants(node.id, newPosition.x, newPosition.y);
            }
          });
        };

        updateNodeAndDescendants(parentId, parentX, parentY);
        return Array.from(updatedNodes.values());
      });
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

      // Recursively animate all descendants
      const animateNodeAndDescendants = (nodeId: string, nodeX: number, nodeY: number) => {
        nodes.forEach((childNode) => {
          const offset = childOffsets.get(childNode.id);
          if (offset && offset.parentId === nodeId) {
            const targetX = nodeX + offset.offsetX;
            const targetY = nodeY + offset.offsetY;
            animateChildToTarget(childNode.id, targetX, targetY);

            // Recursively animate this child's descendants
            animateNodeAndDescendants(childNode.id, targetX, targetY);
          }
        });
      };

      animateNodeAndDescendants(node.id, node.position.x, node.position.y);
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
      category: ResourcesNode, // Will be determined dynamically in node creation
      resources: ResourcesNode,
      actions: ActionsNode,
      roadblocks: RoadblocksNode,
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
      // Update nodes to set isSelected flag
      setNodes((currentNodes) =>
        currentNodes.map((n) => ({
          ...n,
          data: { ...n.data, isSelected: n.id === node.id },
        })),
      );
    },
    [setNodes],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    // Clear isSelected flag from all nodes
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        data: { ...n.data, isSelected: false },
      })),
    );
  }, [setNodes]);

  const handleTutorialClick = (event: React.MouseEvent) => {
    event.preventDefault();
    console.log("smash burger");
    setShowTutorial(true);
  };

  const handleStatusChange = useCallback(
    (nodeId: string, status: NodeStatus) => {
      // Update localStorage immediately (returns void, database update happens in background)
      void setNodeStatus(roadmap.metadata.id, nodeId, status);
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
    <div className="relative h-screen w-full overflow-hidden bg-[#EDF2F6] dark:bg-[#0C1020]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={initialViewport}
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

      <div className="pointer-events-none absolute top-0 right-0 flex w-full justify-end p-4 md:pt-10 md:pr-10 md:pl-0">
        <div className="pointer-events-auto">
          {showTutorial && (
            <>
              <RoadmapTutorialWidget
                setShowTutorial={setShowTutorial}
                showTutorial={showTutorial}
              />
            </>
          )}
          {userProfile ? (
            <Card className="bg-background/95 supports-[backdrop-filter]:bg-background/80 min-h-[140px] p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="default"
                      className="bg-teal-500/20 text-teal-700 ring-teal-500/30 dark:text-teal-300"
                    >
                      {LEVEL_METADATA[userProfile.currentLevel].shortLabel}
                    </Badge>
                    <span className="text-sm font-medium">Welcome back!</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {LEVEL_METADATA[userProfile.currentLevel].label}
                  </p>
                </div>
                <div className="flex gap-1">
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleTutorialClick}
                    >
                      <BookOpenText className="h-4 w-4" />
                    </Button>
                  </div>
                  <Link href="/">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Home className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-background/95 supports-[backdrop-filter]:bg-background/80 min-h-[140px] p-4 backdrop-blur">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="default"
                    className="bg-yellow-500/20 text-yellow-700 ring-yellow-500/30 dark:text-yellow-300"
                  >
                    Guest Mode
                  </Badge>
                </div>
                <p className="text-muted-foreground max-w-xs text-xs">
                  Sign in to save your progress and get personalized
                  recommendations
                </p>
                <div className="flex gap-2">
                  <SignInButton mode="modal">
                    <Button
                      size="sm"
                      className="h-8 flex-1 bg-teal-500 hover:bg-teal-400"
                      onClick={() =>
                        logger.info("Guest clicked sign in from roadmap", {
                          source: "roadmap_profile_card",
                        })
                      }
                    >
                      Sign In
                    </Button>
                  </SignInButton>
                  <Link href="/">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Home className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

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

      <ChatWidget
        selectedNodeId={selectedNodeId ?? undefined}
        roadmapId={roadmap.metadata.id}
        userProfile={
          userProfile
            ? {
                trade: userProfile.trade,
                currentLevel: userProfile.currentLevel,
                specialization: userProfile.specialization,
                residencyStatus: userProfile.residencyStatus,
              }
            : undefined
        }
      />
    </div>
  );
}
