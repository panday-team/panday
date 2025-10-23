#!/bin/bash
set -e

echo "🐳 Testing embeddings-api locally with Docker..."
echo ""

# Build and start the container
echo "Building Docker image..."
docker compose build

echo ""
echo "Starting container..."
docker compose up -d

echo ""
echo "Waiting for container to be healthy..."
for i in {1..30}; do
    if docker compose ps | grep -q "healthy"; then
        echo "✓ Container is healthy!"
        break
    fi
    echo "  Attempt $i/30: Waiting for health check..."
    sleep 2
done

echo ""
echo "📋 Container logs:"
docker compose logs

echo ""
echo "🧪 Testing endpoints..."
echo ""

echo "1. Testing root endpoint (/):"
curl -s http://localhost:8000/ | jq .

echo ""
echo "2. Testing health endpoint (/health):"
curl -s http://localhost:8000/health | jq .

echo ""
echo "3. Testing query endpoint (/query):"
curl -s -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the requirements to become an electrician?", "top_k": 3}' \
  | jq .

echo ""
echo "✅ All tests completed!"
echo ""
echo "To view logs: docker compose logs -f"
echo "To stop: docker compose down"
