# Custom Nodes AI Behavior Guide

## Overview

The AI assistant can create **rich, actionable custom nodes** when users explicitly request tracking. However, for informational questions, the AI provides detailed text responses without creating nodes.

---

## Key Behavior (Updated Dec 2025)

### Information vs Action - Critical Distinction

**INFORMATIONAL queries** (user asks "what", "how", "explain", "break down", "can you tell me"):

- Provide a helpful, detailed TEXT response
- Do NOT create nodes
- These are questions seeking knowledge, not tracking tools

**ACTIONABLE requests** (user explicitly wants to track, create, organize, remind):

- Use proposeNode to create a trackable checklist
- Only when user uses words like "create", "track", "help me organize", "remind me"

### Examples

| User Query                                     | AI Response Type |
| ---------------------------------------------- | ---------------- |
| "What counts as apprenticeship hours?"         | TEXT ONLY        |
| "Can you break down the documentation I need?" | TEXT ONLY        |
| "How does the Red Seal exam work?"             | TEXT ONLY        |
| "What are the steps to Level 2?"               | TEXT ONLY        |
| "Create a checklist for my Level 2 prep"       | proposeNode      |
| "Help me track my exam study topics"           | proposeNode      |
| "Remind me to renew my safety tickets"         | proposeNode      |

---

## When to Use proposeNode

### ONLY for Actionable Requests

- User EXPLICITLY asks to create, track, or organize something
- User says "create a checklist", "help me track", "remind me"
- User confirms after AI offered to create ("yes", "sure", "do it")

### NEVER for Informational Questions

- User asks "what", "how", "explain", "break down", "can you tell me"
- User asks about requirements, steps, or processes without mentioning tracking
- User asks general questions about trades, exams, or regulations
- Even if the answer has multiple steps, if user didn't ask to TRACK them, don't create a node

---

## Example Conversations

### Example 1: Informational Query (NO node creation)

**User:**

> "I'm a Level 1 apprentice working for a small contractor. I do about 60% residential, 30% commercial, and some light industrial. My employer isn't sure what to log for my hours. Can you break down exactly what counts and what documentation I need to track?"

**AI:**

> [Detailed text response explaining hour types, logging requirements, documentation needs]
>
> **Does NOT call proposeNode** - this is an informational question asking "can you break down"

---

### Example 2: Actionable Request (use proposeNode)

**User:**

> "Create a checklist to help me track my Level 1 hour documentation"

**AI:**

> "I'll create a Level 1 hour tracking checklist for you."
>
> _Calls proposeNode with title="Level 1 Hour Tracking", checklistItems=[...]_

---

### Example 3: Rich Details with Explicit Tracking Request

**User:**

> "I want to track my Red Seal exam prep. I need to study transformers, motor controls, and PLC programming. I have the ITA study guide at https://itabc.ca/study-guide and want to finish by June 2025."

**AI:**

> _Calls proposeNode with all details_
>
> "I'll create a Red Seal Exam Prep tracker for you with 3 study topics, your study guide link, and a June 2025 target date."

---

### Example 4: Unclear Location → Ask Clarification

**User:**

> "I need to track my blueprint reading practice"

**AI:**

> "I'll create a blueprint reading practice tracker for you. To place it correctly on your roadmap, could you tell me:
>
> - Is this for Level 1, 2, 3, or 4?
> - Or is it related to a specific training program?"

**User:**

> "It's for Level 3"

**AI:**

> _Calls proposeNode with parentId: "Level 3"_
>
> "Perfect! I've created a blueprint reading practice tracker under Level 3."

---

### Example 5: Error Recovery (Friendly)

**User:**

> "Track my grounding and bonding studies"

**AI:**

> _proposeNode fails due to unresolved parentId_
>
> "I had trouble placing that on your roadmap. Could you tell me which part of your journey this relates to? For example:
>
> - Foundation Program?
> - Level 1, 2, 3, or 4?
> - Red Seal preparation?"

**User:**

> "Level 2"

**AI:**

> _Retries with parentId: "Level 2"_
>
> "Got it! I've added a grounding and bonding studies tracker under Level 2."

---

## Technical Implementation

### System Prompt Key Sections

**File:** `src/app/api/chat/route.ts`

1. **INFORMATION vs ACTION** - Distinguishes informational queries from actionable requests
2. **WHEN TO USE proposeNode** - Only for explicit tracking requests
3. **WHEN NOT TO USE proposeNode** - For what/how/explain questions
4. **EXAMPLE FLOWS** - Shows correct behavior for both query types

### proposeNode Tool

- Human-in-the-loop: Shows interactive card for user approval
- User can review, edit, accept, or decline before node is created
- Only use when user explicitly requests tracking/creating/organizing

---

## Benefits

- **Predictable Behavior:** Informational questions get text answers, actionable requests get nodes
- **User Control:** proposeNode gives users choice to accept/decline
- **Natural Conversation:** AI doesn't force node creation on every question
- **Rich Content:** When nodes are created, they have comprehensive details

---

## Related Documentation

- `docs/CUSTOM_NODES_SUMMARY.md` — Complete system architecture
- `docs/CUSTOM_NODE_PARENT_RESOLUTION.md` — Parent ID resolution logic
- `prisma/schema.prisma` — CustomNode database schema
