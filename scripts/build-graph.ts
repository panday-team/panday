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

interface CategoryConfig {
  id: string;
  type: "category";
  title: string;
  icon: "brain" | "clipboard-list" | "traffic-cone";
  nodes: SubnodeConfig[];
}

interface ChecklistFrontmatter {
  milestoneId: string;
  nodes?: SubnodeConfig[]; // Legacy format (flat)
  categories?: CategoryConfig[]; // New format (nested)
}

interface GraphNode {
  id: string;
  position: Position;
  sourcePosition?: "top" | "bottom" | "left" | "right";
  targetPosition?: "top" | "bottom" | "left" | "right";
  parentId?: string;
  categoryId?: string;
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
  isCategoryNode?: boolean;
  parentId?: string;
  categoryId?: string;
  labelPosition?: string;
  icon?: string;
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

  // Load checklist nodes (with backward compatibility for flat structure)
  const checklistRefs: Array<{ fileName: string; parentId: string }> = [];
  const categoriesByParent = new Map<string, CategoryConfig[]>();

  for (const file of checklistFiles) {
    const checklist = await loadChecklistContent(roadmapId, file);
    if (!checklist) continue;

    const parentId = checklist.milestoneId;
    checklistRefs.push({ fileName: file, parentId });

    if (!allNodeIds.has(parentId)) continue;

    // Handle new nested categories format
    if (checklist.categories && checklist.categories.length > 0) {
      categoriesByParent.set(parentId, checklist.categories);
      // Add category IDs to allNodeIds
      checklist.categories.forEach((category) => {
        allNodeIds.add(category.id);
        // Add checklist node IDs
        category.nodes.forEach((node) => allNodeIds.add(node.id));
      });
    }
    // Fall back to legacy flat structure
    else if (checklist.nodes && checklist.nodes.length > 0) {
      subnodesByParent.set(parentId, checklist.nodes);
      checklist.nodes.forEach((node) => allNodeIds.add(node.id));
    }
  }

  validationErrors.push(...validateParentReferences(checklistRefs, allNodeIds));

  // Node dimensions (from component definitions)
  const hubNodeSize = 128; // h-32 w-32 = 128px
  const categoryNodeSize = 96; // h-24 w-24 = 96px
  const checklistNodeSize = 64; // h-16 w-16 = 64px

  // Create category and checklist nodes with 3-level hierarchy
  for (const [parentId, categories] of categoriesByParent) {
    const parentLayout = nodeLayouts.get(parentId);
    if (!parentLayout) continue;

    // Calculate center of hub node (React Flow positions are top-left corner)
    const parentCenterX = parentLayout.position.x + hubNodeSize / 2;
    const parentCenterY = parentLayout.position.y + hubNodeSize / 2;

    // Position categories in inner ring around hub
    const categoryRadius = 200; // Distance from hub center to category centers

    // Fixed angles for each category type (in degrees, converted to radians)
    const categoryAngles: Record<string, number> = {
      resources: (210 * Math.PI) / 180, // Bottom-left
      actions: (330 * Math.PI) / 180, // Bottom-right
    };

    categories.forEach((category) => {
      // Determine angle based on category title/id
      const categoryKey = category.title.toLowerCase().includes("resource")
        ? "resources"
        : category.title.toLowerCase().includes("action") ||
            category.title.toLowerCase().includes("checklist")
          ? "actions"
          : "roadblocks";

      let categoryX: number;
      let categoryY: number;

      if (categoryKey === "roadblocks") {
        // Position roadblocks on the path to the next hub node
        const nextHubId = parentLayout.connectsTo?.[0];
        if (nextHubId) {
          const nextHubLayout = nodeLayouts.get(nextHubId);
          if (nextHubLayout) {
            // Calculate position halfway between current and next hub
            const nextHubCenterX = nextHubLayout.position.x + hubNodeSize / 2;
            const nextHubCenterY = nextHubLayout.position.y + hubNodeSize / 2;

            // Position at 40% of the way from parent to next hub (closer to parent)
            const t = 0.4;
            const categoryCenterX = parentCenterX + (nextHubCenterX - parentCenterX) * t;
            const categoryCenterY = parentCenterY + (nextHubCenterY - parentCenterY) * t;

            categoryX = categoryCenterX - categoryNodeSize / 2;
            categoryY = categoryCenterY - categoryNodeSize / 2;
          } else {
            // Fallback: position above the hub if no next hub found
            categoryX = parentCenterX - categoryNodeSize / 2;
            categoryY = parentCenterY - 200 - categoryNodeSize / 2;
          }
        } else {
          // No next hub (terminal node), position above
          categoryX = parentCenterX - categoryNodeSize / 2;
          categoryY = parentCenterY - 200 - categoryNodeSize / 2;
        }
      } else {
        // Resources and Actions: circular positioning
        const angle = categoryAngles[categoryKey] ?? 0;
        const categoryCenterX = parentCenterX + categoryRadius * Math.cos(angle);
        const categoryCenterY = parentCenterY + categoryRadius * Math.sin(angle);
        categoryX = categoryCenterX - categoryNodeSize / 2;
        categoryY = categoryCenterY - categoryNodeSize / 2;
      }

      simNodes.push({
        id: category.id,
        isMainNode: false,
        isCategoryNode: true,
        parentId: parentId,
        icon: category.icon,
        x: categoryX,
        y: categoryY,
        fx: categoryX, // Fix position
        fy: categoryY, // Fix position
      });

      simLinks.push({
        source: parentId,
        target: category.id,
      });

      // Position checklist nodes in outer ring around each category
      const checklistRadius = 150; // Distance from category center to checklist centers
      const totalChecklists = category.nodes.length;
      const angleStep = (2 * Math.PI) / totalChecklists; // Divide circle evenly
      const startAngle = -Math.PI / 2; // Start at top (12 o'clock position)

      // Calculate category center from top-left position
      const categoryCenterX = categoryX + categoryNodeSize / 2;
      const categoryCenterY = categoryY + categoryNodeSize / 2;

      category.nodes.forEach((checklistNode, index) => {
        const checklistAngle = startAngle + index * angleStep;

        // Calculate position of checklist center on the circle
        const checklistCenterX =
          categoryCenterX + checklistRadius * Math.cos(checklistAngle);
        const checklistCenterY =
          categoryCenterY + checklistRadius * Math.sin(checklistAngle);

        // Convert from center position to top-left position for React Flow
        const checklistX = checklistCenterX - checklistNodeSize / 2;
        const checklistY = checklistCenterY - checklistNodeSize / 2;

        simNodes.push({
          id: checklistNode.id,
          isMainNode: false,
          isCategoryNode: false,
          parentId: category.id, // Parent is the category
          categoryId: category.id, // Track which category this belongs to
          labelPosition: checklistNode.labelPosition,
          x: checklistX,
          y: checklistY,
          fx: checklistX, // Fix position
          fy: checklistY, // Fix position
        });

        simLinks.push({
          source: category.id,
          target: checklistNode.id,
        });
      });
    });
  }

  // Handle legacy flat structure (backward compatibility)
  for (const [parentId, subnodes] of subnodesByParent) {
    const parentLayout = nodeLayouts.get(parentId);
    if (!parentLayout) continue;

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
    categoryId: simNode.categoryId,
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

  // Category and checklist edges (3-level hierarchy)
  for (const [parentId, categories] of categoriesByParent) {
    for (const category of categories) {
      // Hub → Category edges
      edges.push({
        id: `edge-${parentId}-${category.id}`,
        source: parentId,
        target: category.id,
        sourceHandle: "bottom-source",
        targetHandle: "top-target",
        type: "default",
      });

      // Category → Checklist edges
      for (const checklistNode of category.nodes) {
        const handles = getHandlesForPosition(
          checklistNode.labelPosition ?? "left",
        );
        edges.push({
          id: `edge-${category.id}-${checklistNode.id}`,
          source: category.id,
          target: checklistNode.id,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: "default",
        });
      }
    }
  }

  // Subnode edges (legacy flat structure)
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
