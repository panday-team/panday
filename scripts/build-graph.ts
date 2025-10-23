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
  const errors: string[] = [];

  // Load main nodes with fixed positions
  for (const file of mainFiles) {
    const nodeId = file.replace(".md", "");
    const { layout, exists } = await loadMainNodeContent(roadmapId, nodeId);

    if (!exists) continue;

    if (!layout.position) {
      errors.push(`❌ Node "${nodeId}" missing layout.position`);
      continue;
    }

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

  // Load checklist nodes
  for (const file of checklistFiles) {
    const checklist = await loadChecklistContent(roadmapId, file);
    if (!checklist) continue;

    const parentId = checklist.milestoneId;

    if (!allNodeIds.has(parentId)) {
      errors.push(
        `❌ Checklist file "${file}" references non-existent parent "${parentId}"`,
      );
      continue;
    }

    subnodesByParent.set(parentId, checklist.nodes);
    checklist.nodes.forEach((node) => allNodeIds.add(node.id));
  }

  // Create subnode simulation nodes with initial positions near parent
  for (const [parentId, subnodes] of subnodesByParent) {
    const parentLayout = nodeLayouts.get(parentId);
    if (!parentLayout) continue;

    const groupedByPosition = new Map<string, SubnodeConfig[]>();
    for (const subnode of subnodes) {
      const position = subnode.labelPosition ?? "left";
      if (!groupedByPosition.has(position)) {
        groupedByPosition.set(position, []);
      }
      groupedByPosition.get(position)!.push(subnode);
    }

    for (const [labelPosition, positionSubnodes] of groupedByPosition) {
      positionSubnodes.forEach((subnode, index) => {
        let initialX = parentLayout.position.x;
        let initialY = parentLayout.position.y;

        const offset = 250;
        const spacing = 80;
        const centerOffset = (positionSubnodes.length - 1) / 2;

        switch (labelPosition) {
          case "left":
            initialX -= offset;
            initialY -= (index - centerOffset) * spacing;
            break;
          case "right":
            initialX += offset;
            initialY -= (index - centerOffset) * spacing;
            break;
          case "top":
            initialX += (index - centerOffset) * spacing;
            initialY -= offset;
            break;
          case "bottom":
            initialX += (index - centerOffset) * spacing;
            initialY += offset;
            break;
        }

        simNodes.push({
          id: subnode.id,
          isMainNode: false,
          parentId: parentId,
          labelPosition: labelPosition,
          x: initialX,
          y: initialY,
        });

        simLinks.push({
          source: parentId,
          target: subnode.id,
        });
      });
    }
  }

  // Validate all connectsTo targets exist
  for (const [nodeId, layout] of nodeLayouts) {
    if (layout.connectsTo) {
      for (const targetId of layout.connectsTo) {
        if (!allNodeIds.has(targetId)) {
          errors.push(
            `❌ Node "${nodeId}" connects to non-existent node "${targetId}"`,
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error("\n⚠️  Validation errors found:");
    errors.forEach((error) => console.error(`  ${error}`));
    console.error("");
  }

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

  // Run simulation for fixed iterations
  const iterations = 300;
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
