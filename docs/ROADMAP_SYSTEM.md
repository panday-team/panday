# Dynamic Roadmap System

## Overview

The Dynamic Roadmap System is a flexible, content-driven architecture for displaying career progression pathways. It focuses on **core milestone nodes** with integrated **checklists** for requirements, tasks, and resources. The system separates content (markdown files), layout (graph structure), and metadata, enabling easy updates and scalability across multiple careers and provinces.

## Key Features

- **Milestone-Based**: Focus on core progression stages (Foundation → Level 1 → Level 2 → Level 3 → Level 4 → Red Seal)
- **Checklist System**: Each milestone includes actionable checklists for requirements, training tasks, work hours, and resources
- **Clean Visual Flow**: Simplified graph structure matching certification pathway
- **Interactive UI**: Click nodes to view detailed checklists in elegant side panel
- **Type-Safe**: Full TypeScript support with strict type checking
- **Extensible**: Easy to add new roadmaps, nodes, or checklist sections

## Architecture

### Design Principles

1. **Milestone Focus**: Content organized around core progression stages, not granular sub-steps
2. **Actionable Checklists**: Each milestone has categorized checklist items users can track
3. **Separation of Concerns**: Content, layout, and metadata are stored independently
4. **Type Safety**: Full TypeScript support with strict type checking
5. **Scalability**: Easy to add new careers, provinces, or nodes
6. **Performance**: Server-side data loading with Next.js App Router
7. **Future-Ready**: Structured for RAG/AI integration and progress tracking

### Directory Structure

```
src/
├── data/
│   ├── roadmaps/
│   │   └── electrician-bc/              # Career-specific roadmap
│   │       ├── metadata.json             # Roadmap metadata
│   │       ├── graph.json                # Node positions & edges
│   │       └── content/                  # Markdown milestone files
│   │           ├── foundation-program.md
│   │           ├── direct-entry.md
│   │           ├── level-1.md
│   │           ├── level-2.md
│   │           ├── level-3.md
│   │           ├── level-4-construction.md
│   │           ├── level-4-industrial.md
│   │           └── red-seal-certification.md
│   ├── embeddings/                       # Vector embeddings for RAG
│   │   └── electrician-bc/
│   │       └── *.json
│   └── types/
│       └── roadmap.ts                    # TypeScript type definitions
├── lib/
│   └── roadmap-loader.ts                 # Data loading utilities
├── components/
│   ├── roadmap-flow.tsx                  # Client component for React Flow
│   ├── node-info-panel.tsx               # Info panel with checklist support
│   ├── roadmap-checklist.tsx             # Checklist component
│   └── nodes/                            # Custom node components
│       ├── hub-node.tsx
│       ├── terminal-node.tsx
│       ├── portal-node.tsx
│       ├── requirement-node.tsx
│       └── checkpoint-node.tsx
└── app/
    └── page.tsx                          # Server component (entry point)
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
  "lastUpdated": "2025-10-22"
}
```

### 2. Graph Structure (`graph.json`)

Visual layout and connections for React Flow. The electrician roadmap follows this structure:

```
Foundation ──┐
             ├──> Level 1 ──> Level 2 ──> Level 3 ──┬──> Level 4 Construction ──┐
Direct Entry ┘                                       │                           ├──> Red Seal
                                                     └──> Level 4 Industrial ─────┘
```

```json
{
  "nodes": [
    {
      "id": "red-seal-certification",
      "position": { "x": 550, "y": 0 },
      "sourcePosition": "bottom",
      "targetPosition": "top"
    },
    {
      "id": "level-4-construction",
      "position": { "x": 350, "y": 200 },
      "sourcePosition": "bottom",
      "targetPosition": "top"
    }
  ],
  "edges": [
    {
      "id": "edge-level4construction-to-redseal",
      "source": "level-4-construction",
      "target": "red-seal-certification",
      "sourceHandle": "top-source",
      "targetHandle": "bottom-target",
      "type": "bezier"
    }
  ]
}
```

### 3. Content Files with Checklists (`content/*.md`)

Markdown files with YAML frontmatter containing milestone data and checklists.

#### Frontmatter Schema

```yaml
---
id: "level-2"                              # Unique identifier
type: "hub"                                 # Node type (hub, terminal, requirement, portal, checkpoint)
title: "Electrician Common Core Level 2"   # Display title
subtitle: "10 weeks"                        # Duration or subtitle
nodeType: "hub"                             # Must match type
glow: true                                  # Optional glow effect
duration: "10 weeks"                        # Duration string
checklists:                                 # Array of checklist sections
  - title: "Requirements"                   # Section title
    items:
      - id: "req-1"                         # Unique item ID
        label: "Level 1 completed"          # Item label
        type: "requirement"                 # Item type (requirement, resource, task, milestone)
        required: true                      # Is this required?
      - id: "req-2"
        label: "1,500 hours logged"
        type: "requirement"
        required: true
  - title: "Technical Training"
    items:
      - id: "tech-1"
        label: "Advanced electrical theory"
        type: "task"
      - id: "tech-2"
        label: "Three-phase systems"
        type: "task"
  - title: "Resources"
    items:
      - id: "res-1"
        label: "Program Outline"
        type: "resource"
        link: "https://skilledtradesbc.ca/..."
---

# Milestone Content

Your markdown content here...
```

#### Checklist Item Types

| Type | Purpose | Color | Example |
|------|---------|-------|---------|
| `requirement` | Prerequisites or conditions | Lime Green | "Level 1 exam passed" |
| `task` | Action items or training topics | Yellow | "Complete safety training" |
| `milestone` | Major achievements | Purple | "Pass Level 2 exam" |
| `resource` | Links to external resources | Cyan | "Program guide PDF" |

#### Complete Example: Level 2 Milestone

```markdown
---
id: "level-2"
type: "hub"
title: "Electrician Common Core Level 2"
subtitle: "10 weeks"
nodeType: "hub"
glow: true
duration: "10 weeks"
checklists:
  - title: "Requirements"
    items:
      - id: "req-1"
        label: "Level 1 technical training completed"
        type: "requirement"
        required: true
      - id: "req-2"
        label: "Level 1 exam passed"
        type: "requirement"
        required: true
      - id: "req-3"
        label: "1,500 work-based hours completed"
        type: "requirement"
        required: true
  - title: "Technical Training (10 weeks)"
    items:
      - id: "tech-1"
        label: "Advanced electrical theory"
        type: "task"
      - id: "tech-2"
        label: "Three-phase systems"
        type: "task"
      - id: "tech-3"
        label: "Motor controls basics"
        type: "task"
  - title: "Work-Based Training"
    items:
      - id: "work-1"
        label: "Complete 1,500 additional hours (3,000 total)"
        type: "milestone"
        required: true
      - id: "work-2"
        label: "Pass Level 2 certification exam"
        type: "milestone"
        required: true
  - title: "Resources"
    items:
      - id: "res-1"
        label: "Level 2 Program Outline"
        type: "resource"
        link: "https://skilledtradesbc.ca/..."
---

# Electrician Common Core Level 2

Level 2 builds on your foundational knowledge with advanced electrical systems...

## Technical Training

Learn advanced electrical theory including three-phase systems...

## Work-Based Training

Apply your intermediate skills in increasingly complex installations...

## Outcome

Complete Level 2 with mastery of intermediate electrical concepts...
```

## Node Types

The system supports five node types, each with distinct visual styling:

| Type | Purpose | Color | Example |
|------|---------|-------|------------|
| `hub` | Main training/education milestones | Yellow (`#FFD84D`) | Level 2, Level 3 |
| `terminal` | Start/end points | Purple | Red Seal, Direct Entry |
| `requirement` | Prerequisites/conditions | Lime Green | Foundation Requirements |
| `portal` | External systems | Light Blue | SkilledTradesBC Portal |
| `checkpoint` | Milestones/waiting periods | Purple | Waiting Period |

## Checklist System

### Features

- **Organized Sections**: Group related items (Requirements, Tasks, Resources)
- **Visual Indicators**: Color-coded badges for item types
- **Interactive**: Check off completed items
- **Required Items**: Visual indicator (*) for mandatory items
- **External Links**: Direct links to resources
- **Collapsible** (optional): Sections can be collapsible

### Component Usage

```tsx
import { RoadmapChecklist } from "@/components/roadmap-checklist";

<RoadmapChecklist
  sections={checklists}
  onItemToggle={(sectionIndex, itemId, checked) => {
    // Handle item toggle for progress tracking
  }}
/>
```

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
│    │  └─ Extracts checklists array      │
│    └─ Extracts markdown content         │
└────────┬────────────────────────────────┘
         │ 2. Returns Roadmap object
         ▼
┌─────────────────┐
│ roadmap-flow.tsx│  (Client Component)
│  - Transforms    │
│    data to       │
│    React Flow    │
│  - On node click │
│  - Shows panel   │
│    with          │
│    checklists    │
└─────────────────┘
```

## Adding New Content

### Adding a New Milestone Node

1. **Create markdown file** in `src/data/roadmaps/{roadmap-id}/content/{node-id}.md`

2. **Add frontmatter with checklists**:

```markdown
---
id: "level-5"
type: "hub"
title: "Level 5 Advanced Training"
subtitle: "12 weeks"
nodeType: "hub"
duration: "12 weeks"
checklists:
  - title: "Requirements"
    items:
      - id: "req-1"
        label: "Level 4 completed"
        type: "requirement"
        required: true
  - title: "Training Topics"
    items:
      - id: "topic-1"
        label: "Advanced topic 1"
        type: "task"
---

# Level 5 Content...
```

3. **Add to graph.json**:

```json
{
  "nodes": [
    {
      "id": "level-5",
      "position": { "x": 550, "y": -200 },
      "sourcePosition": "bottom",
      "targetPosition": "top"
    }
  ],
  "edges": [
    {
      "id": "edge-level4-to-level5",
      "source": "level-4",
      "target": "level-5",
      "type": "bezier"
    }
  ]
}
```

4. **No code changes needed!** The system automatically loads and displays the new milestone with its checklists.

### Adding a New Roadmap (Career/Province)

1. **Create directory structure**:

```bash
mkdir -p src/data/roadmaps/plumber-bc/content
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
  "lastUpdated": "2025-10-22"
}
```

3. **Create `graph.json`** with milestone nodes and edges

4. **Add milestone markdown files** to `content/` directory with checklist frontmatter

5. **Update page.tsx**:

```typescript
const roadmap = await buildRoadmap("plumber-bc");
```

## TypeScript Types

### Core Interfaces

```typescript
// Checklist item
export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed?: boolean;
  required?: boolean;
  type?: "requirement" | "resource" | "task" | "milestone";
  link?: string;
}

// Checklist section
export interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
  collapsible?: boolean;
}

// Node frontmatter
export interface NodeContentFrontmatter {
  id: string;
  type: NodeType;
  badge?: string;
  title: string;
  subtitle?: string;
  nodeType: NodeType;
  glow?: boolean;
  duration?: string;
  checklists?: ChecklistSection[];
}
```

## Best Practices

### Milestone Design

1. **Focus on Core Stages**: Only create nodes for major progression milestones
2. **Use Checklists for Details**: Sub-tasks, requirements, and resources go in checklists
3. **Clear Progression**: Linear flow with optional branches (e.g., Construction vs Industrial)
4. **Consistent Duration**: Show time commitment in subtitle (e.g., "10 weeks")

### Checklist Organization

1. **Logical Sections**: Group related items (Requirements, Training, Work Hours, Resources)
2. **Item Types**: Use appropriate types for visual distinction
3. **Required Items**: Mark mandatory items with `required: true`
4. **Actionable Labels**: Use clear, concise labels (e.g., "Pass Level 2 exam")
5. **External Links**: Add links to resources for easy access

### Content Writing

1. **Concise Titles**: Keep milestone titles short and descriptive
2. **Clear Subtitles**: Show duration or key info in subtitle
3. **Brief Content**: Markdown content provides context, not exhaustive details
4. **Avoid Duplication**: Don't repeat checklist items in markdown content

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
- ✅ Checklist data structure validation
- ✅ Error handling for missing files
- ✅ Complete roadmap building
- ✅ Node-content consistency

## Roadmap for Future Features

### 1. User Progress Tracking

Track completed checklist items in the database:

```typescript
interface UserProgress {
  userId: string;
  roadmapId: string;
  nodeProgress: Map<string, {
    completedItems: string[];  // Array of checklist item IDs
    lastUpdated: string;
  }>;
}
```

### 2. RAG/AI Integration

- **Embeddings**: Generate embeddings from checklist items and content
- **Smart Search**: Find relevant milestones based on user questions
- **Personalized Recommendations**: Suggest next steps based on progress

### 3. Collaborative Features

- Share progress with mentors/employers
- Track cohort progress
- Achievement badges for milestone completion

### 4. Multi-language Support

Add language variants:

```
content/
  └── en/
      └── level-2.md
  └── fr/
      └── level-2.md
```

## Troubleshooting

### Node not appearing

1. Check markdown file exists in `content/` directory
2. Verify `id` in frontmatter matches filename
3. Ensure node is added to `graph.json`
4. Check browser console for errors

### Checklists not displaying

1. Verify `checklists` array in frontmatter
2. Check YAML syntax (proper indentation)
3. Ensure each item has required fields (`id`, `label`)
4. Run `bun check` for type errors

### Type errors

1. Run `bun check` to see detailed errors
2. Verify frontmatter matches `NodeContentFrontmatter` interface
3. Check checklist items match `ChecklistItem` interface
4. Ensure all required fields are present

## Performance Considerations

- **Server-side rendering**: Data loaded on server, reducing client bundle
- **Parallel loading**: `Promise.all()` loads metadata, graph, and content concurrently
- **Memoization**: React Flow components memoized to prevent re-renders
- **Static optimization**: Next.js can pre-render at build time
- **Lazy checklist rendering**: Only selected node's checklists are rendered

## Security

- Roadmap IDs are hardcoded (no user input in file paths)
- All data is server-side loaded
- Markdown content sanitized by React (XSS protection)
- Resource links validated in checklist items

## Contributing

When adding new features:

1. Update TypeScript types in `src/data/types/roadmap.ts`
2. Add tests in `src/lib/__tests__/`
3. Update this documentation
4. Update `CLAUDE.md` with relevant context
5. Run `bun check` before committing

## References

- [React Flow Documentation](https://reactflow.dev/)
- [Gray Matter](https://github.com/jonschlinkert/gray-matter) (YAML frontmatter parser)
- [shadcn/ui](https://ui.shadcn.com/) (UI components)
- [Vitest Documentation](https://vitest.dev/)
- [Next.js App Router](https://nextjs.org/docs/app)
