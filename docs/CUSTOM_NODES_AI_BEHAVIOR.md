# Custom Nodes AI Behavior Guide

## Overview

The AI assistant now creates **rich, actionable custom nodes** instead of just answering questions. This document explains the improved conversational behavior and error handling.

---

## Key Changes (Nov 2025)

### 1. **More Lenient & Conversational**

**Before:**

```
AI: "I don't have enough information in the provided sources to answer this question."
```

**After:**

```
AI: "Before I help with that, could you tell me which part of your journey this relates to?"
```

### 2. **Proactive Node Creation**

When users mention tracking, studying, or organizing, the AI should:

1. **Extract details** from the user's message (tasks, resources, deadlines)
2. **Create the node** with rich content immediately if details are sufficient
3. **Ask clarifying questions** only when critical information is missing

### 3. **Friendly Error Handling**

**Before:**

```
AI: "Error: Failed to create node. Please ensure the parent node ID is valid."
```

**After:**

```
AI: "I had trouble placing that on your roadmap. Could you tell me which part
     of your journey this relates to? For example:
     - Foundation Program or Direct Entry?
     - Level 1, 2, 3, or 4?
     - Red Seal preparation?"
```

---

## System Prompt Improvements

### Old Prompt (Too Strict)

```
CRITICAL INSTRUCTIONS:
1. ONLY use information from the provided context above.
2. If the context does not contain sufficient information, explicitly state:
   "I don't have enough information..."
```

### New Prompt (More Helpful)

```
INSTRUCTIONS:
1. Prioritize information from the provided context, but provide helpful
   guidance even when context is limited.
2. When users want to track something, use the createNode tool to help them.
3. If you need clarification, ask questions conversationally:
   - "Before I help with that, could you tell me..."
   - "To make this more useful for you, what..."
4. Be conversational and helpful. Don't say "I don't have enough information" -
   instead, ask clarifying questions or offer to create something custom.
```

---

## CreateNode Tool Guidance

### When to Use

- User mentions tracking something ("track my exam prep", "remind me to...")
- User mentions specific tasks, topics, or goals
- User provides resource links or deadlines

### Parent ID Strategy

```
User mentions → AI uses
"Red Seal exam" → parentId: "Red Seal"
"Level 4 training" → parentId: "Level 4"
"Foundation program" → parentId: "Foundation Program"
Unclear → Ask: "Where on your roadmap would you like this?"
```

### Rich Content Extraction

**Input:**

```
"I want to prepare for my Red Seal exam. I need to study transformers,
motor controls, and PLC programming. I have the ITA study guide at
https://itabc.ca/study-guide and want to finish by June 2025."
```

**AI Action:**

```typescript
createNode({
  title: "Red Seal Exam Prep",
  description: "Comprehensive preparation for Red Seal electrician exam",
  parentId: "Red Seal",
  type: "checklist",
  checklistItems: [
    "Study transformers",
    "Study motor controls",
    "Study PLC programming",
  ],
  resources: [
    { label: "ITA Study Guide", href: "https://itabc.ca/study-guide" },
  ],
  dueDate: "June 2025",
});
```

**AI Response:**

```
"I've created a Red Seal Exam Prep tracker for you with 3 study topics,
your ITA study guide link, and a June 2025 target date. You can see it
on your roadmap now!"
```

---

## Example Conversations

### Example 1: Rich Details Provided

**User:**

> "I want to prepare for my Red Seal exam. I need to study transformers, motor controls, and PLC programming. I have the ITA study guide at https://itabc.ca/study-guide and want to finish by June 2025."

**AI:**

> _Calls createNode with all details_
>
> "I've created a Red Seal Exam Prep tracker for you with 3 study topics (transformers, motor controls, PLC programming), your ITA study guide link, and a June 2025 target date. You can see it on your roadmap now! 📚"

---

### Example 2: Minimal Info → Ask Questions

**User:**

> "Remind me to renew my safety tickets"

**AI:**

> _Calls createNode with basic info_
>
> "I've added a reminder to renew your safety tickets. Before I finalize this, when do they expire? And which tickets specifically (e.g., First Aid, Fall Protection)?"

---

### Example 3: Unclear Location → Ask Clarification

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

> _Calls createNode with parentId: "Level 3"_
>
> "Perfect! I've created a blueprint reading practice tracker under Level 3. You can add specific exercises or resources to it anytime."

---

### Example 4: Error Recovery (Friendly)

**User:**

> "Track my grounding and bonding studies"

**AI:**

> _createNode fails due to unresolved parentId_
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

### 1. System Prompt Changes

**File:** `src/app/api/chat/route.ts` (lines 389-401)

- Removed "CRITICAL INSTRUCTIONS" and strict context-only policy
- Added conversational question prompts
- Encouraged proactive node creation

### 2. CreateNode Tool Guidance

**File:** `src/app/api/chat/route.ts` (lines 407-425)

- Added detailed "WHEN TO USE" and "HOW TO USE" sections
- Provided parent ID strategy examples
- Showed rich content extraction examples

### 3. Error Message Improvement

**File:** `src/app/api/chat/route.ts` (lines 673-679)

- Replaced technical error with friendly clarification question
- Guides user to provide location info instead of failing silently

---

## Testing Prompts

### Test 1: Rich Content Extraction

```
"I want to prepare for my Red Seal exam. I need to study transformers,
motor controls, and PLC programming. I have the ITA study guide at
https://itabc.ca/study-guide and want to finish by June 2025."
```

**Expected:** Node created with 3 checklist items, 1 resource, due date.

### Test 2: Minimal Info → Questions

```
"Remind me to practice electrical calculations"
```

**Expected:** AI asks for clarification (level, deadline, topics).

### Test 3: Unclear Location → Recovery

```
"Track my motor control studies"
```

**Expected:** AI asks which level/program this relates to.

### Test 4: Direct Placement

```
"Add a Level 4 exam checklist for PLCs, transformers, and code book"
```

**Expected:** Node created immediately under Level 4 with 3 items.

---

## Benefits

✅ **More Natural:** AI doesn't say "I don't have enough information"  
✅ **Proactive:** AI creates nodes instead of just talking about them  
✅ **Forgiving:** Errors prompt clarification, not technical messages  
✅ **Rich Content:** Extracts tasks, resources, deadlines automatically  
✅ **User-Friendly:** Conversational questions guide users

---

## Future Enhancements

1. **Multi-Turn Creation:** Allow users to build nodes over multiple messages
2. **Smart Defaults:** If user's profile shows "Level 3", default to Level 3 parent
3. **Suggested Actions:** AI proactively suggests creating trackers based on conversation
4. **Template Library:** "Do you want to use the 'Exam Prep' template?"

---

## Related Documentation

- `docs/CUSTOM_NODES_SUMMARY.md` — Complete system architecture
- `docs/CUSTOM_NODE_PARENT_RESOLUTION.md` — Parent ID resolution logic
- `prisma/schema.prisma` — CustomNode database schema
