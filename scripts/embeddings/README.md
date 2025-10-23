# Roadmap Embeddings Generation

This directory contains tools for generating LlamaIndex embeddings from detailed reference markdown content for use in the RAG (Retrieval Augmented Generation) system.

## Content Organization

Your content is organized into two separate directories:

- `src/data/roadmaps/{roadmap-id}/content/` - Short, structured markdown files for React Flow visualization
- `src/data/embeddings/{roadmap-id}/` - Detailed reference documents for RAG (this is what gets embedded)

**This script embeds the detailed reference content from `src/data/embeddings/`**

## Setup

### 1. Install Python Dependencies

```bash
cd scripts/embeddings
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Generate Embeddings

```bash
# From project root
python scripts/embeddings/generate.py --roadmap electrician-bc

# Or with custom model
python scripts/embeddings/generate.py --roadmap electrician-bc --model BAAI/bge-base-en-v1.5
```

### 3. Adding New Reference Documents

Simply place your detailed markdown files in the embeddings directory:

```bash
# Create your detailed reference content
src/data/embeddings/electrician-bc/
├── electrician-foundation-program.md     # Comprehensive guide
├── red-seal-exam-guide.md                # Future: detailed exam prep
└── apprenticeship-levels-deep-dive.md    # Future: level-by-level analysis
```

The script will automatically find and embed all `.md` files in this directory.

### 4. Output

The script will create a persisted LlamaIndex index at:
```
src/data/embeddings/{roadmap-id}/
├── electrician-foundation-program.md    # Your source markdown (unchanged)
├── red-seal-exam-guide.md               # More source files...
└── index/                                # Generated LlamaIndex index
    ├── docstore.json                     # Document storage
    ├── index_store.json                  # Index metadata
    ├── vector_store.json                 # Vector embeddings
    ├── graph_store.json                  # Graph relationships
    └── metadata.json                     # Generation metadata
```

**Important:** Commit both your source markdown files AND the generated `index/` directory to git!

## Recommended Models

### Small & Fast (Recommended for Development)
- **BAAI/bge-small-en-v1.5** (384 dimensions, ~100MB)
- Fast inference, good quality

### Balanced (Recommended for Production)
- **BAAI/bge-base-en-v1.5** (768 dimensions, ~400MB)
- Best balance of quality and speed

### High Quality
- **BAAI/bge-large-en-v1.5** (1024 dimensions, ~1.2GB)
- Highest quality, slower inference

## Architecture

### Local (This Script)
1. Reads detailed markdown files from `src/data/embeddings/{roadmap-id}/`
2. Parses frontmatter and content sections
3. Creates LlamaIndex Documents with rich metadata
4. Generates embeddings using HuggingFace model
5. Persists complete index to `src/data/embeddings/{roadmap-id}/index/`
6. **Commit both markdown files and the persisted index to git**

### Production (FastAPI Service)
- Loads the persisted index on startup
- Provides `/query` endpoint for semantic search
- No embedding generation in production

### Next.js Application
- Calls FastAPI `/query` endpoint
- Retrieves relevant context
- Passes to LLM for final answer generation

## Usage Notes

- Run this script locally whenever markdown content changes
- Commit the generated embeddings to version control
- The FastAPI service loads these pre-generated embeddings
- No embedding generation happens in production (only queries)

## Troubleshooting

### Model Download Issues
If model download fails, manually download:
```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"
```

### Memory Issues
Use a smaller model:
```bash
python scripts/embeddings/generate.py --roadmap electrician-bc --model sentence-transformers/all-MiniLM-L6-v2
```
