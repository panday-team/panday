#!/usr/bin/env python3
"""
FastAPI service for RAG query using LlamaIndex embeddings.

This service loads pre-generated embeddings from disk and provides
a query endpoint for semantic search.
"""

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from llama_index.core import StorageContext, load_index_from_storage
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from pydantic import BaseModel, Field


# Environment configuration
EMBEDDINGS_PATH = os.getenv("EMBEDDINGS_PATH", "../../src/data/embeddings")
ROADMAP_ID = os.getenv("ROADMAP_ID", "electrician-bc")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app = FastAPI(
    title="Panday Embeddings API",
    description="RAG query service using LlamaIndex embeddings",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class QueryRequest(BaseModel):
    """Query request model."""

    query: str = Field(..., description="The user's question", min_length=1)
    top_k: int = Field(
        default=5, description="Number of relevant documents to return", ge=1, le=20
    )
    roadmap_id: str = Field(
        default=None, description="Optional roadmap ID (defaults to configured roadmap)"
    )


class SourceDocument(BaseModel):
    """Source document metadata."""

    node_id: str
    title: str
    score: float
    text_snippet: str


class QueryResponse(BaseModel):
    """Query response model."""

    query: str
    roadmap_id: str
    sources: list[SourceDocument]
    context: str


# Global index storage
_index_cache: dict[str, Any] = {}


def find_project_root() -> Path:
    """Find the project root by looking for package.json."""
    current = Path(__file__).parent
    while current != current.parent:
        if (current / "package.json").exists():
            return current
        current = current.parent
    # Fallback to assuming we're in services/embeddings-api/
    return Path(__file__).parent.parent.parent


def load_index(roadmap_id: str):
    """Load the LlamaIndex index from disk (cached)."""
    if roadmap_id in _index_cache:
        return _index_cache[roadmap_id]

    # Find project root
    project_root = find_project_root()
    index_path = project_root / "src/data/embeddings" / roadmap_id / "index"

    if not index_path.exists():
        raise FileNotFoundError(
            f"Index not found at {index_path}. Run embedding generation first."
        )
    print(f"Loading index from {index_path}...")

    # Configure embedding model (must match the model used for generation)
    embed_model = HuggingFaceEmbedding(model_name=EMBEDDING_MODEL)

    # Load index from storage
    from llama_index.core import Settings

    Settings.embed_model = embed_model

    storage_context = StorageContext.from_defaults(persist_dir=str(index_path))
    index = load_index_from_storage(storage_context)

    _index_cache[roadmap_id] = index
    print(f"✓ Index loaded for {roadmap_id}")

    return index


@app.on_event("startup")
async def startup_event():
    """Load the default index on startup."""
    print(f"Starting Panday Embeddings API...")
    print(f"Roadmap: {ROADMAP_ID}")
    print(f"Embedding Model: {EMBEDDING_MODEL}")

    try:
        load_index(ROADMAP_ID)
        print("✓ Default index loaded successfully")
    except Exception as e:
        print(f"⚠ Warning: Could not load default index: {e}")
        print("Index will be loaded on first query")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "Panday Embeddings API",
        "status": "healthy",
        "roadmap": ROADMAP_ID,
        "model": EMBEDDING_MODEL,
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "loaded_indexes": list(_index_cache.keys()),
    }


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Query the embeddings for relevant context.

    Args:
        request: Query request with question and parameters

    Returns:
        QueryResponse with relevant sources and context
    """
    roadmap_id = request.roadmap_id or ROADMAP_ID

    try:
        # Load index
        index = load_index(roadmap_id)

        # Use retriever directly instead of query engine
        # This avoids needing an LLM since we only want document retrieval
        retriever = index.as_retriever(similarity_top_k=request.top_k)

        # Execute retrieval
        nodes = retriever.retrieve(request.query)

        # Extract source documents
        sources = []
        context_parts = []

        for node in nodes:
            # Extract metadata
            metadata = node.node.metadata
            text_snippet = (
                node.node.text[:200] + "..."
                if len(node.node.text) > 200
                else node.node.text
            )

            source = SourceDocument(
                node_id=metadata.get("node_id", "unknown"),
                title=metadata.get("title", "Unknown"),
                score=node.score,
                text_snippet=text_snippet,
            )
            sources.append(source)

            # Build context string
            context_parts.append(f"[{source.title}]\n{node.node.text}\n")

        # Combine context
        full_context = "\n---\n".join(context_parts)

        return QueryResponse(
            query=request.query,
            roadmap_id=roadmap_id,
            sources=sources,
            context=full_context,
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
