# Deploy Embeddings API to Railway

Since the Railway Terraform provider has limited functionality, use the Railway CLI for deployment.

## Prerequisites

1. **Install Railway CLI:**
   ```bash
   # macOS
   brew install railway

   # Linux/WSL
   npm install -g @railway/cli

   # Or with curl
   curl -fsSL https://railway.app/install.sh | sh
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

## Deployment Steps

### 1. Navigate to the service directory

```bash
cd services/embeddings-api
```

### 2. Initialize Railway project

```bash
railway init
```

This will:
- Create a new Railway project
- Link your local directory to the project

### 3. Link to your GitHub repo (recommended)

```bash
# Push your code to GitHub first
git add .
git commit -m "Add embeddings API"
git push origin main

# Then link Railway to GitHub (from Railway dashboard)
# Go to: https://railway.app/dashboard
# Click your project → Settings → Connect to GitHub
# Select your repo and branch (main)
```

### 4. Set environment variables

```bash
# Set required environment variables
railway variables set ROADMAP_ID=electrician-bc
railway variables set EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
railway variables set ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app,http://localhost:3000
railway variables set PORT=8000

# Railway will auto-detect these from railway.json:
# - Dockerfile location
# - Root directory
```

### 5. Deploy

```bash
# Deploy from local files
railway up

# Or deploy from GitHub (if linked)
# Railway will auto-deploy on every push to main
```

### 6. Get your service URL

```bash
railway domain
```

Copy this URL and add it to your Next.js `.env`:
```bash
EMBEDDINGS_API_URL=https://your-service.railway.app
```

## Quick Deploy Commands

```bash
# One-time setup
cd services/embeddings-api
railway login
railway init
railway variables set ROADMAP_ID=electrician-bc
railway variables set EMBEDDING_MODEL=BAAI/bge-base-en-v1.5
railway variables set ALLOWED_ORIGINS=https://your-app.vercel.app
railway up

# Get URL
railway domain

# View logs
railway logs

# Open dashboard
railway open
```

## Alternative: Deploy via Railway Dashboard (No CLI)

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Select your `panday` repository
4. Configure:
   - **Root Directory:** `services/embeddings-api`
   - **Build Command:** (auto-detected from Dockerfile)
   - **Start Command:** `python main.py`
5. Add environment variables in Settings:
   - `ROADMAP_ID=electrician-bc`
   - `EMBEDDING_MODEL=BAAI/bge-base-en-v1.5`
   - `ALLOWED_ORIGINS=https://your-app.vercel.app`
   - `PORT=8000`
6. Deploy!

## Troubleshooting

### Build fails
- Check Railway logs: `railway logs`
- Ensure embeddings exist in `src/data/embeddings/electrician-bc/index/`
- Verify Dockerfile builds locally: `docker build -t test -f Dockerfile ../..`

### Can't access service
- Make sure you ran `railway domain` to generate a public URL
- Check CORS settings in `ALLOWED_ORIGINS`

### Environment variables not working
- List variables: `railway variables`
- Set variable: `railway variables set KEY=value`
- Delete variable: `railway variables delete KEY`

## Cost

Railway pricing:
- **Free tier:** 500 hours/month, $5 credit
- **Pro tier:** $20/month for 500 hours + overages

Your embeddings API should fit in the free tier for development.
