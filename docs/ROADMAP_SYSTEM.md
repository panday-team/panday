# Dynamic Roadmap System

## Overview

The Dynamic Roadmap System is a flexible, content-driven architecture for displaying career progression pathways. It separates content (markdown files), layout (graph structure), and metadata, enabling easy updates and scalability across multiple careers and provinces.

## Architecture

### Design Principles

1. **Separation of Concerns**: Content, layout, and metadata are stored independently
2. **Type Safety**: Full TypeScript support with strict type checking
3. **Scalability**: Easy to add new careers, provinces, or nodes
4. **Testability**: Comprehensive test coverage with Vitest
5. **Performance**: Server-side data loading with Next.js App Router
6. **Future-Ready**: Structured for RAG/AI integration with embeddings

### Directory Structure

```
src/
├── data/
│   ├── roadmaps/
│   │   └── electrician-bc/           # Career-specific roadmap
│   │       ├── metadata.json          # Roadmap metadata
│   │       ├── graph.json             # Node positions & edges
│   │       └── content/               # Markdown content files
│   │           ├── red-seal-certification.md
│   │           ├── level-4-technical-training.md
│   │           ├── level-3-work-based-training.md
│   │           └── ...
│   ├── embeddings/                    # Vector embeddings for RAG
│   │   └── electrician-bc/
│   │       └── *.json
│   └── types/
│       └── roadmap.ts                 # TypeScript type definitions
├── lib/
│   └── roadmap-loader.ts              # Data loading utilities
├── components/
│   ├── roadmap-flow.tsx               # Client component for React Flow
│   ├── node-info-panel.tsx            # Info panel component
│   └── nodes/                         # Custom node components
│       ├── hub-node.tsx
│       ├── terminal-node.tsx
│       ├── portal-node.tsx
│       ├── requirement-node.tsx
│       └── checkpoint-node.tsx
└── app/
    └── page.tsx                       # Server component (entry point)
```

## Data Format

### 1. Metadata (`metadata.json`)

Career-level information about the roadmap.

```json
{
  "id": "electrician-bc",
  "title": "Construction Electrician - Red Seal Certification",
  "province": "British Columbia",
  "industry": "Skilled Trades",
  "description": "Complete pathway from foundation to Red Seal certification",
  "version": "1.0.0",
  "lastUpdated": "2025-10-19"
}
```

### 2. Graph Structure (`graph.json`)

Visual layout and connections for React Flow.

```json
{
  "nodes": [
    {
      "id": "red-seal-certification",
      "position": { "x": 640, "y": -260 },
      "sourcePosition": "bottom",
      "targetPosition": "top"
    }
  ],
  "edges": [
    {
      "id": "edge-level4-to-redseal",
      "source": "level-4-technical-training",
      "target": "red-seal-certification",
      "sourceHandle": "top-source",
      "targetHandle": "top-target",
      "type": "bezier"
    }
  ]
}
```

### 3. Content Files (`content/*.md`)

Markdown files with YAML frontmatter containing node data.

```markdown
---
id: "red-seal-certification"
type: "terminal"
badge: "Start"
title: "Red Seal Certification"
subtitle: "Level 2 Work Based Training • Chat"
nodeType: "terminal"
---

# Red Seal Certification

Description goes here...

## Eligibility

- Complete all levels of technical training
- Document 6,000 work-based hours

## Benefits

- Work anywhere in Canada
- National recognition

## Final Outcome

- Pass the Red Seal exam
- Earn Certificate of Qualification

## Resources

- [Link Text](https://example.com)
```

## Node Types

The system supports five node types, each with distinct visual styling:

| Type | Purpose | Color | Example |
|------|---------|-------|---------|
| `hub` | Main training/education nodes | Yellow (`#FFD84D`) | Level 2 Work Based Training |
| `terminal` | Start/end points | Purple | Red Seal Certification, Direct Entry |
| `requirement` | Prerequisites/conditions | Lime Green | Foundation Requirements |
| `portal` | External systems | Light Blue | SkilledTradesBC Portal |
| `checkpoint` | Milestones/waiting periods | Purple | Waiting Period |

## Data Flow

```
┌─────────────────┐
│   page.tsx      │  (Server Component)
│  Entry Point    │
└────────┬────────┘
         │ 1. Calls buildRoadmap('electrician-bc')
         ▼
┌─────────────────────────────────────────┐
│      roadmap-loader.ts                  │
│  - loadRoadmapMetadata()                │
│  - loadRoadmapGraph()                   │
│  - loadAllNodeContent()                 │
│    ├─ Reads markdown files              │
│    ├─ Parses frontmatter (gray-matter) │
│    └─ Extracts sections (regex)         │
└────────┬────────────────────────────────┘
         │ 2. Returns Roadmap object
         ▼
┌─────────────────┐
│ roadmap-flow.tsx│  (Client Component)
│  - Transforms    │
│    data to       │
│    React Flow    │
│    format        │
│  - Renders flow  │
│  - Renders info  │
│    panel         │
└─────────────────┘
```

## API Reference

### Core Functions

#### `buildRoadmap(roadmapId: string): Promise<Roadmap>`

Loads complete roadmap data (metadata + graph + content).

```typescript
const roadmap = await buildRoadmap("electrician-bc");
// Returns: { metadata, graph, content }
```

#### `loadRoadmapMetadata(roadmapId: string): Promise<RoadmapMetadata>`

Loads metadata.json for a specific roadmap.

#### `loadRoadmapGraph(roadmapId: string): Promise<RoadmapGraph>`

Loads graph.json with node positions and edges.

#### `loadNodeContent(roadmapId: string, nodeId: string): Promise<NodeContent>`

Loads and parses a single markdown file.

#### `loadAllNodeContent(roadmapId: string): Promise<Map<string, NodeContent>>`

Loads all markdown files in the content directory.

#### `getAvailableRoadmaps(): Promise<string[]>`

Returns list of available roadmap IDs.

## Adding New Content

### Adding a New Node

1. **Create markdown file** in `src/data/roadmaps/{roadmap-id}/content/{node-id}.md`:

```markdown
---
id: "my-new-node"
type: "hub"
title: "My New Node"
nodeType: "hub"
glow: true
---

# My New Node

Content here...

## Eligibility
- Requirement 1
- Requirement 2

## Benefits
- Benefit 1

## Final Outcome
- Outcome 1

## Resources
- [Resource](https://example.com)
```

2. **Add to graph.json**:

```json
{
  "nodes": [
    {
      "id": "my-new-node",
      "position": { "x": 400, "y": 300 },
      "sourcePosition": "bottom",
      "targetPosition": "top"
    }
  ],
  "edges": [
    {
      "id": "edge-to-new-node",
      "source": "previous-node",
      "target": "my-new-node",
      "type": "bezier"
    }
  ]
}
```

3. **No code changes needed!** The system automatically loads the new node.

### Adding a New Roadmap (Career/Province)

1. **Create directory structure**:

```bash
mkdir -p src/data/roadmaps/plumber-bc/content
mkdir -p src/data/embeddings/plumber-bc
```

2. **Create `metadata.json`**:

```json
{
  "id": "plumber-bc",
  "title": "Plumber - Red Seal Certification",
  "province": "British Columbia",
  "industry": "Skilled Trades",
  "description": "Plumber certification pathway",
  "version": "1.0.0",
  "lastUpdated": "2025-10-19"
}
```

3. **Create `graph.json`** with your nodes and edges

4. **Add markdown files** to `content/` directory

5. **Update page.tsx** (or create dynamic route):

```typescript
// Option 1: Static route
const roadmap = await buildRoadmap("plumber-bc");

// Option 2: Dynamic route (app/roadmap/[id]/page.tsx)
const roadmap = await buildRoadmap(params.id);
```

## Testing

### Running Tests

```bash
# Run tests once
bun test:run

# Run tests in watch mode
bun test

# Run tests with UI
bun test:ui
```

### Test Coverage

Tests cover:
- ✅ Metadata loading
- ✅ Graph structure validation
- ✅ Content parsing (frontmatter + markdown)
- ✅ Section extraction (eligibility, benefits, outcomes, resources)
- ✅ Error handling for missing files
- ✅ Complete roadmap building
- ✅ Node-content consistency

## Future Enhancements

### 1. RAG/AI Integration

The structure is ready for AI integration:

- **Embeddings**: Store vector embeddings in `src/data/embeddings/{roadmap-id}/`
- **Content chunks**: Markdown sections are already parsed
- **Query system**: Use embeddings to find relevant content based on user questions

Example:
```typescript
// Generate embeddings from markdown content
const content = await loadNodeContent("electrician-bc", "red-seal-certification");
const embedding = await generateEmbedding(content.content);
await saveEmbedding(embedding, "electrician-bc", "red-seal-certification");

// Query for user questions
const userQuestion = "What are the requirements for Red Seal?";
const relevantNodes = await queryEmbeddings(userQuestion, "electrician-bc");
```

### 2. User Progress Tracking

Track completed nodes in the database:

```typescript
interface UserProgress {
  userId: string;
  roadmapId: string;
  completedNodes: string[];
  currentNode?: string;
  startedAt: string;
  lastUpdated: string;
}
```

### 3. Dynamic Roadmap Rendering

Customize the roadmap based on user progress:

```typescript
function getPersonalizedRoadmap(roadmap: Roadmap, userProgress: UserProgress) {
  // Highlight completed nodes
  // Show next recommended steps
  // Filter out irrelevant branches
}
```

### 4. Multi-language Support

Add language to frontmatter:

```markdown
---
id: "red-seal-certification"
lang: "en"
---
```

Create translation files:
```
content/
  └── en/
      └── red-seal-certification.md
  └── fr/
      └── red-seal-certification.md
```

## Development Workflow

1. **Make content changes** in markdown files
2. **Run tests**: `bun test:run`
3. **Run type check**: `bun check`
4. **Format code**: `bun format:write`
5. **Test locally**: `bun dev`
6. **Commit changes** with conventional commit format

## Troubleshooting

### Node not appearing

1. Check that the markdown file exists in `content/` directory
2. Verify the node ID in frontmatter matches the filename
3. Ensure the node is added to `graph.json`
4. Check browser console for errors

### Type errors

1. Run `bun check` to see TypeScript errors
2. Verify frontmatter matches `NodeContentFrontmatter` interface
3. Check that all required fields are present

### Tests failing

1. Ensure all markdown files have valid frontmatter
2. Check that graph.json has valid JSON syntax
3. Verify node IDs are consistent across files
4. Run `bun test:run` for detailed error messages

## Performance Considerations

- **Server-side rendering**: Data is loaded on the server, reducing client bundle size
- **Parallel loading**: `Promise.all()` loads metadata, graph, and content concurrently
- **Memoization**: React Flow components are memoized to prevent unnecessary re-renders
- **Static optimization**: Next.js can pre-render the page at build time

## Security

- No user input is used in file paths (roadmap IDs are hardcoded)
- All data is server-side loaded (no client-side file access)
- Markdown content is sanitized by React (XSS protection)
- Resources links are validated in tests

## Contributing

When adding new features:

1. Update TypeScript types in `src/data/types/roadmap.ts`
2. Add tests in `src/lib/__tests__/`
3. Update this documentation
4. Update `AGENTS.md` with relevant context
5. Run `bun check` before committing

## References

- [React Flow Documentation](https://reactflow.dev/)
- [Gray Matter](https://github.com/jonschlinkert/gray-matter)
- [Vitest Documentation](https://vitest.dev/)
- [Next.js App Router](https://nextjs.org/docs/app)
