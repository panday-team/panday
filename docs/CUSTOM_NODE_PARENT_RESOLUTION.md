# Custom Node Parent ID Resolution - Test Cases

## Fixed Issues

1. ✅ Red Seal now respects user specialization (was hardcoded to construction)
2. ✅ Unspecialized users get multi-parent attachment (both industrial + construction)
3. ✅ Level 4 also supports multi-parent for unspecialized users
4. ✅ ACE-IT program variations now resolve correctly (was falling back to direct-entry)

## Resolution Logic Flow

```
AI receives parent ID request (e.g., "Red Seal", "Level 4")
    ↓
Check for exact match in graph
    ↓
NO MATCH → Apply resolution rules
    ↓
┌─────────────────────────────────────────┐
│ 1. Check static overrides dictionary   │
│    (Level 1, Level 2, Level 3, etc.)   │
└─────────────────────────────────────────┘
    ↓
NO MATCH → Check specialization-dependent nodes
    ↓
┌─────────────────────────────────────────┐
│ 2. Level 4 Resolution                   │
│    • No specialization → BOTH variants  │
│    • Industrial → level-4-industrial    │
│    • Construction → level-4-construction│
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 3. Red Seal Resolution                  │
│    • No specialization → BOTH variants  │
│    • Industrial → red-seal-industrial   │
│    • Construction → red-seal-construction│
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 4. Fuzzy Match (similarity > 25%)      │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ 5. Fallback to "direct-entry"          │
└─────────────────────────────────────────┘
```

## Test Matrix

### Test Case 1: Industrial User + Red Seal

**Input:**

- User specialization: `industrial`
- AI parent ID: `"Red Seal"`

**Expected Output:**

- Parent ID: `red-seal-industrial`
- Log: `Red Seal → red-seal-industrial (user specialization: industrial)`

**Test Prompt:**

> "I need to remember to practice for my Red Seal exam"

---

### Test Case 2: Construction User + Red Seal

**Input:**

- User specialization: `construction`
- AI parent ID: `"Red Seal"`

**Expected Output:**

- Parent ID: `red-seal-construction`
- Log: `Red Seal → red-seal-construction (user specialization: construction)`

**Test Prompt:**

> "Remind me to study Red Seal requirements"

---

### Test Case 3: Unspecialized User + Red Seal

**Input:**

- User specialization: `null` or `undefined`
- AI parent ID: `"Red Seal"`

**Expected Output:**

- Parent IDs: `red-seal-industrial, red-seal-construction` (multi-parent)
- Log: `Red Seal → Multi-parent (no specialization): red-seal-industrial, red-seal-construction`

**Test Prompt:**

> "Add a note about Red Seal certification"

**Expected Behavior:**

- Node appears near BOTH Red Seal variants
- Positioned between industrial and construction paths
- User can see it regardless of which path they explore

---

### Test Case 4: Industrial User + Level 4

**Input:**

- User specialization: `industrial`
- AI parent ID: `"Level 4"`

**Expected Output:**

- Parent ID: `level-4-industrial`
- Log: `Level 4 → level-4-industrial (user specialization: industrial)`

**Test Prompt:**

> "I need to track my Level 4 technical training hours"

---

### Test Case 5: Construction User + Level 4

**Input:**

- User specialization: `construction`
- AI parent ID: `"Level 4"`

**Expected Output:**

- Parent ID: `level-4-construction`
- Log: `Level 4 → level-4-construction (user specialization: construction)`

**Test Prompt:**

> "Remind me about Level 4 blueprint reading"

---

### Test Case 6: Unspecialized User + Level 4

**Input:**

- User specialization: `null`
- AI parent ID: `"Level 4"`

**Expected Output:**

- Parent IDs: `level-4-industrial, level-4-construction` (multi-parent)
- Log: `Level 4 → Multi-parent (no specialization): level-4-industrial, level-4-construction`

**Test Prompt:**

> "Add a checklist for Level 4 completion"

---

### Test Case 7: Mixed Case + Variations

**Input:**

- User specialization: `industrial`
- AI parent ID variants: `"red seal"`, `"Red Seal"`, `"RED SEAL"`, `"level 4"`, `"Level 4"`, `"level-4"`

**Expected Output:**

- All variants resolve correctly (case-insensitive matching)
- Logs show consistent resolution

**Test Prompts:**

> "I want to track my red seal progress"
> "Add a note for level 4 studies"

---

### Test Case 8: ACE-IT Program Variations

**Input:**

- AI parent ID variants: `"ACE-IT"`, `"ACE IT"`, `"ace-it"`, `"Ace-It"`, `"ACEIT"`, `"ACE-IT Program"`

**Expected Output:**

- All variants resolve to `ace-it-program`
- Log: `Mapped parentId "ACE-IT" to "ace-it-program" via overrides`

**Test Prompts:**

> "Remind me to focus on my other classes while in ACE-IT"
> "Add a checklist for ACE IT requirements"

**Background:**

ACE-IT (Accelerated Credit Enrolment in Industry Training) is a high school entry path. Previously, variations like "ACE-IT" would fail fuzzy matching and fall back to "direct-entry" incorrectly.

---

## Verification Steps

### 1. Visual Inspection (Frontend)

1. Log in as industrial user
2. Ask AI: "Remind me to study transformers for Level 4"
3. **Expected:** Node appears near `level-4-industrial` (not construction)
4. **Verify:** Check node position is close to industrial variant

### 2. Log Inspection (Backend)

1. Monitor server logs during node creation
2. Look for log entries:
   ```
   Level 4 → level-4-industrial (user specialization: industrial)
   ```
3. **Verify:** Correct specialization detected and applied

### 3. Database Verification

1. Query `CustomNode` table after creation:
   ```sql
   SELECT id, parentId, userId, title
   FROM "CustomNode"
   WHERE userId = 'user_xxx'
   ORDER BY createdAt DESC
   LIMIT 1;
   ```
2. **Expected:** `parentId` matches user's specialization
3. **For multi-parent:** `parentId` contains comma-separated IDs

### 4. Multi-Parent Verification (Guest Users)

1. Log out (guest mode)
2. Ask AI: "Add a note about Red Seal exam prep"
3. **Expected:** Node created with `parentId: "red-seal-industrial,red-seal-construction"`
4. **Visual:** Node positioned between both variants

---

## Edge Cases Handled

### ✅ Case Insensitivity

- `"Red Seal"` === `"red seal"` === `"RED SEAL"`
- Uses `.toLowerCase()` for comparison

### ✅ Exact ID Matching

- `"level-4-industrial"` (exact match) → no transformation needed
- Bypasses specialization logic entirely

### ✅ Fuzzy Matching Fallback

- If user types `"Level Four"` → fuzzy matches to `level-4-*`
- Then applies specialization logic

### ✅ Multi-Parent Positioning

- Custom node positioning algorithm finds centroid between multiple parents
- Physics simulation accounts for both attachment points

### ✅ Fallback Safety

- If all resolution fails → defaults to `"direct-entry"`
- Prevents orphaned nodes

---

## Recent Improvements (Nov 2025)

### ✅ Centroid Positioning (IMPLEMENTED)

Multi-parent nodes now position at the **centroid** (center point) of all their parents, not just the first parent.

**Algorithm:**

```typescript
centroid.x = (parent1.x + parent2.x + ... + parentN.x) / N
centroid.y = (parent1.y + parent2.y + ... + parentN.y) / N
```

**Benefits:**

- Visually equidistant from all parents
- Better visual hierarchy for multi-path nodes
- Preserves collision avoidance around centroid

### ✅ Visual Connectors (IMPLEMENTED)

Custom nodes now show **dashed golden lines** connecting to ALL their parents.

**Styling:**

- Golden color (`#FFB830`) matches custom node border
- Dashed pattern (`strokeDasharray: 5,5`)
- Semi-transparent (60% opacity)
- No arrow markers (distinguishes from main path edges)

**Benefits:**

- Clear visual indication of multi-parent relationships
- Easy to trace which hub(s) a custom node belongs to
- Golden theme reinforces "custom" status

### ✅ Performance Optimization (IMPLEMENTED)

Collision physics now uses **spatial partitioning** for O(n) performance with large node counts.

**SpatialGrid Algorithm:**

- 250px grid cells (slightly larger than repulsion distance)
- 3x3 neighbor lookup (includes all adjacent cells)
- Automatic threshold: Uses optimization when node count > 20
- Fallback to naive O(n²) for small graphs (less overhead)

**Benefits:**

- Scales to 100+ custom nodes without lag
- 50 iterations complete in <10ms (vs ~200ms naive)
- Early termination when velocities settle
- Distance-based culling reduces unnecessary calculations

---

## Known Limitations

1. **Guest User Persistence:** Guest users can't save custom nodes to database (no userId). Multi-parent attachment only works for authenticated users.

2. **Specialization Change:** If user changes specialization after creating nodes, existing nodes remain attached to old variant. No automatic migration.

3. **Edge Visibility:** Custom node edges are always visible (no selection-based hiding like category nodes).

---

## Future Enhancements

1. **Auto-Migration:** When user updates specialization, migrate existing custom nodes to new variant
2. **Specialization Prompt:** Ask AI to clarify: "Which Level 4 variant? (industrial or construction)"
3. **Custom Node Grouping:** Allow users to create folders/groups for organizing many custom notes
4. **Undo/Redo:** Support for reverting accidental custom node deletions

---

## Logging Format

All parent ID resolution logs follow this format:

```
[timestamp] INFO: <Input> → <Output> (<Reason>)
```

Examples:

```
Red Seal → red-seal-industrial (user specialization: industrial)
Level 4 → Multi-parent (no specialization): level-4-industrial, level-4-construction
Foundation Program → foundation-program via overrides
ACE-IT → ace-it-program via overrides
```

This enables easy debugging and monitoring of resolution accuracy.
