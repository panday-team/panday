# Quick Start Guide - OpenAI Embeddings

## Current Status

Your content structure is already set up correctly:

```
src/data/embeddings/electrician-bc/
└── electrician-foundation-program.md  ✓ (57KB detailed guide)
```

## Next Steps

### 1. Install Python Dependencies (One-time setup)

```bash
# Option A: Using bun script (recommended)
bun run embeddings:setup

# Option B: Manual setup
cd scripts/embeddings
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Note:** This installs LlamaIndex and OpenAI SDK. Takes ~2 minutes.

### 2. Configure OpenAI API Key

Add to `.env` at project root:

```bash
OPENAI_API_KEY=sk-...
```

### 3. Generate Embeddings

```bash
# Option A: Using bun script (from project root)
bun run embeddings:generate electrician-bc

# Option B: Using helper script
./scripts/embeddings/generate.sh electrician-bc

# Option C: Direct python
cd scripts/embeddings
source venv/bin/activate
python generate.py --roadmap electrician-bc
```

**What happens:**

- Loads all `.md` and `.pdf` files from `src/data/embeddings/electrician-bc/`
- Calls OpenAI API to generate embeddings (model: `text-embedding-3-small`)
- Saves to `src/data/embeddings/electrician-bc/index/`

**Output:**

```
src/data/embeddings/electrician-bc/
├── electrician-foundation-program.md      # Your source (unchanged)
└── index/                                  # Generated index (NEW)
    ├── docstore.json
    ├── index_store.json
    ├── default__vector_store.json
    ├── graph_store.json
    ├── image__vector_store.json
    └── metadata.json
```

**Cost:** ~$0.02 per 1M tokens with text-embedding-3-small

### 4. Commit to Git

```bash
git add src/data/embeddings/electrician-bc/index/
git commit -m "Add OpenAI embeddings for electrician foundation program"
```

### 5. Add More Reference Documents (Future)

Just add more files to the same directory:

```bash
src/data/embeddings/electrician-bc/
├── electrician-foundation-program.md
├── red-seal-exam-guide.md              # Add markdown
├── apprenticeship-levels-guide.md      # Add markdown
└── safety-regulations.pdf              # Add PDF (requires llama-index-readers-file)
```

Then regenerate embeddings:

```bash
bun run embeddings:generate electrician-bc
```

## Troubleshooting

### Error: "Content directory not found"

Make sure you're running from the project root and the path exists:

```bash
ls src/data/embeddings/electrician-bc/
```

### Error: "OPENAI_API_KEY not found"

Add your API key to `.env` at project root:

```bash
OPENAI_API_KEY=sk-...
```

### Want to use PDFs?

Install the optional PDF reader:

```bash
cd scripts/embeddings
source venv/bin/activate
pip install llama-index-readers-file
```

### Use a different model?

```bash
bun run embeddings:generate electrician-bc --model text-embedding-3-large
```

## What's Next?

After generating embeddings:

1. ✅ **Next.js loads them automatically** - The chat API (`/api/chat`) loads indexes on first query
2. ✅ **RAG system works** - Queries find relevant context from your documents
3. ✅ **LLM generates answers** - Gemini/Claude/GPT uses context to answer questions

Everything is already integrated - just add content and regenerate embeddings!
