#!/bin/bash
# Simple test script for the Embeddings API

API_URL="${API_URL:-http://localhost:8000}"

echo "Testing Panday Embeddings API at $API_URL"
echo "============================================"

# Test 1: Health check
echo -e "\n1. Health Check:"
curl -s "$API_URL/health" | python3 -m json.tool

# Test 2: Root endpoint
echo -e "\n2. Root Endpoint:"
curl -s "$API_URL/" | python3 -m json.tool

# Test 3: Query endpoint
echo -e "\n3. Query Test:"
curl -s -X POST "$API_URL/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the requirements for the foundation program?",
    "top_k": 3
  }' | python3 -m json.tool

echo -e "\n✓ Tests complete!"
