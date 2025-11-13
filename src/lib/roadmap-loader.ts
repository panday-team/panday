import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type {
  RoadmapMetadata,
  RoadmapGraph,
  NodeContent,
  NodeContentFrontmatter,
  Roadmap,
} from "@/data/types/roadmap";

/**
 * Base path for roadmap data directory
 */
const ROADMAPS_BASE_PATH = path.join(process.cwd(), "src/data/roadmaps");

function extractMarkdownListItems(content: string): string[] {
  return content
    .split("\n")
    .filter(
      (line) => line.trim().startsWith("-") || line.trim().startsWith("*"),
    )
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line && !line.includes("TODO"));
}

function extractMarkdownSection(
  content: string,
  sectionName: string,
): string | null {
  const regex = new RegExp(
    `##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|\\n---|$)`,
    "i",
  );
  const match = regex.exec(content);
  return match?.[1] ?? null;
}

function parseMarkdownSections(content: string): {
  eligibility?: string[];
  benefits?: string[];
  outcomes?: string[];
  resources?: Array<{ label: string; href: string }>;
} {
  const sections: {
    eligibility?: string[];
    benefits?: string[];
    outcomes?: string[];
    resources?: Array<{ label: string; href: string }>;
  } = {};

  const eligibilityText = extractMarkdownSection(content, "Eligibility");
  if (eligibilityText) {
    sections.eligibility = extractMarkdownListItems(eligibilityText);
  }

  const benefitsText = extractMarkdownSection(content, "Benefits");
  if (benefitsText) {
    sections.benefits = extractMarkdownListItems(benefitsText);
  }

  const outcomesText = extractMarkdownSection(content, "Final Outcome");
  if (outcomesText) {
    sections.outcomes = extractMarkdownListItems(outcomesText);
  }

  const resourcesText = extractMarkdownSection(content, "Resources");
  if (resourcesText) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
    sections.resources = resourcesText
      .split("\n")
      .filter((line) => line.includes("]("))
      .map((line) => {
        const match = linkRegex.exec(line);
        if (match?.[1] && match?.[2]) {
          return { label: match[1], href: match[2] };
        }
        return null;
      })
      .filter((resource): resource is { label: string; href: string } =>
        Boolean(resource),
      );
  }

  return sections;
}

/**
 * Load roadmap metadata from metadata.json
 */
export async function loadRoadmapMetadata(
  roadmapId: string,
): Promise<RoadmapMetadata> {
  const metadataPath = path.join(
    ROADMAPS_BASE_PATH,
    roadmapId,
    "metadata.json",
  );

  try {
    const fileContents = await fs.readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(fileContents) as RoadmapMetadata;
    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to load metadata for roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load roadmap graph structure from graph.json
 */
export async function loadRoadmapGraph(
  roadmapId: string,
): Promise<RoadmapGraph> {
  const graphPath = path.join(ROADMAPS_BASE_PATH, roadmapId, "graph.json");

  try {
    const fileContents = await fs.readFile(graphPath, "utf-8");
    const graph = JSON.parse(fileContents) as RoadmapGraph;
    return graph;
  } catch (error) {
    throw new Error(
      `Failed to load graph for roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load content for a specific node from markdown file
 */
export async function loadNodeContent(
  roadmapId: string,
  nodeId: string,
): Promise<NodeContent> {
  const contentPath = path.join(
    ROADMAPS_BASE_PATH,
    roadmapId,
    "content",
    `${nodeId}.md`,
  );

  try {
    const fileContents = await fs.readFile(contentPath, "utf-8");
    const { data, content } = matter(fileContents);

    const frontmatter = data as NodeContentFrontmatter;
    const sections = parseMarkdownSections(content);

    return {
      frontmatter,
      content,
      ...sections,
    };
  } catch (error) {
    throw new Error(
      `Failed to load content for node "${nodeId}" in roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load checklist nodes from a multi-node checklist file
 */
async function loadChecklistNodes(
  roadmapId: string,
  fileName: string,
): Promise<Map<string, NodeContent>> {
  const contentPath = path.join(
    ROADMAPS_BASE_PATH,
    roadmapId,
    "content",
    fileName,
  );
  const contentMap = new Map<string, NodeContent>();

  try {
    const fileContents = await fs.readFile(contentPath, "utf-8");
    const parsed = matter(fileContents);

    // Handle new nested categories format
    interface CategoryData {
      id: string;
      type: string;
      title: string;
      description?: string;
      icon: string;
      nodes: Array<{
        id: string;
        type: string;
        title: string;
        nodeType: string;
        labelPosition?: string;
      }>;
    }

    let nodes: Array<{
      id: string;
      type: string;
      title: string;
      nodeType: string;
      labelPosition?: string;
    }> = [];

    let categories: CategoryData[] = [];

    // Check for new nested categories format
    if (parsed.data.categories) {
      categories = parsed.data.categories as CategoryData[];
      // Flatten all nodes from all categories
      nodes = categories.flatMap((category) => category.nodes);
    }
    // Fall back to old flat nodes format for backward compatibility
    else if (parsed.data.nodes) {
      nodes = parsed.data.nodes as Array<{
        id: string;
        type: string;
        title: string;
        nodeType: string;
        labelPosition?: string;
      }>;
    }

    // Split content by markdown separators (---)
    const contentSections = parsed.content
      .split(/\n---\n/)
      .map((section) => section.trim())
      .filter((section) => section.length > 0);

    // Match each node with its content section
    nodes.forEach((node, index) => {
      const nodeContent = contentSections[index] ?? "";
      contentMap.set(node.id, {
        frontmatter: {
          id: node.id,
          type: node.type as NodeContentFrontmatter["type"],
          title: node.title,
          nodeType: node.nodeType as NodeContentFrontmatter["nodeType"],
          ...(node.labelPosition && {
            labelPosition:
              node.labelPosition as NodeContentFrontmatter["labelPosition"],
          }),
        },
        content: nodeContent,
      });
    });

    // Add category nodes to content map with their descriptions
    categories.forEach((category) => {
      contentMap.set(category.id, {
        frontmatter: {
          id: category.id,
          type: "category" as const,
          title: category.title,
          nodeType: "category" as const,
        },
        content: category.description ?? "",
      });
    });

    return contentMap;
  } catch (error) {
    throw new Error(
      `Failed to load checklist nodes from "${fileName}" in roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load all node content from the content directory
 */
export async function loadAllNodeContent(
  roadmapId: string,
): Promise<Map<string, NodeContent>> {
  const contentDir = path.join(ROADMAPS_BASE_PATH, roadmapId, "content");
  const contentMap = new Map<string, NodeContent>();

  try {
    const files = await fs.readdir(contentDir);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));

    for (const file of markdownFiles) {
      // Check if this is a checklist file
      if (file.endsWith("-checklists.md")) {
        // Load multiple nodes from checklist file
        const checklistNodes = await loadChecklistNodes(roadmapId, file);
        checklistNodes.forEach((content, nodeId) => {
          contentMap.set(nodeId, content);
        });
      } else {
        // Load single node from regular file
        const nodeId = file.replace(".md", "");
        const content = await loadNodeContent(roadmapId, nodeId);
        contentMap.set(nodeId, content);
      }
    }

    return contentMap;
  } catch (error) {
    throw new Error(
      `Failed to load node content for roadmap "${roadmapId}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Build complete roadmap with metadata, graph, and content
 */
export async function buildRoadmap(roadmapId: string): Promise<Roadmap> {
  const [metadata, graph, content] = await Promise.all([
    loadRoadmapMetadata(roadmapId),
    loadRoadmapGraph(roadmapId),
    loadAllNodeContent(roadmapId),
  ]);

  return {
    metadata,
    graph,
    content,
  };
}

/**
 * Get list of available roadmap IDs
 */
export async function getAvailableRoadmaps(): Promise<string[]> {
  try {
    const entries = await fs.readdir(ROADMAPS_BASE_PATH, {
      withFileTypes: true,
    });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    throw new Error(
      `Failed to load available roadmaps: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
