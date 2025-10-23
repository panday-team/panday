#!/usr/bin/env python3
"""
Generate embeddings for roadmap markdown content using LlamaIndex.

This script reads markdown files from src/data/roadmaps/{roadmap-id}/content/,
generates a LlamaIndex VectorStoreIndex with HuggingFace embeddings,
and persists the index to src/data/embeddings/{roadmap-id}/ for use by the RAG system.
"""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml
from llama_index.core import (
    Document,
    Settings,
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,
)
from llama_index.embeddings.huggingface import HuggingFaceEmbedding


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


def load_roadmap_documents(roadmap_id: str, base_path: Path) -> list[Document]:
    """Load all markdown content files for a roadmap as LlamaIndex Documents."""
    # Look for detailed reference content in embeddings directory
    content_dir = base_path / "src/data/embeddings" / roadmap_id

    if not content_dir.exists():
        raise ValueError(f"Content directory not found: {content_dir}")

    documents = []

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
            metadata={
                "node_id": node_id,
                "roadmap_id": roadmap_id,
                "title": title,
                "type": node_type,
                "file_name": md_file.name,
                **frontmatter,
            },
            # Use node_id as doc_id for easy reference
            doc_id=f"{roadmap_id}:{node_id}",
        )

        documents.append(doc)

    return documents


def create_index(
    documents: list[Document], model_name: str = "BAAI/bge-base-en-v1.5"
) -> VectorStoreIndex:
    """Create a LlamaIndex VectorStoreIndex with HuggingFace embeddings."""
    print(f"\nLoading embedding model: {model_name}...")

    # Configure embedding model
    embed_model = HuggingFaceEmbedding(model_name=model_name)

    # Set global embedding model
    Settings.embed_model = embed_model

    print(f"Creating index from {len(documents)} documents...")
    index = VectorStoreIndex.from_documents(
        documents,
        show_progress=True,
    )

    return index


def persist_index(
    index: VectorStoreIndex,
    roadmap_id: str,
    model_name: str,
    output_path: Path,
):
    """Persist the LlamaIndex index to disk."""
    # Save index to a subdirectory to keep source markdown files separate
    persist_dir = output_path / roadmap_id / "index"
    persist_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nPersisting index to {persist_dir}...")
    index.storage_context.persist(persist_dir=str(persist_dir))

    # Save metadata about the index
    metadata = {
        "model": model_name,
        "roadmapId": roadmap_id,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "documentCount": len(index.docstore.docs),
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
        description="Generate LlamaIndex embeddings for roadmap content"
    )
    parser.add_argument(
        "--roadmap",
        required=True,
        help="Roadmap ID (e.g., electrician-bc)",
    )
    parser.add_argument(
        "--model",
        default="BAAI/bge-base-en-v1.5",
        help="HuggingFace embedding model (default: BAAI/bge-base-en-v1.5)",
    )
    parser.add_argument(
        "--base-path",
        type=Path,
        default=None,
        help="Base project path (default: auto-detect project root)",
    )

    args = parser.parse_args()

    # Auto-detect project root if not specified
    if args.base_path is None:
        args.base_path = find_project_root()

    print(f"=== Generating LlamaIndex Embeddings for {args.roadmap} ===")
    print(f"Project root: {args.base_path}")

    # Load documents
    print(f"\nLoading detailed reference content from src/data/embeddings/{args.roadmap}/...")
    documents = load_roadmap_documents(args.roadmap, args.base_path)
    print(f"Loaded {len(documents)} markdown files")

    # Create index
    index = create_index(documents, args.model)

    # Persist to disk
    output_path = args.base_path / "src/data/embeddings"
    persist_index(index, args.roadmap, args.model, output_path)

    print("\n✓ Embedding generation complete!")
    print(
        f"\nGenerated index saved to: src/data/embeddings/{args.roadmap}/index/"
    )
    print(
        f"Source markdown files remain at: src/data/embeddings/{args.roadmap}/*.md"
    )


if __name__ == "__main__":
    main()
