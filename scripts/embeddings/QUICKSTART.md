# Quick Start Guide

## Current Status

Your content structure is already set up correctly:

```
src/data/embeddings/electrician-bc/
└── electrician-foundation-program.md  ✓ (57KB detailed guide)
```

## Next Steps

### 1. Install Python Dependencies (One-time setup)

```bash
# Option A: Using npm script (recommended)
bun run embeddings:setup

# Option B: Manual setup
cd scripts/embeddings
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Note:** This will download ~4GB of dependencies (PyTorch, CUDA libraries, transformers). It takes 5-10 minutes.

### 2. Generate Embeddings

```bash
# Option A: Using npm script (from project root)
bun run embeddings:generate -- --roadmap electrician-bc

# Option B: Direct python (from project root)
cd scripts/embeddings
source venv/bin/activate
python generate.py --roadmap electrician-bc
```

**What happens:**
- Loads `electrician-foundation-program.md`
- Downloads embedding model `BAAI/bge-small-en-v1.5` (~100MB, cached after first run)
- Generates vector embeddings
- Saves to `src/data/embeddings/electrician-bc/index/`

**Output:**
```
src/data/embeddings/electrician-bc/
├── electrician-foundation-program.md      # Your source (unchanged)
└── index/                                  # Generated index (NEW)
    ├── docstore.json
    ├── index_store.json
    ├── vector_store.json
    ├── graph_store.json
    └── metadata.json
```

### 3. Commit to Git

```bash
git add src/data/embeddings/electrician-bc/index/
git commit -m "Add LlamaIndex embeddings for electrician foundation program"
```

### 4. Add More Reference Documents (Future)

Just add more markdown files to the same directory:

```bash
src/data/embeddings/electrician-bc/
├── electrician-foundation-program.md
├── red-seal-exam-guide.md              # Add this
├── apprenticeship-levels-guide.md      # Add this
└── safety-certifications.md            # Add this
```

Then regenerate embeddings:
```bash
bun run embeddings:generate -- --roadmap electrician-bc
```

## Troubleshooting

### Error: "Content directory not found"
Make sure you're running from the project root and the path exists:
```bash
ls src/data/embeddings/electrician-bc/
```

### Slow installation
The first `pip install` downloads ~4GB. Use fast internet or let it run overnight.

### Memory issues
Use a smaller embedding model:
```bash
bun run embeddings:generate -- --roadmap electrician-bc --model sentence-transformers/all-MiniLM-L6-v2
```

## What's Next?

After generating embeddings, you'll need:

1. **Python FastAPI service** - To load the index and provide `/query` endpoint
2. **Next.js integration** - To call FastAPI from your chatbot
3. **LLM integration** - To generate final answers using retrieved context

These are not yet implemented but will come next!
