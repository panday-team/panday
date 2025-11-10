# Roadmap Embeddings Generation

Generate OpenAI embeddings for roadmap reference content to power the RAG chat system.

## Quick Start

```bash
# First time setup (creates Python venv and installs dependencies)
bun run embeddings:setup

# Generate embeddings (incremental update if index exists)
bun run embeddings:generate electrician-bc

```

## Content Organization

the content is organized into two separate directories:

- `src/data/roadmaps/{roadmap-id}/content/` - Short, structured markdown files for React Flow visualization
- `src/data/embeddings/{roadmap-id}/` - Detailed reference documents for RAG (this is what gets embedded)

**This script embeds the detailed reference content from `src/data/embeddings/`**

## Supported File Types

- **Markdown** (`.md`) - Parsed with frontmatter and section extraction
- **PDF** (`.pdf`) - Full text extraction using LlamaIndex PDFReader

## Setup (Detailed)

### 1. Install Python Dependencies

```bash
# Using bun script (recommended)
bun run embeddings:setup

# Or manually
cd scripts/embeddings
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure OpenAI API Key

Add your OpenAI API key to `.env` at project root:

```bash
OPENAI_API_KEY=sk-...
```

### 3. Generate Embeddings

```bash
# Using bun script (recommended)
bun run embeddings:generate electrician-bc

# Or using the shell script directly
./scripts/embeddings/generate.sh electrician-bc

# Or manually with Python
cd scripts/embeddings
source venv/bin/activate
python generate.py --roadmap electrician-bc
```

## Adding New Reference Documents

Simply place your detailed documents in the embeddings directory:

```bash
src/data/embeddings/electrician-bc/
├── electrician-foundation-program.md     # Comprehensive guide
├── red-seal-exam-guide.md                # Detailed exam prep
├── apprenticeship-levels-deep-dive.md    # Level-by-level analysis
└── safety-regulations.pdf                # PDF documents supported!
```

The script will automatically find and embed all `.md` and `.pdf` files.

When you run the generator again, it will:

- **Skip unchanged files** (no API calls, no cost)
- **Add new files** (one API call per new file)
- **Update modified files** (one API call per modified file)
- **Remove deleted files** from the index

## Output Structure

The script creates a persisted LlamaIndex index:

```
src/data/embeddings/{roadmap-id}/
├── electrician-foundation-program.md    # Source markdown (unchanged)
├── safety-regulations.pdf               # Source PDF (unchanged)
└── index/                                # Generated LlamaIndex index
    ├── docstore.json                     # Document storage
    ├── index_store.json                  # Index metadata
    ├── default__vector_store.json        # Vector embeddings
    ├── graph_store.json                  # Graph relationships
    ├── image__vector_store.json          # Image vectors (if any)
    └── metadata.json                     # Generation metadata with file tracking
```

**Important:** Commit both your source files AND the generated `index/` directory to git!

### Metadata File with Change Tracking

The `metadata.json` now tracks file hashes for incremental updates:

```json
{
  "model": "text-embedding-3-small",
  "roadmapId": "electrician-bc",
  "generatedAt": "2025-10-27T17:42:41.185365Z",
  "documentCount": 72,
  "files": {
    "electrician-foundation-program.md": {
      "hash": "abc123def456...",
      "size": 57044,
      "lastModified": "2025-10-23T11:22:00Z"
    },
    "construction-electrician-program.pdf": {
      "hash": "xyz789abc456...",
      "size": 2923737,
      "lastModified": "2025-10-27T10:29:00Z"
    }
  }
}
```

## Storage Backends

The embeddings system supports two storage backends:

### JSON Backend (Default)

- **File-based storage** in `src/data/embeddings/{roadmap-id}/index/`
- Suitable for **small datasets** (< 10 roadmaps, no user-specific indexes)
- **Backward compatible** with existing deployments
- Generated files must be **committed to git**
- Good for development and small-scale production

### Postgres Backend (Recommended for Production)

- **Database storage** using pgvector extension
- **Scalable** for 50+ roadmaps and user-specific indexes
- **Multi-tenant support** via `--user-id` flag
- **Version management** with blue-green deployment
- **No git commits** required for generated embeddings
- Requires `DATABASE_URL` with pgvector-enabled Postgres

### Migration Path

1. **Generate with Postgres**: `bun run embeddings:generate electrician-bc --use-postgres`
2. **Verify data**: Run `scripts/embeddings/test-postgres-embeddings.sh`
3. **Switch backend**: Set `EMBEDDINGS_BACKEND=postgres` in `.env`
4. **Test queries**: Verify chat API returns correct results

## Architecture

### 1. Local Generation (This Script)

**Common Steps (Both Backends):**
1. Reads detailed files from `src/data/embeddings/{roadmap-id}/`
2. Computes SHA-256 hash of each file for change detection
3. Detects new/modified/deleted files by comparing hashes
4. For changed files:
   - Parses markdown frontmatter and content sections
   - Extracts PDF text using LlamaIndex PDFReader
   - Creates LlamaIndex Documents with rich metadata
   - Generates embeddings using OpenAI text-embedding-3-small API

**JSON Backend:**
5. Updates existing index with new documents, modified documents, or deletions
6. Persists updated index to `src/data/embeddings/{roadmap-id}/index/`
7. Stores file hashes in `metadata.json` for future change detection
8. **Commit both source files and the persisted index to git**

**Postgres Backend:**
5. Creates LlamaIndex vector store backed by Postgres
6. Inserts embeddings into temporary LlamaIndex table
7. Copies embeddings to Prisma schema tables (`embedding_documents`, `embedding_indexes`)
8. Updates index metadata with document count and file hashes
9. **No git commits needed** - embeddings live in database

### 2. Next.js Application (Production)

**Hybrid Router** (`src/lib/embeddings-hybrid.ts`):
- Routes queries based on `EMBEDDINGS_BACKEND` environment variable
- Automatic fallback from Postgres to JSON on errors
- Transparent switching without code changes

**JSON Backend** (`src/lib/embeddings-service.ts`):
- Loads persisted index on first query
- Caches loaded indexes in memory (Map-based)
- Queries LlamaIndex for semantic search

**Postgres Backend** (`src/lib/embeddings-postgres.ts`):
- Generates query embedding via OpenAI API
- Queries `embedding_documents` table using pgvector `<=>` operator
- 5-minute in-memory cache for query results
- Supports multi-tenant queries via `userId` field

Both backends pass relevant context to AI provider for final answer generation.

## Command-Line Options

### Full Syntax

```bash
bun run embeddings:generate <roadmap-id> [options]
# or
./scripts/embeddings/generate.sh <roadmap-id> [options]
```

### Options

```bash
# Incremental update (default - only regenerates changed files)
bun run embeddings:generate electrician-bc

# Force full rebuild (regenerate all embeddings)
bun run embeddings:generate electrician-bc --force-rebuild

# Dry run (show what would change without making changes)
bun run embeddings:generate electrician-bc --dry-run

# Use a different embedding model
bun run embeddings:generate electrician-bc --model text-embedding-3-large

# Store embeddings in Postgres instead of JSON files
bun run embeddings:generate electrician-bc --use-postgres

# Generate user-specific embeddings (multi-tenant support)
bun run embeddings:generate electrician-bc --use-postgres --user-id user_123

# Setup virtual environment (one-time)
./scripts/embeddings/generate.sh --setup

# Show help
./scripts/embeddings/generate.sh --help
```

### When to Use Each Mode

| Mode                      | When                     | Cost                | Storage       |
| ------------------------- | ------------------------ | ------------------- | ------------- |
| **Default (incremental)** | Adding/modifying files   | Only changed files  | JSON files    |
| **`--force-rebuild`**     | Updating embedding model | All files           | JSON files    |
| **`--dry-run`**           | Previewing changes       | Zero (no API calls) | None          |
| **`--use-postgres`**      | Scalable production use  | All files           | Postgres DB   |
| **`--user-id`**           | User-specific indexes    | All files           | Postgres only |

## Usage Notes

- Run this script locally whenever reference content changes
- **JSON Backend**: Commit both source files AND the `index/` directory to version control
- **Postgres Backend**: Only commit source files, embeddings live in database
- No embedding generation happens in production (only queries)
- Index/data loading happens lazily on first query per roadmap
- Query results are cached in memory for performance
- **Always track file hashes** (in `metadata.json` for JSON, in database for Postgres) for incremental updates
- Use `EMBEDDINGS_BACKEND` env var to switch between JSON and Postgres at runtime

## Troubleshooting

### "OPENAI_API_KEY not found in environment"

Add your OpenAI API key to `.env` file at project root.

### "Virtual environment not found"

Run setup first:

```bash
bun run embeddings:setup
```

### "Content directory not found"

Ensure you have source files in `src/data/embeddings/{roadmap-id}/`

### Postgres-Specific Issues

**"DATABASE_URL not found" or "connection refused"**

Ensure your `.env` file has a valid `DATABASE_URL` pointing to a Postgres instance with pgvector:

```bash
# Local (Docker)
DATABASE_URL="postgresql://neon:npg@localhost:5432/neondb"

# Production (Neon)
DATABASE_URL="postgresql://username:password@host/dbname?sslmode=require"
```

Start local Postgres:
```bash
docker compose up -d postgres
```

**"pgvector extension not found"**

The Postgres database must have the pgvector extension installed. For local development, the Docker image includes it. For production (Neon), enable it in the database console.

**"No active embedding index found"**

Run the generation script with `--use-postgres` to create the index first:

```bash
bun run embeddings:generate electrician-bc --use-postgres
```

**Verify Postgres embeddings**

Run the test suite to verify data integrity:

```bash
./scripts/embeddings/test-postgres-embeddings.sh
```

This checks: data integrity, vector dimensions, indexes, foreign keys, and similarity search functionality.
