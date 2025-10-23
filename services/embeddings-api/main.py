#!/usr/bin/env python3
"""
FastAPI service for RAG query using LlamaIndex embeddings.

This service loads pre-generated embeddings from disk and provides
a query endpoint for semantic search.
"""

import os
import sys
import warnings
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

# Suppress Pydantic warnings from LlamaIndex internals
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from llama_index.core import Settings, StorageContext, load_index_from_storage
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from pydantic import BaseModel, Field


# Environment configuration
EMBEDDINGS_PATH = os.getenv("EMBEDDINGS_PATH", "../../src/data/embeddings")
ROADMAP_ID = os.getenv("ROADMAP_ID", "electrician-bc")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-base-en-v1.5")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# Global index storage
_index_cache: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan event handler (replaces deprecated on_event)."""
    # Startup
    print(f"Starting Panday Embeddings API...", flush=True)
    print(f"Roadmap: {ROADMAP_ID}", flush=True)
    print(f"Embedding Model: {EMBEDDING_MODEL}", flush=True)
    print(f"Note: Embedding model will be downloaded on first request (~500MB)", flush=True)
    print(f"Server is ready to accept requests", flush=True)

    # Don't block startup by loading the index here
    # Index will be loaded lazily on first request to keep startup fast

    yield

    # Shutdown
    print("Shutting down Panday Embeddings API...", flush=True)


app = FastAPI(
    title="Panday Embeddings API",
    description="RAG query service using LlamaIndex embeddings",
    version="1.0.0",
    lifespan=lifespan,
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


def load_index(roadmap_id: str):
    """Load the LlamaIndex index from disk (cached)."""
    if roadmap_id in _index_cache:
        return _index_cache[roadmap_id]

    # Use EMBEDDINGS_PATH environment variable (supports both local dev and containerized deployment)
    # In Docker: EMBEDDINGS_PATH=/app/embeddings
    # In local dev: defaults to ../../src/data/embeddings (relative to this file)
    embeddings_root = Path(EMBEDDINGS_PATH)
    if not embeddings_root.is_absolute():
        # If relative path, resolve from this file's location
        embeddings_root = (Path(__file__).parent / embeddings_root).resolve()

    index_path = embeddings_root / roadmap_id / "index"

    if not index_path.exists():
        raise FileNotFoundError(
            f"Index not found at {index_path}. Run embedding generation first."
        )
    print(f"Loading index from {index_path}...", flush=True)

    try:
        # Configure embedding model (must match the model used for generation)
        # Explicitly set device="cpu" since we're running on Railway (CPU servers)
        print(f"Initializing embedding model: {EMBEDDING_MODEL}", flush=True)
        embed_model = HuggingFaceEmbedding(
            model_name=EMBEDDING_MODEL,
            device="cpu",
        )

        # Set global embedding model
        Settings.embed_model = embed_model
        print("✓ Embedding model initialized", flush=True)

        # Load index from storage
        print("Loading vector index from storage...", flush=True)
        storage_context = StorageContext.from_defaults(persist_dir=str(index_path))
        index = load_index_from_storage(storage_context)
        print("✓ Vector index loaded from storage", flush=True)

        _index_cache[roadmap_id] = index
        print(f"✓ Index loaded for {roadmap_id}", flush=True)

        return index
    except Exception as e:
        print(f"ERROR loading index: {e}", flush=True)
        import traceback
        traceback.print_exc()
        raise


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


@app.get("/ready")
async def ready():
    """
    Check if the service is ready to serve queries (model loaded).

    Returns 200 if index is loaded, 503 if not yet loaded.
    Useful for warming up the service after deployment.
    """
    if ROADMAP_ID in _index_cache:
        return {
            "status": "ready",
            "loaded_indexes": list(_index_cache.keys()),
            "message": "Service is ready to serve queries",
        }
    else:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "loaded_indexes": list(_index_cache.keys()),
                "message": f"Index not loaded yet. Make a query to trigger model download.",
            },
        )


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
