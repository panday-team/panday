#!/usr/bin/env python3
"""
Generate embeddings for roadmap markdown content using LlamaIndex.

This script reads markdown files from src/data/embeddings/{roadmap-id}/,
generates a LlamaIndex VectorStoreIndex with OpenAI embeddings,
and persists to either JSON files OR Postgres (pgvector).

Supports incremental updates: only regenerates embeddings for new/modified files.
Use --force-rebuild to regenerate all embeddings.
Use --use-postgres to store embeddings in Postgres instead of JSON files.
"""

import argparse
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml
from dotenv import load_dotenv
from llama_index.core import (
    Document,
    Settings,
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,
)
from llama_index.embeddings.openai import OpenAIEmbedding


def find_project_root() -> Path:
    """Find the project root by looking for package.json."""
    current = Path(__file__).parent
    while current != current.parent:
        if (current / "package.json").exists():
            return current
        current = current.parent
    # Fallback to two directories up from script location
    return Path(__file__).parent.parent.parent


def parse_frontmatter(content: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown content."""
    frontmatter_pattern = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
    match = frontmatter_pattern.match(content)

    if match:
        frontmatter_text = match.group(1)
        remaining_content = content[match.end() :]
        frontmatter = yaml.safe_load(frontmatter_text)
        return frontmatter, remaining_content

    return {}, content


def parse_markdown_sections(content: str) -> dict[str, Any]:
    """Extract structured sections from markdown content."""
    sections = {}

    # Extract description (first paragraph after title or Description section)
    desc_pattern = re.compile(
        r"^#[^#].*?\n\n(?:##\s+Description\s*\n\n)?(.*?)(?=\n##|\Z)", re.DOTALL
    )
    desc_match = desc_pattern.search(content)
    if desc_match:
        sections["description"] = desc_match.group(1).strip()

    # Extract list-based sections
    section_patterns = {
        "eligibility": r"##\s+Eligibility\s*\n(.*?)(?=\n##|\Z)",
        "benefits": r"##\s+Benefits\s*\n(.*?)(?=\n##|\Z)",
        "outcomes": r"##\s+Final Outcome\s*\n(.*?)(?=\n##|\Z)",
        "resources": r"##\s+Resources\s*\n(.*?)(?=\n##|\Z)",
    }

    for section_name, pattern in section_patterns.items():
        section_match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if section_match:
            section_text = section_match.group(1)
            # Extract bullet points
            bullets = [
                line.lstrip("- *").strip()
                for line in section_text.split("\n")
                if line.strip().startswith(("-", "*"))
                and "TODO" not in line
                and line.strip()
            ]
            if bullets:
                sections[section_name] = bullets

    return sections


def compute_file_hash(file_path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def get_file_metadata(file_path: Path) -> dict[str, Any]:
    """Get metadata for a file (hash, size, modified time)."""
    stat = file_path.stat()
    return {
        "hash": compute_file_hash(file_path),
        "size": stat.st_size,
        "lastModified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
    }


def load_roadmap_documents(roadmap_id: str, base_path: Path) -> tuple[list[Document], dict[str, dict[str, Any]]]:
    """Load all markdown and PDF content files for a roadmap as LlamaIndex Documents.
    
    Returns:
        tuple of (documents, file_metadata) where file_metadata maps filename to file info
    
    Note: PDF support requires llama-index-readers-file package.
    Install via: pip install llama-index-readers-file
    """
    # Look for detailed reference content in embeddings directory
    content_dir = base_path / "src/data/embeddings" / roadmap_id

    if not content_dir.exists():
        raise ValueError(f"Content directory not found: {content_dir}")

    documents = []
    file_metadata = {}

    # Check if PDF reader is available
    pdf_reader = None
    try:
        from llama_index.readers.file import PDFReader
        pdf_reader = PDFReader()
    except ImportError:
        print("Warning: llama-index-readers-file not installed. PDF files will be skipped.")
        print("Install with: pip install llama-index-readers-file")

    # Process markdown files
    for md_file in sorted(content_dir.glob("*.md")):
        node_id = md_file.stem
        content_text = md_file.read_text(encoding="utf-8")

        frontmatter, body = parse_frontmatter(content_text)
        sections = parse_markdown_sections(body)

        # Build rich text representation for embedding
        text_parts = []

        # Add title
        title = frontmatter.get("title", node_id.replace("-", " ").title())
        text_parts.append(f"Title: {title}")

        # Add node type
        node_type = frontmatter.get("type") or frontmatter.get("nodeType")
        if node_type:
            text_parts.append(f"Type: {node_type}")

        # Add subtitle if present
        if "subtitle" in frontmatter:
            text_parts.append(f"Subtitle: {frontmatter['subtitle']}")

        # Add description
        if "description" in sections:
            text_parts.append(f"\nDescription:\n{sections['description']}")

        # Add structured sections
        if "eligibility" in sections:
            text_parts.append(
                f"\nEligibility Requirements:\n"
                + "\n".join(f"- {item}" for item in sections["eligibility"])
            )

        if "benefits" in sections:
            text_parts.append(
                f"\nBenefits:\n" + "\n".join(f"- {item}" for item in sections["benefits"])
            )

        if "outcomes" in sections:
            text_parts.append(
                f"\nFinal Outcomes:\n"
                + "\n".join(f"- {item}" for item in sections["outcomes"])
            )

        # Combine all parts
        full_text = "\n".join(text_parts)

        # Create LlamaIndex Document with metadata
        doc = Document(
            text=full_text,
            doc_id=f"{roadmap_id}:{node_id}",
        )
        doc.metadata = {
            "node_id": node_id,
            "roadmap_id": roadmap_id,
            "title": title,
            "type": node_type,
            "file_name": md_file.name,
            "file_type": "markdown",
            **frontmatter,
        }

        documents.append(doc)
        file_metadata[md_file.name] = get_file_metadata(md_file)

    # Process PDF files if reader is available
    if pdf_reader:
        for pdf_file in sorted(content_dir.glob("*.pdf")):
            node_id = pdf_file.stem
            
            try:
                # Load PDF using LlamaIndex PDFReader
                pdf_documents = pdf_reader.load_data(file=pdf_file)
                
                # Combine all pages into a single document
                full_text = "\n\n".join(doc.text for doc in pdf_documents)
                
                # Create LlamaIndex Document with metadata
                doc = Document(
                    text=full_text,
                    doc_id=f"{roadmap_id}:{node_id}",
                )
                doc.metadata = {
                    "node_id": node_id,
                    "roadmap_id": roadmap_id,
                    "title": node_id.replace("-", " ").title(),
                    "file_name": pdf_file.name,
                    "file_type": "pdf",
                    "page_count": len(pdf_documents),
                }

                documents.append(doc)
                file_metadata[pdf_file.name] = get_file_metadata(pdf_file)
            except Exception as e:
                print(f"Warning: Failed to process PDF {pdf_file.name}: {e}")

    return documents, file_metadata


def load_existing_metadata(persist_dir: Path) -> dict[str, Any]:
    """Load existing metadata from index directory."""
    metadata_file = persist_dir / "metadata.json"
    if metadata_file.exists():
        with metadata_file.open("r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def detect_changes(
    current_files: dict[str, dict[str, Any]], 
    previous_metadata: dict[str, Any]
) -> tuple[set[str], set[str], set[str]]:
    """Detect which files are new, modified, or deleted.
    
    Returns:
        tuple of (new_files, modified_files, deleted_files)
    """
    previous_files = previous_metadata.get("files", {})
    
    new_files = set(current_files.keys()) - set(previous_files.keys())
    deleted_files = set(previous_files.keys()) - set(current_files.keys())
    
    modified_files = set()
    for filename in set(current_files.keys()) & set(previous_files.keys()):
        if current_files[filename]["hash"] != previous_files[filename].get("hash"):
            modified_files.add(filename)
    
    return new_files, modified_files, deleted_files


def create_index(
    documents: list[Document], model_name: str = "text-embedding-3-small"
) -> VectorStoreIndex:
    """Create a LlamaIndex VectorStoreIndex with OpenAI embeddings."""
    print(f"\nUsing OpenAI embedding model: {model_name}...")

    # Configure embedding model
    embed_model = OpenAIEmbedding(model=model_name)

    # Set global embedding model
    Settings.embed_model = embed_model

    print(f"Creating index from {len(documents)} documents...")
    index = VectorStoreIndex.from_documents(
        documents,
        show_progress=True,
    )

    return index


def load_existing_index(persist_dir: Path) -> VectorStoreIndex:
    """Load existing index from storage."""
    storage_context = StorageContext.from_defaults(persist_dir=str(persist_dir))
    return load_index_from_storage(storage_context)


def update_index_incremental(
    index: VectorStoreIndex,
    documents: list[Document],
    new_files: set[str],
    modified_files: set[str],
    deleted_files: set[str],
    roadmap_id: str,
) -> None:
    """Update index incrementally by adding/updating/deleting files."""
    # Create mapping of doc_id to document
    doc_map = {doc.doc_id: doc for doc in documents}
    
    # Delete removed files
    for filename in deleted_files:
        # Extract node_id from filename
        node_id = Path(filename).stem
        doc_id = f"{roadmap_id}:{node_id}"
        try:
            index.delete(doc_id)
            print(f"  Deleted: {filename}")
        except Exception as e:
            print(f"  Warning: Failed to delete {filename}: {e}")
    
    # Update modified files (delete old, insert new)
    for filename in modified_files:
        node_id = Path(filename).stem
        doc_id = f"{roadmap_id}:{node_id}"
        try:
            index.delete(doc_id)
            if doc_id in doc_map:
                index.insert(doc_map[doc_id])
            print(f"  Updated: {filename}")
        except Exception as e:
            print(f"  Warning: Failed to update {filename}: {e}")
    
    # Insert new files
    for filename in new_files:
        node_id = Path(filename).stem
        doc_id = f"{roadmap_id}:{node_id}"
        try:
            if doc_id in doc_map:
                index.insert(doc_map[doc_id])
            print(f"  Added: {filename}")
        except Exception as e:
            print(f"  Warning: Failed to add {filename}: {e}")


def persist_index(
    index: VectorStoreIndex,
    roadmap_id: str,
    model_name: str,
    output_path: Path,
    file_metadata: dict[str, dict[str, Any]],
):
    """Persist the LlamaIndex index to disk with file tracking metadata."""
    # Save index to a subdirectory to keep source markdown files separate
    persist_dir = output_path / roadmap_id / "index"
    persist_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nPersisting index to {persist_dir}...")
    index.storage_context.persist(persist_dir=str(persist_dir))

    # Save metadata about the index including file tracking
    metadata = {
        "model": model_name,
        "roadmapId": roadmap_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "documentCount": len(index.docstore.docs),
        "files": file_metadata,
    }

    metadata_file = persist_dir / "metadata.json"
    with metadata_file.open("w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Calculate total size
    total_size = sum(f.stat().st_size for f in persist_dir.rglob("*") if f.is_file())

    print(f"\n✓ Persisted index to {persist_dir}")
    print(f"  Model: {model_name}")
    print(f"  Documents: {metadata['documentCount']}")
    print(f"  Total size: {total_size / 1024 / 1024:.2f} MB")


# ==================== Postgres-specific functions ====================

def create_postgres_vector_store(
    roadmap_id: str,
    user_id: Optional[str] = None,
    embed_dim: int = 1536,
):
    """Create a PGVectorStore for storing embeddings in Postgres."""
    from llama_index.vector_stores.postgres import PGVectorStore
    from urllib.parse import urlparse

    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError(
            "DATABASE_URL not found in environment. "
            "Please add it to .env file at project root."
        )

    # Parse the database URL to extract components
    parsed = urlparse(database_url)

    # Create vector store with connection parameters
    # PGVectorStore.from_params expects individual components, not a full URL
    vector_store = PGVectorStore.from_params(
        host=parsed.hostname or "localhost",
        port=parsed.port or 5432,
        database=parsed.path.lstrip('/') if parsed.path else "postgres",
        user=parsed.username,
        password=parsed.password,
        table_name="llamaindex_embeddings",  # Temporary table for LlamaIndex
        embed_dim=embed_dim,
        # hybrid_search=True,  # Enable if you want BM25 + vector hybrid search
    )

    return vector_store


def create_index_with_postgres(
    documents: list[Document],
    roadmap_id: str,
    user_id: Optional[str] = None,
    model_name: str = "text-embedding-3-small",
) -> VectorStoreIndex:
    """Create a LlamaIndex VectorStoreIndex backed by Postgres."""
    print(f"\nUsing OpenAI embedding model: {model_name}...")
    print(f"Storing embeddings in Postgres for roadmap: {roadmap_id}")

    # Configure embedding model
    embed_model = OpenAIEmbedding(model=model_name)
    Settings.embed_model = embed_model

    # Create Postgres vector store
    vector_store = create_postgres_vector_store(
        roadmap_id=roadmap_id,
        user_id=user_id,
        embed_dim=1536,  # text-embedding-3-small dimension
    )

    # Create storage context with Postgres backend
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    print(f"Creating index from {len(documents)} documents...")
    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True,
    )

    return index


def copy_embeddings_to_prisma_tables(
    roadmap_id: str,
    index_id: str,
    documents: list[Document],
    file_metadata: dict[str, dict[str, Any]],
    user_id: Optional[str] = None,
) -> int:
    """
    Copy embeddings from LlamaIndex's temporary table to Prisma schema tables.

    This function:
    1. Queries the llamaindex_embeddings table created by LlamaIndex
    2. Copies vectors to embedding_documents table with proper metadata
    3. Links each document to the parent embedding_indexes record via indexId

    Returns:
        Number of documents inserted
    """
    import psycopg2
    from psycopg2.extras import execute_batch
    import json

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment")

    print("\nCopying embeddings from LlamaIndex table to Prisma schema tables...")

    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()

    try:
        # Query LlamaIndex's temporary table to get all vectors
        # Note: We query ALL rows since LlamaIndex may have multiple roadmaps in the same table
        # We filter by roadmap_id in the metadata to get only the current roadmap's embeddings
        cursor.execute("""
            SELECT node_id, text, metadata_, embedding
            FROM data_llamaindex_embeddings
            WHERE metadata_->>'roadmap_id' = %s
        """, (roadmap_id,))

        llamaindex_rows = cursor.fetchall()

        # If no rows found with roadmap filter, try without filter (for fresh generations)
        if not llamaindex_rows:
            print(f"No rows found with roadmap_id filter, trying without filter...")
            cursor.execute("""
                SELECT node_id, text, metadata_, embedding
                FROM data_llamaindex_embeddings
            """)
            llamaindex_rows = cursor.fetchall()

        if not llamaindex_rows:
            print(f"Warning: No embeddings found in LlamaIndex table for roadmap {roadmap_id}")
            print("This may indicate the LlamaIndex vector store used a different table name.")
            # Fallback: insert from documents directly
            return insert_from_documents_directly(
                cursor, roadmap_id, index_id, documents, file_metadata, user_id
            )

        print(f"Found {len(llamaindex_rows)} embeddings in LlamaIndex table")

        # Prepare batch insert data
        insert_data = []
        now = datetime.now(timezone.utc)

        for llamaindex_node_id, text, metadata, embedding in llamaindex_rows:
            # metadata is already a dict if psycopg2 parsed it correctly
            if isinstance(metadata, str):
                import json as json_module
                metadata = json_module.loads(metadata)

            # Use the LlamaIndex node_id (UUID) as the unique document ID
            # This ensures each chunk gets its own row
            doc_id = llamaindex_node_id

            # Extract the source node_id from metadata (e.g., "electrician-foundation-program")
            source_node_id = metadata.get('node_id')

            # Get file hash from file_metadata
            file_name = metadata.get('file_name', '')
            file_hash = file_metadata.get(file_name, {}).get('hash') if file_name else None

            # Convert embedding to proper format
            # pgvector expects the vector as is (already in correct format from query)
            embedding_value = embedding

            insert_data.append((
                doc_id,                           # id (UUID from LlamaIndex)
                roadmap_id,                       # roadmapId
                source_node_id,                   # nodeId (source file identifier)
                user_id,                          # userId
                text,                             # content
                embedding_value,                  # embedding (vector type)
                json.dumps(metadata),             # metadata (JSONB)
                file_hash,                        # hash
                1,                                # version
                now,                              # createdAt
                now,                              # updatedAt
                index_id,                         # indexId (foreign key)
            ))

        # Batch insert into embedding_documents
        execute_batch(cursor, """
            INSERT INTO embedding_documents (
                id, "roadmapId", "nodeId", "userId", content, embedding,
                metadata, hash, version, "createdAt", "updatedAt", "indexId"
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                metadata = EXCLUDED.metadata,
                hash = EXCLUDED.hash,
                "updatedAt" = EXCLUDED."updatedAt"
        """, insert_data)

        conn.commit()

        print(f"✓ Inserted {len(insert_data)} embeddings into embedding_documents table")
        return len(insert_data)

    except Exception as e:
        conn.rollback()
        print(f"Error copying embeddings: {e}")
        print("Attempting fallback: inserting from documents directly...")

        # Fallback: If LlamaIndex table structure is different, insert from documents
        return insert_from_documents_directly(
            cursor, roadmap_id, index_id, documents, file_metadata, user_id
        )
    finally:
        cursor.close()
        conn.close()


def insert_from_documents_directly(
    cursor,
    roadmap_id: str,
    index_id: str,
    documents: list[Document],
    file_metadata: dict[str, dict[str, Any]],
    user_id: Optional[str] = None,
) -> int:
    """
    Fallback method: Insert documents directly when LlamaIndex table query fails.
    Note: This won't include the actual embeddings - they remain in LlamaIndex table.
    """
    import json
    from psycopg2.extras import execute_batch

    print("Warning: Using fallback method - embeddings will reference LlamaIndex table")

    insert_data = []
    now = datetime.now(timezone.utc)

    for doc in documents:
        # Extract metadata
        node_id = doc.metadata.get('node_id')
        file_name = doc.metadata.get('file_name', '')
        file_hash = file_metadata.get(file_name, {}).get('hash')

        # Generate a placeholder embedding (zero vector) since we can't access the real one
        # The actual embedding remains in llamaindex_embeddings table
        placeholder_embedding = [0.0] * 1536  # text-embedding-3-small dimension

        insert_data.append((
            doc.doc_id,                       # id
            roadmap_id,                       # roadmapId
            node_id,                          # nodeId
            user_id,                          # userId
            doc.text,                         # content
            str(placeholder_embedding),       # embedding (placeholder)
            json.dumps(doc.metadata),         # metadata
            file_hash,                        # hash
            1,                                # version
            now,                              # createdAt
            now,                              # updatedAt
            index_id,                         # indexId
        ))

    execute_batch(cursor, """
        INSERT INTO embedding_documents (
            id, "roadmapId", "nodeId", "userId", content, embedding,
            metadata, hash, version, "createdAt", "updatedAt", "indexId"
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """, insert_data)

    cursor.connection.commit()

    print(f"✓ Inserted {len(insert_data)} document records (with placeholder embeddings)")
    return len(insert_data)


def load_postgres_metadata(roadmap_id: str, user_id: Optional[str] = None) -> dict[str, Any]:
    """Load existing metadata from Postgres embedding_indexes table."""
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            return {}

        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Query for the latest active index for this roadmap/user
        cursor.execute(
            """
            SELECT id, version, "modelName", dimensions, "documentCount", "createdAt"
            FROM embedding_indexes
            WHERE "roadmapId" = %s AND "userId" IS NOT DISTINCT FROM %s AND "isActive" = true
            ORDER BY version DESC
            LIMIT 1
            """,
            (roadmap_id, user_id)
        )

        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result:
            # Load file metadata from embedding_documents table
            conn = psycopg2.connect(database_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)

            cursor.execute(
                """
                SELECT metadata, hash, "updatedAt"
                FROM embedding_documents
                WHERE "indexId" = %s
                """,
                (result['id'],)
            )

            docs = cursor.fetchall()
            cursor.close()
            conn.close()

            # Reconstruct file metadata from documents
            file_metadata = {}
            for doc in docs:
                if doc['metadata'] and 'file_name' in doc['metadata']:
                    file_metadata[doc['metadata']['file_name']] = {
                        'hash': doc['hash'],
                        'lastModified': doc['updatedAt'].isoformat() if doc['updatedAt'] else None,
                    }

            return {
                'model': result['modelName'],
                'roadmapId': roadmap_id,
                'userId': user_id,
                'version': result['version'],
                'documentCount': result['documentCount'],
                'files': file_metadata,
            }

        return {}
    except Exception as e:
        print(f"Warning: Failed to load Postgres metadata: {e}")
        return {}


def persist_postgres_metadata(
    roadmap_id: str,
    model_name: str,
    document_count: int,
    file_metadata: dict[str, dict[str, Any]],
    user_id: Optional[str] = None,
) -> str:
    """Save metadata to Postgres embedding_indexes table and return index ID."""
    import psycopg2
    from psycopg2.extras import RealDictCursor
    import uuid

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment")

    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # Get current version for this roadmap/user
    cursor.execute(
        """
        SELECT COALESCE(MAX(version), 0) as max_version
        FROM embedding_indexes
        WHERE "roadmapId" = %s AND "userId" IS NOT DISTINCT FROM %s
        """,
        (roadmap_id, user_id)
    )

    result = cursor.fetchone()
    next_version = result['max_version'] + 1

    # Deactivate previous indexes
    cursor.execute(
        """
        UPDATE embedding_indexes
        SET "isActive" = false
        WHERE "roadmapId" = %s AND "userId" IS NOT DISTINCT FROM %s
        """,
        (roadmap_id, user_id)
    )

    # Insert new index metadata
    index_id = str(uuid.uuid4())
    cursor.execute(
        """
        INSERT INTO embedding_indexes (
            id, "roadmapId", "userId", version, "modelName", dimensions,
            "documentCount", "isActive", "createdAt", "updatedAt"
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            index_id,
            roadmap_id,
            user_id,
            next_version,
            model_name,
            1536,  # text-embedding-3-small
            document_count,
            True,  # isActive
            datetime.now(timezone.utc),
            datetime.now(timezone.utc),
        )
    )

    conn.commit()
    cursor.close()
    conn.close()

    print(f"\n✓ Persisted index metadata to Postgres")
    print(f"  Index ID: {index_id}")
    print(f"  Version: {next_version}")
    print(f"  Model: {model_name}")
    print(f"  Documents: {document_count}")

    return index_id


def update_index_document_count(index_id: str, actual_count: int) -> None:
    """Update the documentCount in embedding_indexes after copying embeddings."""
    import psycopg2

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment")

    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()

    cursor.execute(
        """
        UPDATE embedding_indexes
        SET "documentCount" = %s, "updatedAt" = %s
        WHERE id = %s
        """,
        (actual_count, datetime.now(timezone.utc), index_id)
    )

    conn.commit()
    cursor.close()
    conn.close()

    print(f"✓ Updated index document count: {actual_count}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate LlamaIndex embeddings for roadmap content (with incremental updates)"
    )
    parser.add_argument(
        "--roadmap",
        required=True,
        help="Roadmap ID (e.g., electrician-bc)",
    )
    parser.add_argument(
        "--model",
        default="text-embedding-3-small",
        help="OpenAI embedding model (default: text-embedding-3-small)",
    )
    parser.add_argument(
        "--base-path",
        type=Path,
        default=None,
        help="Base project path (default: auto-detect project root)",
    )
    parser.add_argument(
        "--force-rebuild",
        action="store_true",
        help="Force full rebuild of all embeddings (skip incremental update)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without making changes",
    )
    parser.add_argument(
        "--use-postgres",
        action="store_true",
        help="Store embeddings in Postgres (pgvector) instead of JSON files",
    )
    parser.add_argument(
        "--user-id",
        type=str,
        default=None,
        help="User ID for user-specific indexes (optional, for multi-tenant support)",
    )

    args = parser.parse_args()

    # Auto-detect project root if not specified
    if args.base_path is None:
        args.base_path = find_project_root()

    # Load environment variables from .env at project root
    env_path = args.base_path / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment from {env_path}")
    
    # Verify OpenAI API key is available
    if not os.getenv("OPENAI_API_KEY"):
        raise ValueError(
            "OPENAI_API_KEY not found in environment. "
            "Please add it to .env file at project root."
        )

    print(f"=== Generating LlamaIndex Embeddings for {args.roadmap} ===")
    print(f"Project root: {args.base_path}")
    print(f"Storage backend: {'Postgres (pgvector)' if args.use_postgres else 'JSON files'}")
    if args.user_id:
        print(f"User-specific index for user: {args.user_id}")

    # Load documents and get file metadata
    print(f"\nLoading content from src/data/embeddings/{args.roadmap}/...")
    documents, file_metadata = load_roadmap_documents(args.roadmap, args.base_path)

    # Count file types
    md_count = sum(1 for d in documents if d.metadata.get("file_type") == "markdown")
    pdf_count = sum(1 for d in documents if d.metadata.get("file_type") == "pdf")
    print(f"Found {len(documents)} files ({md_count} markdown, {pdf_count} PDF)")

    if args.use_postgres:
        # ========== Postgres backend ==========
        # Check for existing index in Postgres
        if not args.force_rebuild:
            print("\n--- Checking for file changes (incremental mode) ---")
            existing_metadata = load_postgres_metadata(args.roadmap, args.user_id)

            if existing_metadata:
                new_files, modified_files, deleted_files = detect_changes(
                    file_metadata, existing_metadata
                )
                total_changes = len(new_files) + len(modified_files) + len(deleted_files)

                if total_changes == 0:
                    print("✓ All files unchanged. No embeddings to regenerate.")
                    return

                print(f"Changes detected:")
                if new_files:
                    print(f"  New files: {', '.join(new_files)}")
                if modified_files:
                    print(f"  Modified files: {', '.join(modified_files)}")
                if deleted_files:
                    print(f"  Deleted files: {', '.join(deleted_files)}")

                if args.dry_run:
                    print("\n[DRY RUN] Would perform the above changes.")
                    return

                print("\nNote: Incremental updates not yet implemented for Postgres backend.")
                print("Performing full rebuild...")

        # Create index with Postgres backend
        if args.force_rebuild:
            print("\n--- Force rebuild mode ---")
        else:
            print("\n--- Creating new index ---")

        if args.dry_run:
            print("[DRY RUN] Would create new index with all documents in Postgres.")
            return

        # Step 1: Create index with Postgres backend (generates embeddings in LlamaIndex table)
        index = create_index_with_postgres(
            documents,
            roadmap_id=args.roadmap,
            user_id=args.user_id,
            model_name=args.model,
        )

        # Step 2: Create index metadata record (with initial document count)
        index_id = persist_postgres_metadata(
            roadmap_id=args.roadmap,
            model_name=args.model,
            document_count=len(documents),
            file_metadata=file_metadata,
            user_id=args.user_id,
        )

        # Step 3: Copy embeddings from LlamaIndex table to Prisma embedding_documents table
        actual_doc_count = copy_embeddings_to_prisma_tables(
            roadmap_id=args.roadmap,
            index_id=index_id,
            documents=documents,
            file_metadata=file_metadata,
            user_id=args.user_id,
        )

        # Step 4: Update document count with actual number copied
        update_index_document_count(index_id, actual_doc_count)

        print("\n✓ Embedding generation complete!")
        print(f"Embeddings stored in Postgres for roadmap: {args.roadmap}")
        print(f"Total embeddings: {actual_doc_count}")
        if args.user_id:
            print(f"User-specific index for: {args.user_id}")
    else:
        # ========== JSON file backend (legacy) ==========
        output_path = args.base_path / "src/data/embeddings"
        persist_dir = output_path / args.roadmap / "index"

        new_files = set()
        modified_files = set()
        deleted_files = set()

        if persist_dir.exists() and not args.force_rebuild:
            print("\n--- Checking for file changes (incremental mode) ---")
            existing_metadata = load_existing_metadata(persist_dir)
            new_files, modified_files, deleted_files = detect_changes(file_metadata, existing_metadata)

            total_changes = len(new_files) + len(modified_files) + len(deleted_files)

            if total_changes == 0:
                print("✓ All files unchanged. No embeddings to regenerate.")
                return

            print(f"Changes detected:")
            if new_files:
                print(f"  New files: {', '.join(new_files)}")
            if modified_files:
                print(f"  Modified files: {', '.join(modified_files)}")
            if deleted_files:
                print(f"  Deleted files: {', '.join(deleted_files)}")

            if args.dry_run:
                print("\n[DRY RUN] Would perform the above changes.")
                return

            # Load existing index and update incrementally
            print("\nLoading existing index for incremental update...")
            index = load_existing_index(persist_dir)

            print("Updating index with changes...")
            update_index_incremental(
                index,
                documents,
                new_files,
                modified_files,
                deleted_files,
                args.roadmap,
            )
        else:
            # Full rebuild
            if args.force_rebuild:
                print("\n--- Force rebuild mode ---")
                print(f"Regenerating embeddings for all {len(documents)} files...")
            else:
                print("\n--- Creating new index ---")

            if args.dry_run:
                print("[DRY RUN] Would create new index with all documents.")
                return

            # Create index
            index = create_index(documents, args.model)

        # Persist to disk
        persist_index(index, args.roadmap, args.model, output_path, file_metadata)

        print("\n✓ Embedding generation complete!")
        print(
            f"\nGenerated index saved to: src/data/embeddings/{args.roadmap}/index/"
        )
        print(
            f"Source files remain at: src/data/embeddings/{args.roadmap}/ (*.md, *.pdf)"
        )


if __name__ == "__main__":
    main()
