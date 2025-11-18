# Chat History Sidebar — High-Level Design

## 1. Background & Goals
- Current `ChatWidget` floats above the roadmap with a single-session transcript stored in `localStorage`. Refreshing clears history and there is no way to revisit earlier questions.
- Goal: add a left-aligned conversation history rail (desktop) / slide-over drawer (mobile) so users can switch between previous conversations, start new ones, and observe per-roadmap context.
- Non-goals: building advanced search, sharing links, or cross-user visibility; those can follow once the core UX and persistence exist.

## 2. Desired User Experience
- When the chat expands, the layout becomes a two-column sheet:  
  - **Sidebar (280 px)**: lists recent conversations with title, last updated timestamp, and miniature badge for the roadmap (e.g., Electrician BC). Top section exposes “New chat” and optional filters (all / roadmap-specific).  
  - **Main panel**: existing chat transcript, sources, and input box. Selecting a conversation swaps transcripts instantly.
- Responsive behavior: sidebar collapses behind a hamburger trigger under 1024 px width; history becomes a slide-over drawer that can be swiped/dismissed.
- Conversation title auto-generates from the first user message but can be renamed inline. Active conversations highlight; hover reveals delete button.
- If a user is not signed in, show a placeholder encouraging authentication instead of a history list.

## 3. Data Model (Prisma + Clerk)
```
model ChatThread {
  id              String   @id @default(cuid())
  userId          String   // Clerk user
  roadmapId       String?  // e.g., electrician-bc; null for global chat
  selectedNodeId  String?  // node used when the chat started
  title           String
  messagePreview  String?  // first 120 chars of last assistant reply
  lastMessageAt   DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  messages        ChatMessage[]
}

model ChatMessage {
  id        String   @id @default(cuid())
  threadId  String   @index
  role      String   // "user" | "assistant" | "system"
  content   String   // markdown payload
  sources   Json?    // persisted citations for replay
  createdAt DateTime @default(now())
  thread    ChatThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
}
```
- `threadId + userId` gating ensures a user cannot access another person’s history.
- Optional `roadmapId` enables filtering and future personalization (e.g., resuming electrician vs. plumber tracks).
- Store `sources` blobs per assistant message to replay citations without re-querying embeddings.

## 4. API Surface
| Route | Method | Purpose |
| --- | --- | --- |
| `/api/chat-threads` | GET | Paginated list of user threads, filterable by `roadmapId`. |
| `/api/chat-threads` | POST | Create a blank thread (returns ID) or derive title from first prompt. |
| `/api/chat-threads/[id]` | GET | Fetch thread metadata + first page of messages. |
| `/api/chat-threads/[id]` | PATCH | Rename thread or move it to a different roadmap bucket. |
| `/api/chat-threads/[id]` | DELETE | Soft-delete (flag) or hard-delete thread + messages. |
| `/api/chat-threads/[id]/messages` | GET | Paginated messages for infinite scroll. |
- Existing `/api/chat` streaming endpoint accepts a new `threadId` in the request body. Server loads historical messages (limited to 25) and appends new ones to `ChatMessage` as the stream finalizes.
- Clerk middleware ensures the `userId` is injected into the handlers.

## 5. Frontend Architecture
- **Shared Context**: `ChatSessionProvider` wraps `ChatWidget`. It fetches threads via SWR/React Query, tracks `activeThreadId`, and exposes CRUD helpers.
- **Sidebar Component**: `ChatHistoryPanel` renders the list, handles optimistic selection, rename inline editing, and delete confirmation. It subscribes to thread mutations so list order updates (sort by `lastMessageAt`).
- **Main Widget Changes**:
  - `useChat` gets an `id` (thread) and `initialMessages`. When switching threads, call `setMessages` with persisted transcript.
  - Starting “New chat” calls POST, sets the new thread as active, clears local state, and focuses the input.
  - When assistant streaming finishes, call `mutate()` on the threads query to refresh preview + timestamp.
- **Responsive Layout**:  
  - Desktop: CSS grid with `grid-template-columns: auto 1fr`.  
  - Mobile: history drawer controlled by a `Sheet` (shadcn). Provide ARIA labels for accessibility.
- **Offline/Guest Behavior**: continue to store transient messages in `localStorage` for unsigned users, but hide the sidebar list with a “Sign in to save history” card.

## 6. Conversation Lifecycle
1. User clicks “New chat”. UI calls POST to `/api/chat-threads`, receives `{id, title}`.
2. `ChatWidget` sets `activeThreadId`, empties `messages`, and ensures `useChat` includes `threadId` in `body`.
3. During streaming, `ChatWidget` still writes the transcript to local state for immediate UX.
4. `onFinish` callback batches both messages (user + assistant) and POSTs them to `/api/chat-threads/[id]/messages` or extends `/api/chat` response handler to persist automatically.
5. Thread list revalidates so `lastMessageAt`/preview update.
6. Selecting another thread fetches cached messages (via SWR) and populates `setMessages`.

## 7. Security, Performance & Observability
- **Auth**: enforce `userId` + `threadId` ownership on every API route, returning 404 for cross-user requests.
- **Rate limiting**: reuse the existing Upstash limiter to cap thread creation (e.g., 30/hour) and deletion to prevent abuse.
- **Pagination**: limit sidebar query to ~30 most recent threads; add "Load more" button for older ones.
- **Background jobs**: optional cron to prune empty threads (no assistant reply) older than 24 h.
- **Logging**: use `logger.info` for CRUD operations with `threadId` and `roadmapId`. Log errors for persistence failures so they surface in existing observability tools.

## 8. Implementation Phases
1. **Schema & API**: add Prisma models + migrations, implement REST handlers with Clerk auth + unit tests (Vitest request handlers).
2. **Frontend wiring**: introduce `ChatSessionProvider`, SWR hooks (`useChatThreads`, `useChatThreadMessages`), and data fetching.
3. **Sidebar UI**: build shadcn-based list, rename + delete flows, responsive drawer.
4. **Chat integration**: thread-aware `ChatWidget`, persistence hook inside `onFinish`, migration path for legacy localStorage history (import last session into a new thread on first load).
5. **Polish**: skeleton states, optimistic updates, toast notifications, analytics event for thread switches.

## 9. Open Questions
- Should threads be scoped per roadmap automatically, or can a user reuse a conversation when switching trades? (Impacts filtering defaults.)
- Do we need soft delete + undo for compliance, or can threads be hard-deleted immediately?
- Should citations be persisted verbatim to avoid re-querying embeddings, or is re-fetch acceptable for storage savings?
- Mobile first-run experience: should we auto-open the sidebar drawer when someone accumulates >1 conversation to improve discoverability?

This design keeps the addition modular: backend persistence lives in dedicated APIs, while `ChatWidget` becomes thread-aware with minimal disruption to the existing streaming flow.
