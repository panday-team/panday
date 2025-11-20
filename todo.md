## custom roadmap implementation

Potential Next Steps (Optional)

1. Visual Polish

- Add a distinctive visual style for custom nodes (different color, icon, or border)
- Add subtle animation when new nodes appear after creation
- Consider a "glow" or "highlight" effect to draw attention to newly created nodes

2. Node Management UI

- Add ability to delete custom nodes (trash icon in info panel)
- Add ability to edit custom nodes (inline editing)
- Add a "My Custom Notes" section in the sidebar to see all custom nodes at once

3. Smart Positioning

- Improve auto-positioning algorithm to avoid overlaps with existing nodes
- For multi-parent nodes, position at the centroid of all parents
- Add slight randomization to prevent stacking when multiple nodes share same parent

4. Node Status Tracking

- Allow users to mark custom nodes as completed (checkbox in info panel)
- Show completion status visually (checkmark, strikethrough, or fade effect)
- Store completion state in database

5. Bulk Operations

- "Create a study plan for Level 2" → AI creates multiple related custom nodes at once
- "Clear all my custom notes" → Delete all user's custom nodes

6. Mobile Optimization

- Ensure custom nodes are touch-friendly on mobile
- Test drag behavior on mobile devices

7. Testing & Documentation

- Add unit tests for createCustomNode function
- Add integration tests for the AI tool
- Update AGENTS.md with custom nodes documentation

---
