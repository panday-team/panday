# Panday Agent Guide

## Project Overview

- Next.js 15 App Router app in `src/app` with shared server helpers in `src/server` and Prisma access in `prisma`
- Global styles live in `src/styles/globals.css`; static assets in `public`
- Generated Prisma client is ignored from version control; start the containers in `docker-compose.yml` before Prisma workflows

## Runtime Status Page

- `src/app/page.tsx` now renders deployment diagnostics instead of the starter marketing content
- Connection checks live in `src/server/status/systemStatus.ts`; reuse this module if other routes need health data
- Clerk controls are centralized in `src/components/AuthControls.tsx` to keep auth UI client-side
- Root layout wraps the tree in `ClerkProvider` (`src/app/layout.tsx`) so `SignedIn`/`SignedOut` helpers work
- Health dashboard presentation uses shadcn cards/badges (`src/app/page.tsx` + `src/components/ui`) for consistent theming
- Root layout forces `dark` mode and applies base background/foreground classes globally

## UI Toolkit

- shadcn/ui initialized via `shadcn init`; global config lives in `components.json`
- Generated components land under `src/components/ui`; add new primitives with `npx shadcn@latest add <component>`
- Custom card/badge primitives live in `src/components/ui` and back the status page layout

## React Flow Integration

- `@xyflow/react` (import its global stylesheet from `@xyflow/react/dist/style.css`) powers the interactive canvas in `src/app/page.tsx`; keep nodes and edges typed via the generics that `Node`, `Edge`, `OnNodesChange`, and helpers like `applyNodeChanges` expose so state setters accept the correct data shapes. citeturn3search4turn2search3
- React Flow UI’s `BaseNode`, `BaseNodeHeader`, `BaseNodeContent`, and `BaseNodeFooter` give us shadcn-aligned node shells—wrap interactive children with the `nodrag` utility class to prevent accidental drags and keep styling tweaks in Tailwind classes. citeturn1search0
- Use the `NodeAppendix` wrapper when you need badges or controls anchored to a node edge; combine it with the BaseNode structure so appendix content stays positioned and accessible. citeturn1search1
- For large diagrams, memoize custom node/edge components and callback props with `React.memo`, `useCallback`, and `useMemo`; avoid reading the full nodes/edges arrays inside components and collapse deep node trees to reduce re-renders. citeturn1search5
- Custom node primitives for the Panday flow live under `src/components/nodes` (`HubNode`, `RequirementNode`, `PortalNode`, `CheckpointNode`, `TerminalNode`); each wraps `BaseNode` + `NodeAppendix`, applies the brand palette (teal `#35C1B9` connectors, lime requirements, light-blue portals, purple checkpoints, yellow hubs/terminal), and pre-registers handle IDs so edges land tangent to the circle rim without arrowheads.

## Dynamic Roadmap System

- **Architecture**: Content-driven system with separation of concerns (content/layout/metadata)
- **Data Structure**: Roadmap data lives in `src/data/roadmaps/{roadmap-id}/` with three files:
  - `metadata.json`: Career-level info (title, province, industry)
  - `graph.json`: React Flow layout (node positions, edges, connections) - AUTO-GENERATED via `bun run roadmap:build`
  - `content/*.md`: Markdown files with YAML frontmatter for each node
- **Auto-Layout System**: Physics-based graph generation using D3-force simulation
  - Run `bun run roadmap:build` to regenerate `graph.json` from markdown frontmatter
  - Main nodes: Fixed positions defined in `layout.position` frontmatter
  - Subnodes: Physics-simulated around parents with collision detection
  - Forces: Link (pulls together), Charge (repels), Collision (prevents overlap), Center (weak centering)
  - 300 iterations ensure stable, deterministic positions
  - See `docs/ROADMAP_AUTO_LAYOUT.md` for physics parameters and configuration
- **Data Loading**: Server-side loading via `src/lib/roadmap-loader.ts` with functions:
  - `buildRoadmap(id)`: Loads complete roadmap (metadata + graph + content)
  - `loadNodeContent(roadmapId, nodeId)`: Parses markdown frontmatter + content sections
  - Uses `gray-matter` for frontmatter parsing
- **Rendering Flow**: `app/page.tsx` (server) → `buildRoadmap()` → `RoadmapFlow` (client) → React Flow visualization
- **Node Types**: `hub` (yellow), `terminal` (purple), `requirement` (lime), `portal` (blue), `checkpoint` (purple)
- **Animations**: Framer Motion integration in `BaseNode` component provides smooth scale/opacity transitions on load and 1.05x scale on hover
- **Content Sections**: Each markdown file can have: Eligibility, Benefits, Final Outcome, Resources
- **Testing**: Comprehensive test suite in `src/lib/__tests__/roadmap-loader.test.ts` (15 tests covering all core functions)
- **Adding Content**: Create markdown file in `content/` with frontmatter, run `bun run roadmap:build` - no manual `graph.json` editing needed
- **Future-Ready**: Structure supports RAG integration with embeddings stored in `src/data/embeddings/`
- **Documentation**: See `docs/ROADMAP_SYSTEM.md` for complete guide on architecture, data format, and adding new roadmaps

## Getting Started

- `bun install` to install dependencies tracked in `bun.lock`
- `docker compose up -d postgres` to launch the local database container before running Prisma commands or local dev
- Copy required env vars into `.env`; validation happens in `src/env.js`
- `./scripts/dev-services.sh start|stop|status` wraps `docker compose` to manage local Postgres/Redis without recreating containers
- `.env.example` documents required variables; replace placeholder strings with environment-specific values in your local `.env`

## Build & Verification Commands

- `bun run dev` — start the HMR dev server
- `bun run build` — create the production bundle and run type checks
- `bun run preview` — serve the built app for smoke testing
- `bun run check` — run ESLint and TypeScript without emitting output, after finishing editing of files run this command to check for eslint or typescript errors
- `bun run test` — run tests in watch mode with Vitest
- `bun run test:run` — run all tests once
- `bun run test:ui` — run tests with interactive UI
- `bun run db:generate` / `bun run db:migrate` — regenerate Prisma client & apply migrations
- `bun run db:studio` — open Prisma Studio for local data inspection

## Code Style & Conventions

- Prettier (`prettier.config.js`) with 2-space indentation; use `bun run format:write`
- ESLint (`eslint.config.js`) + TypeScript enforce modern React rules
- PascalCase for React components, camelCase for vars/functions, kebab-case for route segments under `src/app`
- Keep server-only utilities inside `src/server` or `prisma` to avoid client bundling

## Testing Guidance

- **Framework**: Vitest (`vitest.config.ts`) with 65+ tests across core functionality
- **Structure**: Mirror source structure with `__tests__/` folders (e.g., `src/lib/__tests__/utils.test.ts`)
- **Coverage**: Core modules tested include roadmap-loader, embeddings-client, system status, utils, chat API, and type definitions
- **Patterns**:
  - Use `vi.mock()` for module-level mocking (e.g., Prisma client, Redis, fetch)
  - Use `vi.fn()` for function-level mocking (e.g., AI SDK `streamText`)
  - Test happy paths, error scenarios, edge cases, and parameter variations
  - Mock external dependencies to isolate units under test
- **ESLint Overrides**: Test files disable strict type-checking rules (`no-unsafe-assignment`, `no-unsafe-member-access`, `unbound-method`) that conflict with Vitest patterns
- **Running Tests**:
  - `bun run test` — watch mode for development (uses Vitest)
  - `bun run test:run` — single run for CI/verification (uses Vitest)
  - `bun run test:ui` — interactive UI for debugging (uses Vitest)
  - ⚠️ **Do NOT use** `bun test` — this runs Bun's native test runner which is incompatible with these tests
- **Adding Tests**: Create `__tests__/` folder next to source, name test files `*.test.ts`, follow existing patterns
- **Future**: Add React Testing Library for component tests, Testcontainers for integration tests with real database

## Database & Configuration

- Use Prisma schema at `prisma/schema.prisma`; rerun `bun run db:generate` after edits
- Local Postgres defaults come from `POSTGRES_PORT` (default host port 5432) and Prisma auto-builds the DSN; override with `LOCAL_DATABASE_URL` only if you need custom creds
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and Upstash secrets are only required when `PRODUCTION=true`
- Restart dev server after schema or environment changes
- Do not commit generated Prisma client or local database artifacts

## Security & Secrets

- Never commit secrets; store credentials in the shared secret manager
- Add new env vars to `src/env.js` so they are validated via `@t3-oss/env-nextjs`
- Be mindful of server-only code paths to keep sensitive logic off the client

## Git & Collaboration

- Commit subjects: imperative, present tense, under 72 chars (e.g., `Add profile form validation`)
- Squash formatting-only changes into the related feature commit
- PRs should link issues, summarize changes, list verification commands, and include UI captures for user-facing work
- Request review for updates to Prisma schema or server logic
- `docs/SETUP.md` tracks the git branching rules (protected `origin/main`, no deletion/force push, 1 required review, rebase after `git stash push -u`) and the Docker helpers exposed as `bun run services:start|stop|status` (wrapping `./scripts/dev-services.sh`).

## Need-to-Know Extras

- Tailwind/PostCSS already configured; rely on `prettier-plugin-tailwindcss` for class sorting
- Lint rules disallow anonymous default exports in config files and favor `import` statements over triple-slash references
- `next.config.js` and TypeScript (`tsconfig.json`) already tuned for Next 15 / React 19 features
- Large monorepo guidance: add nested `AGENTS.md` files within packages if this project grows into multiple workspaces

## Auth Notes

- Clerk sign-in and fallback redirect URLs are now configured directly in `src/app/layout.tsx`; remove `NEXT_PUBLIC_CLERK_SIGN_*` entries from env files when syncing configs.
