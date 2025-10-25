# Roadmap Embeddings Generation

Generate OpenAI embeddings for roadmap reference content to power the RAG chat system.

## Quick Start

```bash
# First time setup (creates Python venv and installs dependencies)
bun run embeddings:setup

# Generate embeddings for a roadmap
bun run embeddings:generate electrician-bc

# Or use a different OpenAI model
bun run embeddings:generate electrician-bc --model text-embedding-3-large
```

## Content Organization

Your content is organized into two separate directories:

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
    └── metadata.json                     # Generation metadata
```

**Important:** Commit both your source files AND the generated `index/` directory to git!

## OpenAI Embedding Models

### text-embedding-3-small (Default, Recommended)

- **Dimensions:** 1536
- **Cost:** $0.00002 per 1K tokens (~$0.02 per 1M tokens)
- **Performance:** Fast inference, excellent quality
- **Best for:** Most use cases, production

### text-embedding-3-large

- **Dimensions:** 3072
- **Cost:** $0.00013 per 1K tokens (~$0.13 per 1M tokens)
- **Performance:** Slower, highest quality
- **Best for:** Maximum accuracy requirements

### ada-002 (Legacy)

- **Dimensions:** 1536
- **Cost:** $0.0001 per 1K tokens
- **Performance:** Older model, superseded by 3-small
- **Best for:** Legacy compatibility

## Architecture

### 1. Local Generation (This Script)

1. Reads detailed files from `src/data/embeddings/{roadmap-id}/`
2. Parses markdown frontmatter and content sections
3. Extracts PDF text using LlamaIndex PDFReader
4. Creates LlamaIndex Documents with rich metadata
5. Generates embeddings using OpenAI API
6. Persists complete index to `src/data/embeddings/{roadmap-id}/index/`
7. **Commit both source files and the persisted index to git**

### 2. Next.js Application (Production)

- Loads persisted index on first query
- Caches loaded indexes in memory (Map-based)
- Queries index for semantic search during chat
- Passes relevant context to Gemini for final answer generation

## Helper Script Options

```bash
# Show help
./scripts/embeddings/generate.sh --help

# Setup virtual environment
./scripts/embeddings/generate.sh --setup

# Generate with default model
./scripts/embeddings/generate.sh electrician-bc

# Use a different model
./scripts/embeddings/generate.sh electrician-bc --model text-embedding-3-large
```

## Usage Notes

- Run this script locally whenever reference content changes
- Commit the generated embeddings to version control
- No embedding generation happens in production (only queries)
- Index loading happens lazily on first query per roadmap
- Indexes are cached in memory for performance

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

### Cost Optimization

- Use `text-embedding-3-small` for development and production (default)
- Only use `text-embedding-3-large` if you need maximum accuracy
- Monitor usage at https://platform.openai.com/usage
