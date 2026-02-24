# Panday

Panday is an interactive roadmap app that helps people understand a skilled-trades career path in British Columbia.

Users can explore a visual progression map, open milestone details, ask AI questions with source-backed answers, and track progress over time.

## What This App Does

- Turns a complex apprenticeship journey into a clear, step-by-step visual roadmap
- Helps users understand what to do now, what comes next, and why each step matters
- Supports ongoing learning with a context-aware AI assistant
- Keeps user momentum with checklist tracking and saved chat history

## Live Product Flow (Simple View)

1. User chooses current level and entry path
2. User explores roadmap nodes and checklist items
3. User asks questions in AI chat and sees source-backed guidance
4. User tracks completion and progresses toward the next milestone

## Demo

- Guided walkthrough: `/demo`
- Live app experience: `/roadmap`

## Technical Overview

### Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Runtime:** Bun
- **Language:** TypeScript
- **Database:** PostgreSQL + Prisma
- **Auth:** Clerk
- **AI:** Vercel AI SDK (`anthropic`, `openai`, `google` providers)
- **Embeddings / RAG:** OpenAI embeddings + hybrid JSON/Postgres retrieval
- **Visualization:** React Flow (`@xyflow/react`) + React Flow UI components
- **UI:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Testing:** Vitest

### Architecture Highlights

- **Content-driven roadmap system:** roadmap metadata, graph layout, and markdown content are separated
- **Dynamic graph rendering:** roadmap graph + node content loaded server-side and rendered in React Flow
- **RAG chat pipeline:** query -> embeddings retrieval -> source context injection -> streamed AI response
- **Thread persistence:** user-facing chat threads with CRUD + message storage
- **FAQ pipeline:** extracts Q&A from sessions, clusters similar questions, generates consolidated FAQs
- **Health diagnostics:** runtime status page for key service/config checks

### Reliability and Security

- Zod validation at API boundaries
- In-memory sliding-window rate limiting for chat and voice endpoints
- Request timeouts for external API calls
- User-scoped data access for profile/chat resources
- Structured JSON logging for observability

## Project Structure

```txt
src/
  app/
    page.tsx                    # Landing page
    demo/page.tsx               # Guided product demo
    roadmap/page.tsx            # Main app canvas
    api/                        # Route handlers (chat, profile, threads, faq, cron)
  components/
    landing/                    # Landing page sections
    chat/                       # Chat UI + thread sidebar
    nodes/                      # Custom React Flow node components
  data/
    roadmaps/                   # Content + graph data
    embeddings/                 # Embeddings indexes / documents
  lib/
    roadmap-loader.ts           # Roadmap loading/parsing
    embeddings-hybrid.ts        # Embeddings backend router
    rate-limit.ts               # In-memory limiter
    chat-threads.ts             # Thread/message utilities
  server/
    status/systemStatus.ts      # Runtime diagnostics
prisma/
  schema.prisma
```

## Local Setup

### Prerequisites

- Bun v1.2+
- Docker

### 1) Install

```bash
bun install
```

### 2) Configure env vars

```bash
cp .env.example .env
```

Fill required values in `.env`.

### 3) Start local database

```bash
bun run services:start
```

### 4) Run migrations

```bash
bun run db:migrate
```

### 5) Start app

```bash
bun run dev
```

## Scripts

- `bun run dev` - start development server
- `bun run build` - production build + type checks
- `bun run preview` - run production build locally
- `bun run check` - ESLint + TypeScript
- `bun run test` - Vitest watch mode
- `bun run test:run` - Vitest single run
- `bun run db:migrate` - apply migrations
- `bun run roadmap:build` - regenerate roadmap graph from markdown frontmatter

## Testing

- Test runner: Vitest
- Run full suite: `bun run test:run`
- Example focused run:

```bash
bun run test:run -- src/app/api/chat/__tests__/route.test.ts
```

## Additional Docs

- `AGENTS.md` - detailed architecture and engineering notes
- `docs/ROADMAP_SYSTEM.md` - roadmap content system design
- `docs/ROADMAP_AUTO_LAYOUT.md` - auto-layout graph generation details
- `docs/SETUP.md` - local workflow and branch/dev-service guidance
