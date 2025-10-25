# Panday

**Interactive career roadmap platform for skilled trades in British Columbia**

Panday helps aspiring tradespeople navigate their career path through interactive, visual roadmaps with AI-powered guidance.

## Features

- **Interactive Visual Roadmaps**: React Flow-based interactive diagrams showing career progression paths
- **AI Career Guidance**: RAG-powered chat using OpenAI embeddings + LLM (Gemini/Claude/GPT)
- **System Status Dashboard**: Real-time health monitoring for all services (Database, Redis, Clerk, OpenAI)
- **Auto-Layout System**: Physics-based graph generation using D3-force simulation
- **Content-Driven Architecture**: Markdown + YAML frontmatter for easy content updates
- **Production Ready**: Rate limiting, input validation, caching, error boundaries, and comprehensive testing

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Database**: PostgreSQL (Neon in production, local Docker in dev)
- **Caching**: Redis (Upstash in production, local Docker in dev)
- **Auth**: Clerk
- **AI**: Google Gemini / Anthropic Claude / OpenAI via Vercel AI SDK
- **Embeddings**: LlamaIndex + OpenAI text-embedding-3-small
- **Visualization**: React Flow + Framer Motion
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Rate Limiting**: Upstash Ratelimit
- **Testing**: Vitest (67+ tests)
- **Runtime**: Bun

## Quick Start

### Prerequisites

- Bun v1.2+
- Docker & Docker Compose

### Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repo>
   cd panday
   bun install
   ```

2. **Copy environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in required values (see `.env.example` for details)

3. **Start local services**

   ```bash
   bun run services:start
   # or manually: docker compose up -d postgres redis
   ```

4. **Run database migrations**

   ```bash
   bun run db:migrate
   ```

5. **Start dev server**
   ```bash
   bun run dev
   ```

Visit `http://localhost:3000` to see the system status dashboard and interactive roadmap.

## Available Scripts

### Development

- `bun run dev` - Start development server with HMR
- `bun run build` - Create production build
- `bun run preview` - Preview production build locally

### Database

- `bun run db:generate` - Regenerate Prisma client
- `bun run db:migrate` - Apply database migrations
- `bun run db:studio` - Open Prisma Studio

### Services

- `bun run services:start` - Start Docker services (Postgres + Redis)
- `bun run services:stop` - Stop Docker services
- `bun run services:status` - Check service status

### Roadmap & Embeddings

- `bun run roadmap:build` - Regenerate graph.json from markdown content
- `bun run embeddings:setup` - Setup Python venv for embeddings generation (one-time)
- `bun run embeddings:generate <roadmap-id>` - Generate OpenAI embeddings for RAG system

### Quality

- `bun run check` - Run ESLint + TypeScript checks
- `bun run format:check` - Check code formatting
- `bun run format:write` - Format code with Prettier

### Testing

- `bun run test` - Run tests in watch mode (Vitest)
- `bun run test:run` - Run all tests once (Vitest)
- `bun run test:ui` - Interactive test UI (Vitest)

**Note**: Use `bun run test`, NOT `bun test` (different test runner)

## Project Structure

```
panday/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/chat/          # RAG chat endpoint
│   │   ├── health/            # Health check page
│   │   └── page.tsx           # Main roadmap + status dashboard
│   ├── components/            # React components
│   │   ├── nodes/             # Custom React Flow node types
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── error-boundary.tsx
│   │   ├── roadmap-flow.tsx   # Main React Flow component
│   │   └── ...
│   ├── data/
│   │   ├── roadmaps/          # Roadmap content (markdown + JSON)
│   │   │   └── electrician-bc/
│   │   │       ├── content/   # Node content (markdown with YAML frontmatter)
│   │   │       ├── graph.json # Auto-generated React Flow graph
│   │   │       └── metadata.json
│   │   └── embeddings/        # OpenAI embeddings + source documents
│   │       └── electrician-bc/
│   │           ├── *.md       # Detailed reference content
│   │           └── index/     # LlamaIndex persisted index
│   ├── lib/                   # Shared utilities
│   │   ├── embeddings-service.ts
│   │   ├── rate-limit.ts
│   │   ├── roadmap-cache.ts
│   │   ├── roadmap-loader.ts
│   │   └── utils.ts
│   ├── server/                # Server-only code
│   │   ├── database/
│   │   ├── status/
│   │   └── db.ts
│   └── styles/
├── prisma/
│   └── schema.prisma
└── scripts/
    ├── embeddings/            # Embedding generation tools
    │   ├── generate.py        # Python script to generate embeddings
    │   ├── generate.sh        # Helper script
    │   └── README.md
    └── build-graph.ts         # Auto-layout roadmap builder
```

## Adding Content

See `docs/ROADMAP_SYSTEM.md` for detailed instructions on:

- Creating new roadmaps
- Adding nodes to existing roadmaps
- Using the auto-layout system
- Content structure and frontmatter format

**Quick workflow**:

1. Create/edit markdown files in `src/data/roadmaps/{roadmap-id}/content/`
2. Run `bun run roadmap:build` to regenerate `graph.json`
3. No manual graph editing needed!

## Architecture

### Data Flow (RAG Chat)

```
User Query → /api/chat
  ↓
  ├─→ OpenAI Embeddings (in-process LlamaIndex) → Relevant context
  │
  └─→ LLM (Gemini/Claude/GPT) + system prompt + context → Streamed response
```

### Caching Strategy

- **Roadmap Data**: In-memory cache with 5-minute TTL
- **Embeddings Indexes**: In-memory cache (loaded on first query per roadmap)
- **Rate Limiting**: Redis-backed sliding window (10 req/min)

### Security

- ✅ Rate limiting on chat endpoint
- ✅ Zod input validation (max 50 messages, 10k chars each)
- ✅ Environment-based API key validation
- ⚠️ No authentication on chat API (MVP - acceptable for now)

## Testing

67+ tests covering:

- Roadmap loader (data parsing, frontmatter, checklists)
- Embeddings service (query, index loading)
- System status (Postgres, Redis, OpenAI health checks)
- Chat API (RAG flow, validation)
- Utils and type definitions

Run tests with `bun run test` (watch mode) or `bun run test:run` (single run).

## Environment Variables

See `.env.example` for complete list. Key variables:

- `PRODUCTION` - Switch between local/prod services
- `DATABASE_URL` / `DATABASE_URL_UNPOOLED` - Neon Postgres (prod)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - Redis (prod)
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Auth
- `OPENAI_API_KEY` - OpenAI embeddings (required)
- `AI_PROVIDER` / `AI_MODEL` - AI chat provider config (anthropic/openai/google)
- `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` - LLM API keys

## Deployment

The app is designed for deployment to:

- **Next.js App**: Vercel, Railway, or any Node.js host (single deployment, no separate services needed)
- **Database**: Neon (Postgres)
- **Redis**: Upstash

Set `PRODUCTION=true` to switch from local services to production providers.

### Embedding Generation

Embeddings are generated locally and committed to git:

1. Add reference documents to `src/data/embeddings/{roadmap-id}/` (markdown or PDF)
2. Run `bun run embeddings:generate {roadmap-id}`
3. Commit generated `index/` directory to git
4. Deploy - embeddings load from disk on first query

## Contributing

1. Follow existing code style (enforced by Prettier + ESLint)
2. Write tests for new features
3. Run `bun run check` before committing
4. Use conventional commit messages
5. Update AGENTS.md when making architectural changes

## Documentation

- `AGENTS.md` - AI assistant guide (architecture, patterns, conventions)
- `docs/ROADMAP_SYSTEM.md` - Complete roadmap system documentation
- `docs/ROADMAP_AUTO_LAYOUT.md` - Auto-layout physics parameters
- `docs/SETUP.md` - Git workflow and Docker helpers

## License

MIT
