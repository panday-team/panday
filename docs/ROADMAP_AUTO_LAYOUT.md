# Roadmap Auto-Layout System

## Overview

The auto-layout system generates `graph.json` automatically from markdown frontmatter using **force-directed graph physics simulation**. This ensures nodes never overlap and creates natural, Obsidian-style layouts.

## Benefits

- ✅ **Physics-based layout** - D3-force simulation prevents node overlap
- ✅ **Natural appearance** - Force-directed graph creates organic, balanced layouts
- ✅ **Collision detection** - Built-in collision forces ensure proper spacing
- ✅ **Smooth animations** - Framer Motion integration for beautiful transitions
- ✅ **Single source of truth** - Main node positions defined in markdown files
- ✅ **Auto-generated edges** - Connections created from `connectsTo` declarations
- ✅ **Validation** - Detects missing nodes, broken connections, and orphaned checklists
- ✅ **Type-safe** - Full TypeScript support with validation

## How It Works

### Physics Simulation

The builder uses D3-force to simulate physical forces:

1. **Link Force** - Pulls connected nodes together
   - Main-to-main nodes: Long distance (800px), weak strength (0.1)
   - Parent-to-subnode: Short distance (250px), strong strength (0.5)

2. **Charge Force** - Repels all nodes from each other (-500 strength)

3. **Collision Force** - Prevents overlap with 80px radius + 1.0 strength

4. **Center Force** - Weak centering (0.01) to keep graph from drifting

5. **Fixed Positions** - Main nodes stay at their defined positions

The simulation runs for 300 iterations to find stable positions.

### 1. Main Node Files

Define node position and connections in markdown frontmatter:

```yaml
---
id: "level-2"
type: "hub"
title: "Electrician Common Core Level 2"
subtitle: "10 weeks"
nodeType: "hub"
glow: true
layout:
  position: { x: 0, y: -2000 }
  connectsTo: ["level-3"]
  subnodeLayout:
    spacing: 120 # Optional: vertical spacing between subnodes (default: 120)
    offsetX: 450 # Optional: horizontal offset from parent (default: 450)
    offsetY: 200 # Optional: vertical offset from parent (default: 200)
---
```

### 2. Checklist Files

Checklist files define subnodes with initial positioning preference:

```yaml
---
milestoneId: "level-2"
nodes:
  - id: "level-2-req-level1"
    type: "checklist"
    title: "Level 1 Completed"
    nodeType: "checklist"
    labelPosition: "left" # Preferred side (left, right, top, bottom)
---
```

**Note**: The physics simulation may adjust final positions to prevent overlap, but will respect the general direction specified by `labelPosition`.
nodeType: "checklist"
labelPosition: "left"

- id: "level-2-training-theory"
  type: "checklist"
  title: "Advanced Electrical Theory"
  nodeType: "checklist"
  labelPosition: "right"

---

````

### 3. Build Process

Run the builder script to generate `graph.json`:

```bash
bun run roadmap:build electrician-bc
````

This:

1. Reads all markdown files in `content/` directory
2. Extracts layout configuration from main node frontmatter
3. Calculates subnode positions based on parent position + labelPosition
4. Generates edges from `connectsTo` declarations and parent-subnode relationships
5. Validates all connections and references
6. Outputs `graph.json` with all nodes and edges

## Subnode Positioning

Subnodes are automatically positioned based on their `labelPosition`:

- **`left`**: `x = parent.x - offsetX`, positioned vertically starting at `parent.y - offsetY`
- **`right`**: `x = parent.x + offsetX`, positioned vertically starting at `parent.y - offsetY`
- **`top`**: `y = parent.y - offsetX`, positioned horizontally starting at `parent.x - offsetY`
- **`bottom`**: `y = parent.y + offsetX - 100`, positioned horizontally starting at `parent.x - offsetY`

Multiple subnodes in the same position are spaced vertically/horizontally by `spacing` (default: 120px).

## Layout Schema

```typescript
interface LayoutConfig {
  position: { x: number; y: number }; // Required: absolute position
  connectsTo?: string[]; // Optional: array of target node IDs
  subnodeLayout?: {
    // Optional: customize subnode positioning
    spacing?: number; // Spacing between subnodes (default: 120)
    offsetX?: number; // Horizontal offset (default: 450)
    offsetY?: number; // Vertical offset (default: 200)
  };
}
```

## Validation

The builder validates:

- ✅ All nodes have `layout.position` defined
- ✅ All `connectsTo` targets exist
- ✅ All checklist `milestoneId` values reference existing parent nodes
- ✅ No orphaned subnodes

Validation errors are displayed during build:

```
⚠️  Validation errors found:
  ❌ Node "level-2" connects to non-existent node "level-99"
  ❌ Checklist file "orphan-checklists.md" references non-existent parent "orphan-node"
```

## Workflow

### Adding a New Main Node

1. Create markdown file: `content/new-node.md`
2. Add layout configuration to frontmatter:
   ```yaml
   layout:
     position: { x: 0, y: -3000 }
     connectsTo: ["target-node"]
   ```
3. Run `bun run roadmap:build electrician-bc`

### Adding Subnodes

1. Create or edit checklist file: `content/parent-node-checklists.md`
2. Add nodes with `labelPosition: "left"|"right"|"top"|"bottom"`
3. Run `bun run roadmap:build electrician-bc`

### Moving a Node

1. Update `layout.position` in markdown frontmatter
2. Run `bun run roadmap:build electrician-bc`
3. All subnodes automatically reposition

### Customizing Subnode Layout

Override defaults per parent node:

```yaml
layout:
  position: { x: 0, y: -2000 }
  connectsTo: ["level-3"]
  subnodeLayout:
    spacing: 150 # More space between subnodes
    offsetX: 500 # Further from parent horizontally
    offsetY: 250 # Further from parent vertically
```

## Files

- **`scripts/build-graph.ts`** - Builder script
- **`src/data/roadmaps/{roadmap-id}/content/*.md`** - Main node files with layout config
- **`src/data/roadmaps/{roadmap-id}/content/*-checklists.md`** - Checklist files
- **`src/data/roadmaps/{roadmap-id}/graph.json`** - Generated output (do not edit manually)

## Migration Notes

The original 996-line `graph.json` has been replaced with:

- 9 layout configurations in markdown frontmatter (9 lines each = 81 lines total)
- 9 checklist files (already existed)
- 1 builder script (250 lines, reusable for all roadmaps)

**Total reduction**: 996 lines → ~330 lines (66% reduction), with better maintainability and automatic validation.

## Backup

The original `graph.json` is backed up as `graph.json.backup` in case manual rollback is needed.
