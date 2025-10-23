# Panday Embeddings API

FastAPI service that provides semantic search over LlamaIndex embeddings for the Panday roadmap system.

## Architecture

This service:
1. Loads pre-generated LlamaIndex embeddings from `src/data/embeddings/`
2. Provides a REST API for querying the embeddings
3. Returns relevant context for RAG (Retrieval Augmented Generation)

## Local Development

### 1. Install Dependencies

```bash
cd services/embeddings-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the Server

```bash
# From services/embeddings-api/
python main.py

# Or with custom settings
ROADMAP_ID=electrician-bc EMBEDDING_MODEL=BAAI/bge-base-en-v1.5 python main.py
```

The API will be available at `http://localhost:8000`

### 3. Test the API

**Health check:**
```bash
curl http://localhost:8000/health
```

**Query embeddings:**
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the requirements for the foundation program?",
    "top_k": 3
  }'
```

## API Endpoints

### `GET /`
Health check endpoint.

**Response:**
```json
{
  "service": "Panday Embeddings API",
  "status": "healthy",
  "roadmap": "electrician-bc",
  "model": "BAAI/bge-base-en-v1.5"
}
```

### `GET /health`
Detailed health check with loaded indexes.

**Response:**
```json
{
  "status": "healthy",
  "loaded_indexes": ["electrician-bc"]
}
```

### `POST /query`
Query the embeddings for relevant context.

**Request:**
```json
{
  "query": "What are the eligibility requirements?",
  "top_k": 5,
  "roadmap_id": "electrician-bc"
}
```

**Response:**
```json
{
  "query": "What are the eligibility requirements?",
  "roadmap_id": "electrician-bc",
  "sources": [
    {
      "node_id": "foundation-program",
      "title": "Foundation Program",
      "score": 0.85,
      "text_snippet": "Title: Foundation Program..."
    }
  ],
  "context": "[Foundation Program]\nFull document text here...\n---\n[Next Document]..."
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDINGS_PATH` | `../../src/data/embeddings` | Path to embeddings directory |
| `ROADMAP_ID` | `electrician-bc` | Default roadmap to load |
| `EMBEDDING_MODEL` | `BAAI/bge-base-en-v1.5` | HuggingFace embedding model (must match generation) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |
| `PORT` | `8000` | Server port |

## Deployment

### Option 1: Railway Dashboard (Recommended)

Easiest deployment method - no CLI needed:

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - **Root Directory:** `services/embeddings-api`
   - Railway auto-detects Dockerfile
5. Add environment variables in Settings → Variables:
   - `ROADMAP_ID=electrician-bc`
   - `EMBEDDING_MODEL=BAAI/bge-base-en-v1.5`
   - `ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app`
   - `PORT=8000`
6. Deploy! Railway will auto-deploy on every push to main.

**See [`RAILWAY_DEPLOY.md`](RAILWAY_DEPLOY.md) for detailed instructions.**

### Option 2: Railway CLI

1. **Create Railway project:**
   ```bash
   railway init
   ```

2. **Set environment variables in Railway dashboard:**
   ```
   ROADMAP_ID=electrician-bc
   EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
   ALLOWED_ORIGINS=https://yourapp.vercel.app
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

   Railway will automatically:
   - Detect the Dockerfile
   - Build and deploy the service
   - Copy embeddings from `src/data/embeddings/`

4. **Get your API URL:**
   ```bash
   railway domain
   ```

### Option 2: Render

1. **Create `render.yaml` in project root:**
   ```yaml
   services:
     - type: web
       name: panday-embeddings-api
       runtime: docker
       dockerfilePath: ./services/embeddings-api/Dockerfile
       dockerContext: .
       envVars:
         - key: ROADMAP_ID
           value: electrician-bc
         - key: EMBEDDING_MODEL
           value: BAAI/bge-base-en-v1.5
         - key: ALLOWED_ORIGINS
           value: https://yourapp.vercel.app
   ```

2. **Connect to Render dashboard:**
   - Go to https://render.com
   - Connect your GitHub repo
   - Render will auto-deploy on push to main

### Option 3: Render

See Render deployment details in the [full README](#option-2-render) section below.

### Option 4: Docker Locally

```bash
# Build from project root
docker build -t panday-embeddings-api -f services/embeddings-api/Dockerfile .

# Run
docker run -p 8000:8000 \
  -e ROADMAP_ID=electrician-bc \
  -e EMBEDDING_MODEL=BAAI/bge-base-en-v1.5 \
  panday-embeddings-api
```

## Production Checklist

- [ ] Generate embeddings locally (`bun run embeddings:generate`)
- [ ] Commit embeddings to git (`src/data/embeddings/{roadmap-id}/index/`)
- [ ] Set `ALLOWED_ORIGINS` to your Next.js domain
- [ ] Deploy to Railway/Render
- [ ] Test query endpoint
- [ ] Update Next.js `.env` with FastAPI URL

## Performance Notes

- **Cold start:** First request loads the embedding model (~100MB download + index loading)
- **Warm requests:** Subsequent requests are fast (<100ms for query)
- **Memory usage:** ~500MB-1GB depending on model size
- **Scaling:** Stateless - can run multiple instances behind load balancer

## Troubleshooting

### Error: "Index not found"
Make sure embeddings are generated and committed:
```bash
ls src/data/embeddings/electrician-bc/index/
```

Should show: `docstore.json`, `index_store.json`, `vector_store.json`, etc.

### Error: "Model download failed"
The embedding model downloads on first run. Ensure internet connectivity and sufficient disk space (~400MB for bge-base).

### CORS errors
Set `ALLOWED_ORIGINS` to include your Next.js domain:
```bash
ALLOWED_ORIGINS=https://yourapp.vercel.app,http://localhost:3000
```

## Development Tips

**Hot reload:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Test with different queries:**
```bash
# Using httpie (install: brew install httpie)
http POST localhost:8000/query query="What is the Red Seal certification?" top_k=3
```

**Check loaded models:**
```bash
curl localhost:8000/health
```
