import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
} from "d3-force";
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import {
  validateParentReferences,
  validateConnectionTargets,
  validateNodePositions,
  logValidationErrors,
  type ValidationError,
} from "../src/lib/graph-validation";

interface Position {
  x: number;
  y: number;
}

interface LayoutConfig {
  position: Position;
  connectsTo?: string[];
  subnodeLayout?: {
    spacing?: number;
    offsetX?: number;
    offsetY?: number;
  };
}

interface SubnodeConfig {
  id: string;
  type: string;
  title: string;
  nodeType: string;
  labelPosition?: "left" | "right" | "top" | "bottom";
}

interface ChecklistFrontmatter {
  milestoneId: string;
  nodes: SubnodeConfig[];
}

interface GraphNode {
  id: string;
  position: Position;
  sourcePosition?: "top" | "bottom" | "left" | "right";
  targetPosition?: "top" | "bottom" | "left" | "right";
  parentId?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type: string;
}

interface RoadmapGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  isMainNode: boolean;
  parentId?: string;
  labelPosition?: string;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

function getHandlesForPosition(labelPosition: string): {
  sourceHandle: string;
  targetHandle: string;
} {
  switch (labelPosition) {
    case "left":
      return { sourceHandle: "left-source", targetHandle: "right-target" };
    case "right":
      return { sourceHandle: "right-source", targetHandle: "left-target" };
    case "top":
      return { sourceHandle: "top-source", targetHandle: "bottom-target" };
    case "bottom":
      return { sourceHandle: "bottom-source", targetHandle: "top-target" };
    default:
      return { sourceHandle: "left-source", targetHandle: "right-target" };
  }
}

async function loadMainNodeContent(
  roadmapId: string,
  nodeId: string,
): Promise<{ layout: LayoutConfig; exists: boolean }> {
  const contentPath = path.join(
    process.cwd(),
    "src/data/roadmaps",
    roadmapId,
    "content",
    `${nodeId}.md`,
  );

  try {
    const fileContents = await fs.readFile(contentPath, "utf-8");
    const { data } = matter(fileContents);
    return { layout: data.layout as LayoutConfig, exists: true };
  } catch {
    return { layout: { position: { x: 0, y: 0 } }, exists: false };
  }
}

async function loadChecklistContent(
  roadmapId: string,
  fileName: string,
): Promise<ChecklistFrontmatter | null> {
  const contentPath = path.join(
    process.cwd(),
    "src/data/roadmaps",
    roadmapId,
    "content",
    fileName,
  );

  try {
    const fileContents = await fs.readFile(contentPath, "utf-8");
    const { data } = matter(fileContents);
    return data as ChecklistFrontmatter;
  } catch {
    return null;
  }
}

async function buildGraph(roadmapId: string): Promise<RoadmapGraph> {
  const contentDir = path.join(
    process.cwd(),
    "src/data/roadmaps",
    roadmapId,
    "content",
  );
  const files = await fs.readdir(contentDir);

  const mainFiles = files.filter(
    (f) => f.endsWith(".md") && !f.endsWith("-checklists.md"),
  );
  const checklistFiles = files.filter((f) => f.endsWith("-checklists.md"));

  const simNodes: SimNode[] = [];
  const simLinks: SimLink[] = [];
  const nodeLayouts = new Map<string, LayoutConfig>();
  const subnodesByParent = new Map<string, SubnodeConfig[]>();
  const allNodeIds = new Set<string>();
  const validationErrors: ValidationError[] = [];

  // Load main nodes with fixed positions
  const nodesToValidate: Array<{ nodeId: string; hasPosition: boolean }> = [];

  for (const file of mainFiles) {
    const nodeId = file.replace(".md", "");
    const { layout, exists } = await loadMainNodeContent(roadmapId, nodeId);

    if (!exists) continue;

    nodesToValidate.push({
      nodeId,
      hasPosition: !!layout.position,
    });

    if (!layout.position) continue;

    nodeLayouts.set(nodeId, layout);
    allNodeIds.add(nodeId);

    // Main nodes are FIXED at their specified positions
    simNodes.push({
      id: nodeId,
      isMainNode: true,
      x: layout.position.x,
      y: layout.position.y,
      fx: layout.position.x, // Fix position
      fy: layout.position.y, // Fix position
    });

    if (layout.connectsTo) {
      for (const targetId of layout.connectsTo) {
        simLinks.push({
          source: nodeId,
          target: targetId,
        });
      }
    }
  }

  validationErrors.push(...validateNodePositions(nodesToValidate));

  // Load checklist nodes
  const checklistRefs: Array<{ fileName: string; parentId: string }> = [];

  for (const file of checklistFiles) {
    const checklist = await loadChecklistContent(roadmapId, file);
    if (!checklist) continue;

    const parentId = checklist.milestoneId;
    checklistRefs.push({ fileName: file, parentId });

    if (!allNodeIds.has(parentId)) continue;

    subnodesByParent.set(parentId, checklist.nodes);
    checklist.nodes.forEach((node) => allNodeIds.add(node.id));
  }

  validationErrors.push(...validateParentReferences(checklistRefs, allNodeIds));

  // Create subnode simulation nodes with circular positioning around parent
  for (const [parentId, subnodes] of subnodesByParent) {
    const parentLayout = nodeLayouts.get(parentId);
    if (!parentLayout) continue;

    // Node dimensions (from component definitions)
    const hubNodeSize = 128; // h-32 w-32 = 128px
    const checklistNodeSize = 64; // h-16 w-16 = 64px

    // Calculate center of hub node (React Flow positions are top-left corner)
    const parentCenterX = parentLayout.position.x + hubNodeSize / 2;
    const parentCenterY = parentLayout.position.y + hubNodeSize / 2;

    const radius = 280; // Distance from parent center to subnode centers
    const totalSubnodes = subnodes.length;
    const angleStep = (2 * Math.PI) / totalSubnodes; // Divide circle evenly
    const startAngle = -Math.PI / 2; // Start at top (12 o'clock position)

    subnodes.forEach((subnode, index) => {
      const angle = startAngle + index * angleStep;

      // Calculate position of subnode center on the circle
      const subnodeCenterX = parentCenterX + radius * Math.cos(angle);
      const subnodeCenterY = parentCenterY + radius * Math.sin(angle);

      // Convert from center position to top-left position for React Flow
      const x = subnodeCenterX - checklistNodeSize / 2;
      const y = subnodeCenterY - checklistNodeSize / 2;

      simNodes.push({
        id: subnode.id,
        isMainNode: false,
        parentId: parentId,
        labelPosition: subnode.labelPosition,
        x: x,
        y: y,
        fx: x, // Fix position to prevent physics from moving it
        fy: y, // Fix position to prevent physics from moving it
      });

      simLinks.push({
        source: parentId,
        target: subnode.id,
      });
    });
  }

  // Validate all connectsTo targets exist
  const connections: Array<{ nodeId: string; targetIds: string[] }> = [];

  for (const [nodeId, layout] of nodeLayouts) {
    if (layout.connectsTo) {
      connections.push({
        nodeId,
        targetIds: layout.connectsTo,
      });
    }
  }

  validationErrors.push(...validateConnectionTargets(connections, allNodeIds));

  logValidationErrors(validationErrors);

  // Run physics simulation
  console.log("Running physics simulation...");

  const simulation = forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance((d) => {
          const source = d.source as SimNode;
          const target = d.target as SimNode;
          if (source.isMainNode !== target.isMainNode) return 200;
          return 800;
        })
        .strength((d) => {
          const source = d.source as SimNode;
          const target = d.target as SimNode;
          if (source.isMainNode && target.isMainNode) return 0.01;
          return 0.4;
        }),
    )
    .force("charge", forceManyBody().strength(-300))
    .force("collide", forceCollide<SimNode>().radius(55).strength(0.7))
    .stop();

  // Skip simulation iterations - all nodes are fixed at their calculated positions
  const iterations = 0;
  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  console.log("Simulation complete!");

  // Convert simulation nodes back to graph nodes
  const nodes: GraphNode[] = simNodes.map((simNode) => ({
    id: simNode.id,
    position: {
      x: Math.round(simNode.x ?? 0),
      y: Math.round(simNode.y ?? 0),
    },
    sourcePosition: "bottom" as const,
    targetPosition: "top" as const,
    parentId: simNode.parentId,
  }));

  // Create edges with proper handles
  const edges: GraphEdge[] = [];

  // Main node edges
  for (const [nodeId, layout] of nodeLayouts) {
    if (layout.connectsTo) {
      for (const targetId of layout.connectsTo) {
        edges.push({
          id: `edge-${nodeId}-to-${targetId}`,
          source: nodeId,
          target: targetId,
          sourceHandle: "top-source",
          targetHandle: "bottom-target",
          type: "default",
        });
      }
    }
  }

  // Subnode edges
  for (const [parentId, subnodes] of subnodesByParent) {
    for (const subnode of subnodes) {
      const handles = getHandlesForPosition(subnode.labelPosition ?? "left");
      edges.push({
        id: `edge-${parentId}-${subnode.id}`,
        source: parentId,
        target: subnode.id,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: "default",
      });
    }
  }

  return { nodes, edges };
}

async function main() {
  const roadmapId = process.argv[2] ?? "electrician-bc";

  console.log(`Building graph for roadmap: ${roadmapId}`);

  const graph = await buildGraph(roadmapId);

  const outputPath = path.join(
    process.cwd(),
    "src/data/roadmaps",
    roadmapId,
    "graph.json",
  );

  await fs.writeFile(outputPath, JSON.stringify(graph, null, 2));

  console.log(`✓ Generated graph.json with:`);
  console.log(`  - ${graph.nodes.length} nodes`);
  console.log(`  - ${graph.edges.length} edges`);
  console.log(`  - Output: ${outputPath}`);
}

main().catch((error) => {
  console.error("Error building graph:", error);
  process.exit(1);
});
