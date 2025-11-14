import type { Position } from "@xyflow/react";

/**
 * Node types available in the roadmap
 */
export type NodeType =
  | "hub"
  | "requirement"
  | "portal"
  | "checkpoint"
  | "terminal"
  | "category"
  | "checklist";

/**
 * Metadata for an entire roadmap/career path
 */
export interface RoadmapMetadata {
  id: string;
  title: string;
  province?: string;
  industry?: string;
  description?: string;
  version: string;
  lastUpdated: string;
}

/**
 * Frontmatter schema for markdown content files
 */
export interface NodeContentFrontmatter {
  id: string;
  type: NodeType;
  badge?: string;
  title: string;
  subtitle?: string;
  nodeType: NodeType;
  glow?: boolean;
  labelPosition?: "top" | "bottom" | "left" | "right";
  showLabelDot?: boolean;
  prerequisites?: string[];
  nextSteps?: string[];
  estimatedDuration?: string;
  duration?: string;
}

/**
 * Parsed markdown content with frontmatter
 */
export interface NodeContent {
  frontmatter: NodeContentFrontmatter;
  content: string;
  eligibility?: string[];
  benefits?: string[];
  outcomes?: string[];
  resources?: Array<{
    label: string;
    href: string;
  }>;
}

/**
 * Configuration for a category node with its child checklist nodes
 */
export interface CategoryConfig {
  id: string;
  type: "category";
  title: string;
  icon: "brain" | "clipboard-list" | "traffic-cone";
  nodes: Array<{
    id: string;
    type: string;
    title: string;
    nodeType: string;
    labelPosition?: "left" | "right" | "top" | "bottom";
  }>;
}

/**
 * Graph node position and connection data
 */
export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  sourcePosition?: Position;
  targetPosition?: Position;
  parentId?: string | null;
  categoryId?: string | null;
}

/**
 * Graph edge connection data
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: "bezier" | "straight" | "step" | "smoothstep";
}

/**
 * Complete graph structure
 */
export interface RoadmapGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * User progress tracking
 */
export interface UserProgress {
  userId: string;
  roadmapId: string;
  completedNodes: string[];
  currentNode?: string;
  startedAt: string;
  lastUpdated: string;
}

/**
 * Combined roadmap data
 */
export interface Roadmap {
  metadata: RoadmapMetadata;
  graph: RoadmapGraph;
  content: Map<string, NodeContent>;
}
