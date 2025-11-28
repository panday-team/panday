"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  Position,
  type Node as FlowNodeType,
  useNodesState,
  useEdgesState,
  useReactFlow,
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
  type CategoryNodeType,
} from "@/components/nodes";
import {
  NodeInfoPanel,
  type Category,
  type CustomNodeEditData,
} from "@/components/node-info-panel";
import { ChatWidget } from "@/components/chat/chat-widget";
import {
  RoadmapTutorial,
  type TutorialInteractionType,
  type TutorialStep,
} from "@/components/roadmap-tutorial";
import { ZoomSlider } from "@/components/zoom-slider";
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
import { calculateCustomNodePositions } from "@/lib/custom-node-positioning";
import { resolveCollisions, detectCollisions } from "@/lib/collision-physics";
import {
  type UserProfile,
  getCompletedLevels,
  getIrrelevantNodes,
  getCurrentLevelNodeId,
  LEVEL_METADATA,
} from "@/lib/profile-types";
import { calculateViewportForNode } from "@/lib/viewport-utils";
import { calculateNodeProgress } from "@/lib/progress-utils";
import { useResponsive } from "@/lib/use-responsive";
import AnimatedDirectionEdge from "@/components/edges/animated-direction-edge";

type FlowNode =
  | HubNodeType
  | ChecklistNodeType
  | TerminalNodeType
  | CategoryNodeType;
type FlowEdge = Edge;

// Type definition for custom node content JSON field
// checklistItems can be either old format (string[]) or new format (object[])
interface CustomNodeContent {
  checklistItems?: Array<
    string | { id: string; title: string; completed: boolean }
  >;
  resources?: Array<{ label: string; href: string }>;
  notes?: string;
  dueDate?: string;
}

const flowColor = "#35C1B9";

const baseEdgeStyle: CSSProperties = {
  stroke: flowColor,
  strokeWidth: 2.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

// Legacy marker kept for reference; not used now that animatedDirection edges render their own markers.

interface RoadmapFlowProps {
  roadmap: Roadmap;
  userProfile: UserProfile | null;
  customNodes?: Array<{
    id: string;
    parentId: string;
    title: string;
    description: string;
    type: string;
    status: string;
    content?: {
      checklistItems?: Array<{ id: string; title: string; completed: boolean }>;
      resources?: Array<{ label: string; href: string }>;
      notes?: string;
      dueDate?: string;
    } | null;
  }>;
  onRefreshCustomNodes?: (nodeId?: string) => void;
  newlyCreatedNodeId?: string;
  onNodePanned?: () => void;
  /** Initial node ID to select and navigate to (from URL deep link) */
  initialSelectedNodeId?: string;
  /** Callback when initial node navigation is complete */
  onInitialNodeHandled?: () => void;
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

function RoadmapFlowInner({
  roadmap,
  userProfile,
  customNodes = [],
  onRefreshCustomNodes,
  newlyCreatedNodeId,
  onNodePanned,
  initialSelectedNodeId,
  onInitialNodeHandled,
}: RoadmapFlowProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const animationsRef = useRef<Map<string, () => void>>(new Map());
  const isDraggingRef = useRef<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>(
    {},
  );
  const { fitView, setCenter, getViewport, screenToFlowPosition, setViewport } =
    useReactFlow();
  const responsive = useResponsive();

  // Track custom node positions for physics-based collision avoidance
  const [customNodePositionsOverride, setCustomNodePositionsOverride] =
    useState<Map<string, { x: number; y: number }>>(new Map());

  // Track which category nodes are expanded (showing their checklist children)
  // Always initialize with empty Set to avoid hydration mismatch
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Load from sessionStorage after mount (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = sessionStorage.getItem(
        `roadmap-expanded-${roadmap.metadata.id}`,
      );
      if (stored) {
        setExpandedCategories(new Set(JSON.parse(stored) as string[]));
      }
    } catch {
      // Ignore errors
    }
  }, [roadmap.metadata.id]);

  // Persist expanded state to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      `roadmap-expanded-${roadmap.metadata.id}`,
      JSON.stringify(Array.from(expandedCategories)),
    );
  }, [expandedCategories, roadmap.metadata.id]);

  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [showTutorialSkipAlert, setShowTutorialSkipAlert] =
    useState<boolean>(false);
  const [currentTutorialStep, setCurrentTutorialStep] =
    useState<TutorialStep | null>(null);

  // Load statuses from database on mount, with localStorage fallback
  useEffect(() => {
    void fetchNodeStatuses(roadmap.metadata.id).then(setNodeStatuses);
  }, [roadmap.metadata.id]);

  // Pre-compute node relationships once for reuse across multiple memos
  const nodeRelationships = useMemo(() => {
    const hubNodeIds = new Set(
      roadmap.graph.nodes
        .filter((n) => !n.parentId && !n.parentIds)
        .map((n) => n.id),
    );
    const nodesByParent = new Map<string, typeof roadmap.graph.nodes>();
    for (const node of roadmap.graph.nodes) {
      // Handle both single parent and multiple parents
      const parents = node.parentIds ?? (node.parentId ? [node.parentId] : []);
      for (const parentId of parents) {
        const siblings = nodesByParent.get(parentId) ?? [];
        siblings.push(node);
        nodesByParent.set(parentId, siblings);
      }
    }
    return { hubNodeIds, nodesByParent };
  }, [roadmap]);
  // Show tutorial if user hasn't completed it
  useEffect(() => {
    if (userProfile && !userProfile.tutorialCompletedAt) {
      setShowTutorial(true);
      // Close node info panel and deselect nodes when tutorial starts
      setSelectedNodeId(null);
    }
  }, [userProfile]);

  // Auto-pan to newly created custom node
  useEffect(() => {
    if (!newlyCreatedNodeId) return;

    // Small delay to ensure node is rendered
    const timer = setTimeout(() => {
      // Pan viewport to the new node with smooth animation
      void fitView({
        nodes: [{ id: newlyCreatedNodeId }],
        duration: 800,
        padding: 0.3,
        maxZoom: 1.5,
      }).then(() => {
        // Select the node to open its info panel after panning completes
        setSelectedNodeId(newlyCreatedNodeId);

        // Notify parent that panning is complete
        onNodePanned?.();
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [newlyCreatedNodeId, fitView, onNodePanned]);

  // Calculate initial viewport based on user's current level
  const initialViewport = useMemo(() => {
    const currentNodeId = userProfile
      ? getCurrentLevelNodeId(userProfile.currentLevel)
      : null;

    return calculateViewportForNode(currentNodeId, roadmap.graph.nodes);
  }, [userProfile, roadmap.graph.nodes]);

  // OPTIMIZATION: Split initialNodes into smaller memos to reduce recalculation

  // 1. Profile-derived data (only recalculates when profile changes)
  const profileData = useMemo(() => {
    if (!userProfile) {
      return {
        completedLevelIds: [],
        irrelevantNodeIds: [],
        currentLevelNodeId: null,
      };
    }
    return {
      completedLevelIds: getCompletedLevels(userProfile.currentLevel),
      irrelevantNodeIds: getIrrelevantNodes(
        userProfile.specialization,
        userProfile.currentLevel,
      ),
      currentLevelNodeId: getCurrentLevelNodeId(
        userProfile.currentLevel,
        userProfile.specialization,
      ),
    };
  }, [userProfile]);

  // 2. Visibility filter (recalculates when selection changes)
  const visibleNodeIds = useMemo(() => {
    const { hubNodeIds, nodesByParent } = nodeRelationships;
    const visible = new Set<string>();

    for (const graphNode of roadmap.graph.nodes) {
      const parents =
        graphNode.parentIds ?? (graphNode.parentId ? [graphNode.parentId] : []);

      // Always show hub and category nodes (nodes with no parents)
      if (parents.length === 0) {
        visible.add(graphNode.id);
        continue;
      }

      // Category nodes have a hub as parent (O(1) lookup)
      if (parents.some((parentId) => hubNodeIds.has(parentId))) {
        visible.add(graphNode.id);
        continue;
      }

      // Checklist nodes: show if ANY parent category is selected OR any sibling is selected
      let shouldShow = false;
      for (const parentId of parents) {
        // Show if the parent category itself is selected
        if (selectedNodeId === parentId) {
          shouldShow = true;
          break;
        }

        // Show if any sibling (same parent) is selected
        const siblings = nodesByParent.get(parentId) ?? [];
        if (siblings.some((n) => n.id === selectedNodeId)) {
          shouldShow = true;
          break;
        }
      }

      if (shouldShow) {
        visible.add(graphNode.id);
      }
    }

    return visible;
  }, [roadmap.graph.nodes, selectedNodeId, nodeRelationships]);

  const initialNodes = useMemo<FlowNode[]>(() => {
    const { completedLevelIds, irrelevantNodeIds, currentLevelNodeId } =
      profileData;
    const { nodesByParent } = nodeRelationships;

    //build nodes from graph/content (using pre-computed visibility)
    const builtNodes: FlowNode[] = roadmap.graph.nodes
      .filter((graphNode) => visibleNodeIds.has(graphNode.id))
      .map((graphNode) => {
        const content = roadmap.content.get(graphNode.id);

        // Category nodes don't have markdown content files
        const isCategoryNode =
          graphNode.id.includes("-resources") ||
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

        // Cascade dimming from parent nodes
        let isDimmed = irrelevantNodeIds.includes(graphNode.id);

        // If node has parent(s), check dimming logic
        if (!isDimmed) {
          const parents =
            graphNode.parentIds ??
            (graphNode.parentId ? [graphNode.parentId] : []);

          // For shared nodes (multiple parents), only dim if ALL parents are dimmed
          // For regular nodes (single parent), dim if that parent is dimmed
          const isSharedNode = parents.length > 1;

          if (isSharedNode) {
            // Shared node: dim only if ALL parents are irrelevant
            const allParentsDimmed = parents.every((parentId) => {
              const parentNode = roadmap.graph.nodes.find(
                (n) => n.id === parentId,
              );
              if (!parentNode) return false;

              // Check if parent category is dimmed
              if (irrelevantNodeIds.includes(parentNode.id)) return true;

              // Check if parent's hub is dimmed
              const parentParents =
                parentNode.parentIds ??
                (parentNode.parentId ? [parentNode.parentId] : []);
              return parentParents.some((ppId) =>
                irrelevantNodeIds.includes(ppId),
              );
            });

            isDimmed = allParentsDimmed;
          } else {
            // Regular node: dim if ANY parent in chain is dimmed
            for (const parentId of parents) {
              const parentNode = roadmap.graph.nodes.find(
                (n) => n.id === parentId,
              );
              if (parentNode) {
                // Check if parent hub is dimmed
                if (irrelevantNodeIds.includes(parentNode.id)) {
                  isDimmed = true;
                  break;
                }
                // Check if parent connector is dimmed (for checklist nodes)
                const parentParents =
                  parentNode.parentIds ??
                  (parentNode.parentId ? [parentNode.parentId] : []);
                if (
                  parentParents.some((ppId) => irrelevantNodeIds.includes(ppId))
                ) {
                  isDimmed = true;
                  break;
                }
              }
            }
          }
        }

        // Prioritize user-set status over profile-based status
        let nodeStatus: NodeStatus = nodeStatuses[graphNode.id] ?? "base";
        if (!nodeStatuses[graphNode.id] && isCompletedByProfile) {
          nodeStatus = "completed";
        }

        // Calculate animation index for checklist nodes (for cascade animation)
        let animationIndex: number | undefined;
        const parents =
          graphNode.parentIds ??
          (graphNode.parentId ? [graphNode.parentId] : []);
        if (parents.length > 0 && !isMainNode && !isCategoryNode) {
          // This is a checklist node - find its index among siblings (use pre-computed map)
          // For shared nodes, use the first parent for animation index
          const firstParent = parents[0];
          if (firstParent) {
            const siblings = nodesByParent.get(firstParent) ?? [];
            animationIndex = siblings.findIndex((n) => n.id === graphNode.id);
          }
        }

        // For category nodes, determine if expanded based on selection
        let isExpanded: boolean | undefined = undefined;
        if (isCategoryNode) {
          // Category is expanded if it's selected OR any of its children is selected
          const isCategorySelected = selectedNodeId === graphNode.id;
          const hasChildSelected = selectedNodeId
            ? (nodesByParent.get(graphNode.id) ?? []).some(
                (n) => n.id === selectedNodeId,
              )
            : false;
          isExpanded = isCategorySelected || hasChildSelected;
        }

        const progress = calculateNodeProgress(
          graphNode.id,
          nodeType,
          nodeStatuses,
          roadmap.graph.nodes,
          roadmap.content,
        );

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
            parentId: graphNode.parentId, // Keep for backward compatibility
            parentIds: graphNode.parentIds, // New multi-parent support
            status: nodeStatus,
            isCurrentLevel,
            isDimmed,
            isExpanded,
            isSelected: selectedNodeId === graphNode.id,
            animationIndex,
            progress: progress?.percentage ?? undefined,
          },
          sourcePosition: stringToPosition(graphNode.sourcePosition),
          targetPosition: stringToPosition(graphNode.targetPosition),
          draggable: isMainNode,
          style: isDimmed ? { opacity: 0.3 } : undefined,
        } as FlowNode;
      });

    // Process custom nodes with smart positioning
    // Build parent position map
    const parentPositions = new Map<string, { x: number; y: number }>();
    for (const node of builtNodes) {
      parentPositions.set(node.id, node.position);
    }
    // Include graph nodes as fallback
    for (const node of roadmap.graph.nodes) {
      if (!parentPositions.has(node.id)) {
        parentPositions.set(node.id, node.position);
      }
    }

    // Calculate smart positions for all custom nodes
    const customNodePositions = calculateCustomNodePositions(
      customNodes.map((n) => ({ id: n.id, parentId: n.parentId })),
      parentPositions,
      builtNodes.map((n) => ({ id: n.id, position: n.position })),
    );

    const processedCustomNodes: FlowNode[] = customNodes.map((customNode) => {
      // Get calculated position or fallback to direct-entry
      let position = customNodePositions.get(customNode.id);

      if (!position) {
        // Fallback for orphaned nodes
        const defaultNode =
          builtNodes.find((n) => n.id === "direct-entry") ?? builtNodes[0];
        if (defaultNode) {
          position = {
            x: defaultNode.position.x + 150,
            y: defaultNode.position.y,
          };
        } else {
          position = { x: 0, y: 0 };
        }
      }

      return {
        id: customNode.id,
        type: "checklist", // Use checklist appearance
        position,
        data: {
          label: customNode.title,
          icon: "clipboard-list",
          status: (nodeStatuses[customNode.id] ??
            customNode.status) as NodeStatus, // Check nodeStatuses first, then fallback to database status
          parentId: customNode.parentId,
          isCustom: true, // Flag for custom styling if needed
          isCurrentLevel: false,
          isDimmed: false,
          isSelected: selectedNodeId === customNode.id,
        },
        draggable: true, // Allow user to move their custom notes
      } as FlowNode;
    });

    return [...builtNodes, ...processedCustomNodes];
  }, [
    roadmap,
    nodeStatuses,
    profileData,
    visibleNodeIds,
    nodeRelationships,
    customNodes,
    selectedNodeId,
  ]);

  const initialEdges = useMemo<FlowEdge[]>(() => {
    // Get personalization data for edge filtering
    const irrelevantNodeIds = userProfile
      ? getIrrelevantNodes(userProfile.specialization, userProfile.currentLevel)
      : [];

    const standardEdges = roadmap.graph.edges
      .filter((graphEdge) => {
        const targetNode = roadmap.graph.nodes.find(
          (n) => n.id === graphEdge.target,
        );
        const sourceNode = roadmap.graph.nodes.find(
          (n) => n.id === graphEdge.source,
        );

        // Hide edges from parent categories to their checklist children
        // (these connector arrows are not needed visually)
        if (targetNode?.parentId === sourceNode?.id) {
          return false;
        }
        // Also check parentIds array for shared nodes
        if (targetNode?.parentIds?.includes(sourceNode?.id ?? "")) {
          return false;
        }

        // Filter edges from dimmed category nodes (respecting specialization)
        // For shared nodes with multiple parents, hide edges from irrelevant parents
        if (sourceNode) {
          // Check if source category is dimmed
          const isSourceDimmed = irrelevantNodeIds.includes(sourceNode.id);
          if (isSourceDimmed) return false;

          // Check if source's parent hub is dimmed (for category nodes)
          if (sourceNode.parentId) {
            const isSourceParentDimmed = irrelevantNodeIds.includes(
              sourceNode.parentId,
            );
            if (isSourceParentDimmed) return false;
          }
        }

        // Hide edges to checklist nodes whose category is not selected
        if (targetNode?.parentId || targetNode?.parentIds) {
          // Check if target is a checklist node (has category parent(s))
          const targetParents =
            targetNode.parentIds ??
            (targetNode.parentId ? [targetNode.parentId] : []);

          // For each parent, check if it's a category node
          for (const parentId of targetParents) {
            const parentNode = roadmap.graph.nodes.find(
              (n) => n.id === parentId,
            );
            const isCategoryParent =
              parentNode?.parentId !== undefined &&
              parentNode?.parentId !== null;

            if (isCategoryParent) {
              // For shared nodes, only show edges from the selected parent
              // or if the edge source matches this parent
              if (graphEdge.source === parentId) {
                // Show edge if parent category is selected
                if (selectedNodeId === parentId) return true;

                // Show edge if any sibling is selected
                const hasSiblingSelected = roadmap.graph.nodes.some(
                  (n) => n.parentId === parentId && n.id === selectedNodeId,
                );
                if (hasSiblingSelected) return true;

                return false; // Hide edge if category not selected
              }
            }
          }
        }

        return true;
      })
      .map((graphEdge) => ({
        id: graphEdge.id,
        source: graphEdge.source,
        target: graphEdge.target,
        sourceHandle: graphEdge.sourceHandle,
        targetHandle: graphEdge.targetHandle,
        // Use animated direction edge for primary roadmap flow
        type: "animatedDirection",
        style: baseEdgeStyle,
      }));

    // Helper function to determine correct handle based on relative position
    const getHandleIds = (
      sourcePos: { x: number; y: number },
      targetPos: { x: number; y: number },
    ): { sourceHandle: string; targetHandle: string } => {
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;

      // Determine primary direction based on larger delta
      const isHorizontal = Math.abs(dx) > Math.abs(dy);

      if (isHorizontal) {
        // Target is to the right or left
        if (dx > 0) {
          // Target is to the right
          return {
            sourceHandle: "right-source",
            targetHandle: "left-target",
          };
        } else {
          // Target is to the left
          return {
            sourceHandle: "left-source",
            targetHandle: "right-target",
          };
        }
      } else {
        // Target is above or below
        if (dy > 0) {
          // Target is below
          return {
            sourceHandle: "bottom-source",
            targetHandle: "top-target",
          };
        } else {
          // Target is above
          return {
            sourceHandle: "top-source",
            targetHandle: "bottom-target",
          };
        }
      }
    };

    // Build position lookup map from initialNodes
    const nodePositionMap = new Map<string, { x: number; y: number }>();
    for (const node of initialNodes) {
      nodePositionMap.set(node.id, node.position);
    }

    // Add edges for custom nodes
    // Show dashed connectors from custom nodes to ALL their parents
    const customEdges: FlowEdge[] = customNodes.flatMap((customNode) => {
      const parentIds = customNode.parentId.split(",").map((id) => id.trim());
      const customNodePos = nodePositionMap.get(customNode.id);

      if (!customNodePos) return [];

      // Create a dashed edge from custom node to each parent
      return parentIds
        .map((parentId, index) => {
          const parentPos = nodePositionMap.get(parentId);
          if (!parentPos) return null;

          const { sourceHandle, targetHandle } = getHandleIds(
            parentPos,
            customNodePos,
          );

          return {
            id: `custom-edge-${customNode.id}-${parentId}-${index}`,
            source: parentId,
            target: customNode.id,
            sourceHandle,
            targetHandle,
            type: "bezier" as const,
            style: {
              ...baseEdgeStyle,
              strokeDasharray: "5,5", // Dashed line
              stroke: "#FFB830", // Golden color for custom nodes
              strokeWidth: 1.5,
              opacity: 0.6,
            },
            // No arrow marker for custom edges
            animated: false,
          } as FlowEdge;
        })
        .filter((edge): edge is FlowEdge => edge !== null);
    });

    return [...standardEdges, ...customEdges];
  }, [roadmap, selectedNodeId, userProfile, customNodes, initialNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Update edges when selection changes (affects subnode visibility)
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Update nodes when selection changes (for animations to work)
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update nodes when statuses change (optimized to only update changed nodes)
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const newStatus = nodeStatuses[node.id] ?? "base";
        // Only update nodes that have a status property (skip CategoryNodeData)
        if ("status" in node.data && node.data.status !== newStatus) {
          return {
            ...node,
            data: {
              ...node.data,
              status: newStatus,
            },
          };
        }
        // Return same reference = no re-render for this node
        return node;
      }),
    );
  }, [nodeStatuses, setNodes]);

  // Physics-based collision avoidance for custom nodes
  useEffect(() => {
    if (customNodes.length === 0) return;

    // Get all currently visible nodes
    const visibleNodes = nodes.filter((n) => {
      // Include hub nodes, category nodes, and visible checklist nodes
      const data = n.data as Record<string, unknown>;
      if (!data.parentId && !data.parentIds) return true; // Hub/terminal
      if (data.isExpanded !== undefined) return true; // Category nodes
      // Checklist nodes visible when parent is selected
      return false; // Will be checked separately
    });

    // Detect expanded categories
    const expandedCategoryNodes = visibleNodes.filter((n) => {
      const data = n.data as Record<string, unknown>;
      return data.isExpanded === true;
    });

    // Get visible checklist nodes (children of expanded categories)
    const visibleChecklistNodes = nodes.filter((n) => {
      const data = n.data as Record<string, unknown>;
      const parents = Array.isArray(data.parentIds)
        ? (data.parentIds as string[])
        : typeof data.parentId === "string"
          ? [data.parentId]
          : [];
      return parents.some((parentId: string) =>
        expandedCategoryNodes.some((cat) => cat.id === parentId),
      );
    });

    // Get custom nodes
    const customNodesList = nodes.filter((n) => {
      const data = n.data as Record<string, unknown>;
      return data.isCustom === true;
    });

    if (customNodesList.length === 0) return;

    // Detect collisions
    const collidingIds = detectCollisions(
      customNodesList.map((n) => ({ id: n.id, position: n.position })),
      expandedCategoryNodes.map((n) => ({ id: n.id, position: n.position })),
      visibleChecklistNodes.map((n) => ({ id: n.id, position: n.position })),
    );

    // If collisions detected, run physics simulation
    if (collidingIds.size > 0) {
      const adjustedPositions = resolveCollisions(
        customNodesList.map((n) => ({
          id: n.id,
          position: n.position,
          size: 56,
        })),
        [
          ...expandedCategoryNodes.map((n) => ({
            id: n.id,
            position: n.position,
            size: 96,
          })),
          ...visibleChecklistNodes.map((n) => ({
            id: n.id,
            position: n.position,
            size: 64,
          })),
        ],
        50, // iterations
      );

      // Update positions with smooth animation
      setCustomNodePositionsOverride(adjustedPositions);
    } else {
      // Clear overrides when no collisions
      setCustomNodePositionsOverride(new Map());
    }
  }, [nodes, customNodes]);

  // Apply position overrides with smooth animation
  useEffect(() => {
    if (customNodePositionsOverride.size === 0) return;

    // Animate nodes to new positions
    customNodePositionsOverride.forEach((targetPos, nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Use React Flow's built-in smooth position update
      setNodes((currentNodes) =>
        currentNodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                position: targetPos,
                // Add animated class for CSS transition
                style: {
                  ...n.style,
                  transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                },
              }
            : n,
        ),
      );
    });
  }, [customNodePositionsOverride, nodes, setNodes]);

  const childOffsets = useMemo(
    () => calculateChildOffsets(initialNodes),
    [initialNodes],
  );

  const updateChildrenPositions = useCallback(
    (parentId: string, parentX: number, parentY: number, smooth = false) => {
      setNodes((currentNodes) => {
        const updatedNodes = new Map(currentNodes.map((n) => [n.id, n]));

        // Recursively update children and their descendants
        const updateNodeAndDescendants = (
          nodeId: string,
          newX: number,
          newY: number,
        ) => {
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
      const animateNodeAndDescendants = (
        nodeId: string,
        nodeX: number,
        nodeY: number,
      ) => {
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

  const handleTutorialInteraction = useCallback(
    (interactionType: TutorialInteractionType) => {
      // Forward interaction to tutorial component via window global
      const handler = (
        window as Window & {
          __tutorialInteractionHandler?: (
            type: TutorialInteractionType,
          ) => void;
        }
      ).__tutorialInteractionHandler;
      if (handler) {
        handler(interactionType);
      }
    },
    [],
  );

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

  const edgeTypes = useMemo<EdgeTypes>(
    () => ({
      animatedDirection: AnimatedDirectionEdge,
    }),
    [],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "bezier" as const,
      style: baseEdgeStyle,
      // markerEnd removed to allow custom edges to be arrow-less by default
    }),
    [],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNodeType) => {
      setSelectedNodeId(node.id);
      // Update nodes to set isSelected flag (optimized to only update changed nodes)
      setNodes((currentNodes) =>
        currentNodes.map((n) => {
          const shouldBeSelected = n.id === node.id;
          // Only create new object if isSelected state changed
          if (n.data.isSelected !== shouldBeSelected) {
            return {
              ...n,
              data: { ...n.data, isSelected: shouldBeSelected },
            };
          }
          // Return same reference = no re-render for this node
          return n;
        }),
      );

      // Notify tutorial of node click
      handleTutorialInteraction("node-click");
    },
    [setNodes, handleTutorialInteraction],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    // Clear isSelected flag from all nodes (optimized to only update changed nodes)
    setNodes((currentNodes) =>
      currentNodes.map((n) => {
        // Only create new object if node was previously selected
        if (n.data.isSelected === true) {
          return {
            ...n,
            data: { ...n.data, isSelected: false },
          };
        }
        // Return same reference = no re-render for this node
        return n;
      }),
    );
  }, [setNodes]);

  const onMove = useCallback(() => {
    // Only notify tutorial of zoom/pan changes if we're on the zoom-slider step
    // This prevents viewport animations from auto-completing steps
    if (currentTutorialStep?.id === "zoom-slider") {
      handleTutorialInteraction("zoom-change");
    }
  }, [handleTutorialInteraction, currentTutorialStep]);

  const handleStatusChange = useCallback(
    (nodeId: string, status: NodeStatus) => {
      // Update localStorage immediately (returns void, database update happens in background)
      void setNodeStatus(roadmap.metadata.id, nodeId, status);
      setNodeStatuses((prev) => ({ ...prev, [nodeId]: status }));

      // Update the node data (optimized to only update the specific node)
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (
            node.id === nodeId &&
            "status" in node.data &&
            node.data.status !== status
          ) {
            return { ...node, data: { ...node.data, status } };
          }
          // Return same reference for unchanged nodes
          return node;
        }),
      );
    },
    [roadmap.metadata.id, setNodes],
  );

  const handleTutorialComplete = useCallback(async () => {
    setShowTutorial(false);

    // Mark tutorial as completed in database
    if (userProfile) {
      try {
        await fetch("/api/profile/tutorial", {
          method: "POST",
        });
      } catch (error) {
        logger.error("Failed to mark tutorial as completed", error as Error, {
          component: "roadmap-flow",
        });
      }
    }
  }, [userProfile]);

  const handleTutorialSkip = useCallback(() => {
    setShowTutorial(false);
    setShowTutorialSkipAlert(true);

    // Hide alert after 5 seconds
    setTimeout(() => {
      setShowTutorialSkipAlert(false);
    }, 5000);
  }, []);

  const handleTutorialOpen = useCallback(() => {
    setShowTutorial(true);
    setShowTutorialSkipAlert(false);
    // Close node info panel when tutorial is manually opened
    setSelectedNodeId(null);
  }, []);

  const handleTutorialStepChange = useCallback(
    (step: TutorialStep) => {
      // Store current step for interaction filtering
      setCurrentTutorialStep(step);

      // Close node panel if step requires it
      if (step.viewport?.closeNodePanel) {
        setSelectedNodeId(null);
      }

      // Animate viewport based on step config
      if (step.viewport) {
        const { zoom, center } = step.viewport;

        // Calculate target zoom based on device
        let targetZoom = 0.8; // default
        if (typeof zoom === "number") {
          targetZoom = zoom;
        } else if (typeof zoom === "object") {
          targetZoom = responsive.isMobile
            ? zoom.mobile
            : responsive.isTablet
              ? zoom.tablet
              : zoom.desktop;
        }

        // Animate to new viewport
        setTimeout(() => {
          if (center === "user-level") {
            // Move to user's current level (same logic as initialViewport)
            const currentNodeId = userProfile
              ? getCurrentLevelNodeId(userProfile.currentLevel)
              : null;
            const targetViewport = calculateViewportForNode(
              currentNodeId,
              roadmap.graph.nodes,
            );

            // Apply the step's target zoom
            void setViewport(
              {
                x: targetViewport.x,
                y: targetViewport.y,
                zoom: targetZoom,
              },
              { duration: 600 },
            );
          } else if (center === "fit-all") {
            // Keep current viewport position, just adjust zoom
            // This maintains the user's current level position (set by initialViewport)
            const currentViewport = getViewport();
            void setViewport(
              {
                x: currentViewport.x,
                y: currentViewport.y,
                zoom: targetZoom,
              },
              { duration: 600 },
            );
          } else {
            // Default behavior (includes "no-change"): Keep current center point fixed, adjust zoom
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            const centerWorld = screenToFlowPosition({
              x: viewportWidth / 2,
              y: viewportHeight / 2,
            });

            void setCenter(centerWorld.x, centerWorld.y, {
              duration: 600,
              zoom: targetZoom,
            });
          }
        }, 100);
      }
    },
    [
      setCenter,
      setViewport,
      getViewport,
      screenToFlowPosition,
      responsive.isMobile,
      responsive.isTablet,
      userProfile,
      roadmap.graph.nodes,
    ],
  );

  const handleViewportAdjustment = useCallback(
    (selector?: string) => {
      if (!selector) return;

      // Small delay to ensure elements are rendered
      setTimeout(() => {
        // Find all matching elements
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return;

        // Get bounding boxes of all elements
        const rects: DOMRect[] = [];
        for (const element of elements) {
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            rects.push(rect);
          }
        }

        if (rects.length === 0) return;

        // Calculate combined bounding box
        const minX = Math.min(...rects.map((r) => r.left));
        const minY = Math.min(...rects.map((r) => r.top));
        const maxX = Math.max(...rects.map((r) => r.right));
        const maxY = Math.max(...rects.map((r) => r.bottom));

        // Calculate center point in screen coordinates
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Responsive UI padding based on breakpoint and panel state
        const isNodePanelOpen = selectedNodeId !== null;
        const isMobile = responsive.isMobile;
        const isTablet = responsive.isTablet;

        let uiPaddingLeft = 40;
        const uiPaddingRight = 100;
        const uiPaddingTop = isMobile ? 80 : 120;
        const uiPaddingBottom = isMobile ? 120 : 100;

        // Adjust for node panel (only on desktop/tablet when open)
        if (isNodePanelOpen && !isMobile) {
          uiPaddingLeft = isTablet ? 420 : 540; // Panel width + margin
        }

        // Calculate adjusted center (accounting for UI elements)
        const adjustedCenterX =
          (uiPaddingLeft + (viewportWidth - uiPaddingRight)) / 2;
        const adjustedCenterY =
          (uiPaddingTop + (viewportHeight - uiPaddingBottom)) / 2;

        // Check if elements are already in the clear area
        const isInClearArea =
          centerX > uiPaddingLeft &&
          centerX < viewportWidth - uiPaddingRight &&
          centerY > uiPaddingTop &&
          centerY < viewportHeight - uiPaddingBottom;

        // Only adjust if not already in clear area
        if (!isInClearArea) {
          // Convert screen coordinates to flow coordinates
          const currentViewport = getViewport();
          const zoom = currentViewport.zoom;

          // Convert element center screen coordinates to flow coordinates
          const elementWorldPos = screenToFlowPosition({
            x: centerX,
            y: centerY,
          });

          // Calculate offset from viewport center to adjusted center
          // We want elementWorldPos to be at (adjustedCenterX, adjustedCenterY)
          // setCenter puts target at (viewportWidth/2, viewportHeight/2)
          const viewportCenterX = viewportWidth / 2;
          const viewportCenterY = viewportHeight / 2;

          // The offset in screen pixels
          const screenOffsetX = adjustedCenterX - viewportCenterX;
          const screenOffsetY = adjustedCenterY - viewportCenterY;

          // The target center we need to look at
          const targetX = elementWorldPos.x - screenOffsetX / zoom;
          const targetY = elementWorldPos.y - screenOffsetY / zoom;

          // Pan to center the elements in the clear area
          void setCenter(targetX, targetY, {
            duration: 600,
            zoom: zoom, // Keep current zoom level
          });
        }
      }, 200);
    },
    [setCenter, getViewport, screenToFlowPosition, selectedNodeId, responsive],
  );

  const selectedContent = useMemo(() => {
    if (!selectedNodeId) return null;

    // Check if it's a custom node
    const customNode = customNodes?.find((n) => n.id === selectedNodeId);
    if (customNode) {
      // Parse content JSON field for rich data with explicit type cast for better IDE support
      const contentData = customNode.content as CustomNodeContent | null;

      // Normalize checklistItems to handle both old format (string[]) and new format (object[])
      const rawItems = contentData?.checklistItems ?? [];
      const normalizedChecklistItems = rawItems.map((item, index) => {
        // If item is a string (old format), convert to object
        if (typeof item === "string") {
          return {
            id: `legacy-${customNode.id}-${index}`,
            title: item,
            completed: false,
          };
        }
        // Already an object (new format)
        return item;
      });

      return {
        frontmatter: {
          id: customNode.id,
          title: customNode.title,
          type: "checklist" as const,
          badge: "Custom",
          subtitle: "Personalized Step", // Add default subtitle
          duration: "Flexible", // Add default duration
        },
        content: customNode.description,
        eligibility: [],
        benefits: [],
        outcomes: [],
        resources: contentData?.resources ?? [],
        checklistItems: normalizedChecklistItems,
      };
    }

    // Standard content
    return roadmap.content.get(selectedNodeId) ?? null;
  }, [selectedNodeId, roadmap.content, customNodes]);

  // Build categories for hub/category nodes (for Quick Navigation dropdown)
  const selectedNodeCategories = useMemo<Category[] | undefined>(() => {
    if (!selectedNodeId) return undefined;

    const selectedNode = roadmap.graph.nodes.find(
      (n) => n.id === selectedNodeId,
    );
    if (!selectedNode) return undefined;

    const { nodesByParent } = nodeRelationships;

    // Case 1: Selected node is a category node
    const isCategoryNode =
      selectedNode.id.includes("-resources") ||
      selectedNode.id.includes("-actions") ||
      selectedNode.id.includes("-roadblocks");

    if (isCategoryNode) {
      // Show only this category's checklist items (use pre-computed map)
      const checklistNodes = nodesByParent.get(selectedNodeId) ?? [];

      const categoryContent = roadmap.content.get(selectedNodeId);

      const items = checklistNodes.map((node) => ({
        id: node.id,
        title: roadmap.content.get(node.id)?.frontmatter.title ?? node.id,
        status: nodeStatuses[node.id] ?? "base",
      }));

      // Inject resources from parent hub if this is a resources node
      if (selectedNode.id.includes("-resources") && selectedNode.parentId) {
        const parentContent = roadmap.content.get(selectedNode.parentId);
        if (parentContent?.resources) {
          const resourceItems = parentContent.resources.map(
            (resource, index) => {
              const resourceId = `resource-${selectedNode.parentId}-${index}`;
              return {
                id: resourceId,
                title: resource.label,
                status: nodeStatuses[resourceId] ?? "base",
                href: resource.href,
              };
            },
          );
          items.push(...resourceItems);
        }
      }

      return [
        {
          id: selectedNodeId,
          title: categoryContent?.frontmatter.title ?? "Category",
          description: categoryContent?.content,
          items,
        },
      ];
    }

    // Case 2: Selected node is a hub node (no parentId)
    if (selectedNode.parentId) return undefined;

    // Find all category nodes for this hub (use pre-computed map)
    const categoryNodes = nodesByParent.get(selectedNodeId) ?? [];

    // Build category data with their checklist items
    const categories: Category[] = categoryNodes.map((categoryNode) => {
      const categoryContent = roadmap.content.get(categoryNode.id);

      // Find all checklist items for this category (use pre-computed map)
      const checklistNodes = nodesByParent.get(categoryNode.id) ?? [];

      const items = checklistNodes.map((node) => ({
        id: node.id,
        title: roadmap.content.get(node.id)?.frontmatter.title ?? node.id,
        status: nodeStatuses[node.id] ?? "base",
      }));

      // Inject resources if this is a resources category
      if (categoryNode.id.includes("-resources")) {
        const hubContent = roadmap.content.get(selectedNodeId);
        if (hubContent?.resources) {
          const resourceItems = hubContent.resources.map((resource, index) => {
            const resourceId = `resource-${selectedNodeId}-${index}`;
            return {
              id: resourceId,
              title: resource.label,
              status: nodeStatuses[resourceId] ?? "base",
              href: resource.href,
            };
          });
          items.push(...resourceItems);
        }
      }

      return {
        id: categoryNode.id,
        title: categoryContent?.frontmatter.title ?? "Category",
        description: categoryContent?.content,
        items,
      };
    });

    return categories;
  }, [selectedNodeId, roadmap, nodeRelationships, nodeStatuses]);

  // Calculate progress for selected node
  const selectedNodeProgress = useMemo(() => {
    if (!selectedNodeId) return null;

    const selectedContent = roadmap.content.get(selectedNodeId);
    if (!selectedContent) return null;

    return calculateNodeProgress(
      selectedNodeId,
      selectedContent.frontmatter.type,
      nodeStatuses,
      roadmap.graph.nodes,
      roadmap.content,
    );
  }, [selectedNodeId, roadmap, nodeStatuses]);

  // Get parent node info for back navigation
  const selectedNodeParent = useMemo(() => {
    if (!selectedNodeId) return null;

    // Check if it's a custom node first
    const customNode = customNodes?.find((n) => n.id === selectedNodeId);
    if (customNode) {
      // Custom nodes have parentId as a comma-separated string, use first parent
      const firstParentId = customNode.parentId.split(",")[0]?.trim();
      if (firstParentId) {
        const parentContent = roadmap.content.get(firstParentId);
        return {
          id: firstParentId,
          title: parentContent?.frontmatter.title ?? firstParentId,
        };
      }
      return null;
    }

    // Find the selected graph node
    const graphNode = roadmap.graph.nodes.find((n) => n.id === selectedNodeId);
    if (!graphNode) return null;

    // Get parent ID (use first parent if multiple)
    const parentId = graphNode.parentIds?.[0] ?? graphNode.parentId ?? null;
    if (!parentId) return null;

    // Get parent content for title
    const parentContent = roadmap.content.get(parentId);

    // For category nodes (resources, actions, roadblocks), return the parent hub
    // For checklist nodes, return their parent category
    return {
      id: parentId,
      title: parentContent?.frontmatter.title ?? parentId,
    };
  }, [selectedNodeId, roadmap, customNodes]);

  // Handle navigation from Quick Navigation dropdown
  const handleNavigateToNode = useCallback(
    (nodeId: string) => {
      // Select the node (this will automatically show its category's subnodes)
      setSelectedNodeId(nodeId);
      setNodes((currentNodes) =>
        currentNodes.map((n) => {
          const shouldBeSelected = n.id === nodeId;
          // Only create new object if isSelected state changed
          if (n.data.isSelected !== shouldBeSelected) {
            return {
              ...n,
              data: { ...n.data, isSelected: shouldBeSelected },
            };
          }
          // Return same reference = no re-render for this node
          return n;
        }),
      );

      // Wait for nodes to update before centering viewport
      setTimeout(() => {
        void fitView({
          nodes: [{ id: nodeId }],
          duration: 500,
          padding: 0.3,
        });
      }, 100);
    },
    [setNodes, fitView],
  );

  const handleDeleteCustomNode = useCallback(
    async (nodeId: string) => {
      // Optimistic update: immediately hide the node
      setNodes((currentNodes) =>
        currentNodes.map((n) => (n.id === nodeId ? { ...n, hidden: true } : n)),
      );

      // Close the info panel immediately
      setSelectedNodeId(null);

      try {
        const response = await fetch(`/api/custom-nodes/${nodeId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete custom node");
        }

        // Refresh custom nodes from parent to sync with server state
        if (onRefreshCustomNodes) {
          onRefreshCustomNodes();
        }
      } catch (error) {
        logger.error("Failed to delete custom node", error, { nodeId });

        // Rollback optimistic update on error
        setNodes((currentNodes) =>
          currentNodes.map((n) =>
            n.id === nodeId ? { ...n, hidden: false } : n,
          ),
        );

        alert("Failed to delete the node. Please try again.");
      }
    },
    [onRefreshCustomNodes, setNodes],
  );

  const handleEditCustomNode = useCallback(
    async (nodeId: string, data: CustomNodeEditData) => {
      try {
        const response = await fetch(`/api/custom-nodes/${nodeId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            content: {
              checklistItems: data.checklistItems,
              resources: data.resources,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update custom node");
        }

        // Refresh custom nodes from parent to sync with server state
        if (onRefreshCustomNodes) {
          onRefreshCustomNodes(nodeId);
        }
      } catch (error) {
        logger.error("Failed to update custom node", error, { nodeId });
        throw error; // Re-throw so the UI can handle it
      }
    },
    [onRefreshCustomNodes],
  );

  // Handle initial node selection from URL deep link (e.g., /roadmap?node=foundation-program)
  // Track if we've already handled this initial node to avoid re-running on nodes array changes
  const initialNodeHandledRef = useRef(false);
  useEffect(() => {
    // Only handle once per initialSelectedNodeId
    if (initialNodeHandledRef.current || !initialSelectedNodeId) {
      return;
    }
    if (nodes.length > 0) {
      // Check if the node exists in the roadmap
      const nodeExists = nodes.some((n) => n.id === initialSelectedNodeId);
      if (nodeExists) {
        // Use the existing navigation function to select and pan to the node
        handleNavigateToNode(initialSelectedNodeId);
      }
      // Mark as handled and clear the initial node ID
      initialNodeHandledRef.current = true;
      onInitialNodeHandled?.();
    }
  }, [
    initialSelectedNodeId,
    nodes,
    handleNavigateToNode,
    onInitialNodeHandled,
  ]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#EDF2F6] dark:bg-[#0C1020]">
      <ReactFlow
        data-tutorial="react-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
        onMove={onMove}
        disableKeyboardA11y={true}
        className="[&_.react-flow__attribution]:hidden [&_.react-flow__edge-path]:drop-shadow-[0_0_6px_rgba(53,193,185,0.25)]"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="rgba(39, 86, 205, 0.2)"
          gap={300}
          variant={BackgroundVariant.Lines}
        />
        <ZoomSlider position="bottom-left" orientation="vertical" />
      </ReactFlow>

      <div className="pointer-events-none absolute top-0 right-0 flex w-full justify-end p-4 md:pt-10 md:pr-10 md:pl-0">
        <div className="pointer-events-auto">
          {userProfile ? (
            <Card className="bg-background/95 supports-[backdrop-filter]:bg-background/80 p-4 backdrop-blur">
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
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleTutorialOpen}
                    >
                      <BookOpenText className="h-4 w-4" />
                    </Button>
                    {showTutorialSkipAlert && (
                      <div className="animate-tutorial-slide-down absolute top-10 right-0 z-50 rounded-md bg-yellow-400 px-3 py-2 text-xs font-medium whitespace-nowrap text-black shadow-lg">
                        Tutorial skipped! Click to restart.
                      </div>
                    )}
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
            <Card className="bg-background/95 supports-[backdrop-filter]:bg-background/80 p-4 backdrop-blur">
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
                  <div className="flex gap-1">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={handleTutorialOpen}
                      >
                        <BookOpenText className="h-4 w-4" />
                      </Button>
                      {showTutorialSkipAlert && (
                        <div className="animate-tutorial-slide-down absolute top-10 right-0 z-50 rounded-md bg-yellow-400 px-3 py-2 text-xs font-medium whitespace-nowrap text-black shadow-lg">
                          Tutorial skipped! Click to restart.
                        </div>
                      )}
                    </div>
                    <Link href="/">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Home className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {selectedContent && selectedNodeId && (
        <div className="pointer-events-none absolute top-0 left-0 z-[10000] flex w-full justify-start p-4 md:pt-10 md:pr-0 md:pl-10">
          <div className="pointer-events-auto">
            <NodeInfoPanel
              badge={selectedContent.frontmatter.badge}
              subtitle={
                selectedContent.frontmatter.subtitle ??
                selectedContent.frontmatter.duration
              }
              title={selectedContent.frontmatter.title}
              description={selectedContent.content}
              eligibility={selectedContent.eligibility}
              benefits={selectedContent.benefits}
              outcomes={selectedContent.outcomes}
              resources={selectedContent.resources}
              checklistItems={selectedContent.checklistItems}
              categories={selectedNodeCategories}
              nodeType={selectedContent.frontmatter.type}
              nodeId={selectedNodeId}
              nodeStatus={nodeStatuses[selectedNodeId] ?? "base"}
              progress={selectedNodeProgress}
              isCustomNode={customNodes.some((n) => n.id === selectedNodeId)}
              parentNodeId={selectedNodeParent?.id}
              parentNodeTitle={selectedNodeParent?.title}
              onStatusChange={(status) =>
                handleStatusChange(selectedNodeId, status)
              }
              onNavigateToNode={handleNavigateToNode}
              onChecklistStatusChange={handleStatusChange}
              onDeleteCustomNode={handleDeleteCustomNode}
              onEditCustomNode={handleEditCustomNode}
              onCheckboxClick={() =>
                handleTutorialInteraction("checkbox-click")
              }
              onDropdownOpen={() => handleTutorialInteraction("dropdown-open")}
              onClose={onPaneClick}
            />
          </div>
        </div>
      )}

      <ChatWidget
        selectedNodeId={selectedNodeId ?? undefined}
        selectedNodeTitle={selectedContent?.frontmatter.title ?? undefined}
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
        onChatOpen={() => handleTutorialInteraction("chat-open")}
        forceClose={showTutorial}
        onCustomNodeCreated={onRefreshCustomNodes}
        isNodePanelOpen={!!selectedNodeId && !!selectedContent}
      />

      <RoadmapTutorial
        open={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
        onInteraction={handleTutorialInteraction}
        onRequestViewportAdjustment={handleViewportAdjustment}
        onStepChange={handleTutorialStepChange}
      />
    </div>
  );
}

export function RoadmapFlow(props: RoadmapFlowProps) {
  return (
    <ReactFlowProvider>
      <RoadmapFlowInner {...props} />
    </ReactFlowProvider>
  );
}
