#!/usr/bin/env python3
"""
Generate embeddings for roadmap markdown content using LlamaIndex.

This script reads markdown files from src/data/embeddings/{roadmap-id}/,
generates a LlamaIndex VectorStoreIndex with OpenAI embeddings,
and persists the index to src/data/embeddings/{roadmap-id}/index/ for use by the RAG system.

Supports incremental updates: only regenerates embeddings for new/modified files.
Use --force-rebuild to regenerate all embeddings.
"""

import argparse
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

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

    # Load documents and get file metadata
    print(f"\nLoading content from src/data/embeddings/{args.roadmap}/...")
    documents, file_metadata = load_roadmap_documents(args.roadmap, args.base_path)
    
    # Count file types
    md_count = sum(1 for d in documents if d.metadata.get("file_type") == "markdown")
    pdf_count = sum(1 for d in documents if d.metadata.get("file_type") == "pdf")
    print(f"Found {len(documents)} files ({md_count} markdown, {pdf_count} PDF)")

    # Check if index exists and detect changes
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
