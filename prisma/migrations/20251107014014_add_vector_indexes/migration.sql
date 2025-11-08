-- Add HNSW vector index for efficient similarity search on embeddings
-- HNSW (Hierarchical Navigable Small World) is optimized for high-dimensional vectors
-- Using cosine distance (vector_cosine_ops) which is standard for semantic search
-- m=16 controls the number of connections per layer (higher = better recall, more memory)
-- ef_construction=64 controls build-time quality (higher = better index, slower build)
CREATE INDEX embedding_documents_embedding_idx ON embedding_documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (uncomment if HNSW is too slow/memory-intensive)
-- IVFFlat divides space into Voronoi cells, faster build but lower recall
-- CREATE INDEX embedding_documents_embedding_idx ON embedding_documents
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);