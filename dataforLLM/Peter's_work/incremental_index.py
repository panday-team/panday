#!/usr/bin/env python3
"""Incrementally build and persist a VectorStoreIndex for documents in ./data."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import chromadb
from llama_index.core import (
    Settings,
    SimpleDirectoryReader,
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,
)
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.core.storage.index_store import SimpleIndexStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI

from chroma_store import PatchedChromaVectorStore


COLLECTION_NAME = "llama_index_docs"


def has_docstore(persist_dir: Path) -> bool:
    """Return True when docstore persistence exists."""
    return (persist_dir / "docstore.json").exists()


def has_chroma_store(chroma_dir: Path) -> bool:
    """Determine if the Chroma persistence directory already contains data."""
    return (chroma_dir / "chroma.sqlite3").exists()


def configure_models(llm_model: str, embed_model: str) -> None:
    """Set the global LlamaIndex models used for chat + embeddings."""
    Settings.llm = OpenAI(model=llm_model)
    Settings.embed_model = OpenAIEmbedding(model=embed_model)


def create_storage_context(
    persist_dir: Path, chroma_dir: Path, *, expect_existing: bool
) -> StorageContext:
    """Create a storage context backed by a persistent Chroma vector store."""
    chroma_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_dir))
    collection = client.get_or_create_collection(name=COLLECTION_NAME)
    vector_store = PatchedChromaVectorStore(chroma_collection=collection)
    if expect_existing:
        return StorageContext.from_defaults(
            vector_store=vector_store,
            persist_dir=str(persist_dir),
        )

    persist_dir.mkdir(parents=True, exist_ok=True)
    return StorageContext.from_defaults(
        docstore=SimpleDocumentStore(),
        index_store=SimpleIndexStore(),
        vector_store=vector_store,
        persist_dir=str(persist_dir),
    )


def load_existing_index(persist_dir: Path, chroma_dir: Path) -> VectorStoreIndex | None:
    """Return a stored index if it exists, otherwise None."""
    if (
        not persist_dir.exists()
        or not has_docstore(persist_dir)
        or not has_chroma_store(chroma_dir)
    ):
        return None

    storage_ctx = create_storage_context(persist_dir, chroma_dir, expect_existing=True)
    return load_index_from_storage(storage_ctx)


def collect_existing_doc_ids(index: VectorStoreIndex) -> set[str]:
    """Gather document identifiers already present in the index."""
    if not index:
        return set()

    docstore = index.docstore

    # First try to use the public helper if available.
    get_hashes = getattr(docstore, "get_all_document_hashes", None)
    if callable(get_hashes):
        return set(get_hashes().keys())

    docs_attr = getattr(docstore, "docs", None)
    if isinstance(docs_attr, dict):
        return set(docs_attr.keys())

    return set()


def insert_new_documents(index: VectorStoreIndex, data_dir: Path) -> int:
    """Insert any documents that are not yet indexed. Returns count of new docs."""
    reader = SimpleDirectoryReader(
        input_dir=str(data_dir),
        recursive=True,
        filename_as_id=True,  # keeps doc_id stable across runs for incremental updates
    )
    docs = reader.load_data()
    if not docs:
        raise ValueError(f"No documents found in {data_dir}")

    existing_ids = collect_existing_doc_ids(index)
    new_docs = [doc for doc in docs if doc.doc_id not in existing_ids]

    if not new_docs:
        return 0

    for doc in new_docs:
        index.insert(doc)

    print("Added documents:")
    for doc in new_docs:
        print(f" - {doc.doc_id}")

    return len(new_docs)


def build_fresh_index(data_dir: Path, persist_dir: Path, chroma_dir: Path) -> VectorStoreIndex:
    """Create a brand-new index and persist it."""
    reader = SimpleDirectoryReader(
        input_dir=str(data_dir),
        recursive=True,
        filename_as_id=True,
    )
    docs = reader.load_data()
    if not docs:
        raise ValueError(f"No documents found in {data_dir}")

    storage_ctx = create_storage_context(persist_dir, chroma_dir, expect_existing=False)
    index = VectorStoreIndex.from_documents(docs, storage_context=storage_ctx)
    storage_ctx.persist(persist_dir=str(persist_dir))
    return index


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Incrementally index documents and persist the VectorStoreIndex."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("./data"),
        help="Directory containing source documents to index.",
    )
    parser.add_argument(
        "--storage-dir",
        type=Path,
        default=Path("./storage"),
        help="Directory where the index is stored.",
    )
    parser.add_argument(
        "--chroma-dir",
        type=Path,
        default=Path("./storage/chroma_db"),
        help="Directory used by the persistent Chroma vector store.",
    )
    parser.add_argument(
        "--llm-model",
        default="gpt-4o-mini",
        help="OpenAI chat model identifier (needed for Settings compatibility).",
    )
    parser.add_argument(
        "--embed-model",
        default="text-embedding-3-small",
        help="Embedding model used when adding new documents.",
    )
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Delete existing index storage and rebuild everything from scratch.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    configure_models(args.llm_model, args.embed_model)

    if not args.data_dir.exists():
        sys.exit(f"Data directory does not exist: {args.data_dir}")

    if args.rebuild:
        print("Rebuilding index from scratch...")
        if args.storage_dir.exists():
            shutil.rmtree(args.storage_dir)
        if args.chroma_dir.exists():
            shutil.rmtree(args.chroma_dir)
        index = build_fresh_index(args.data_dir, args.storage_dir, args.chroma_dir)
        print(f"Indexed {len(collect_existing_doc_ids(index))} documents.")
        return

    index = load_existing_index(args.storage_dir, args.chroma_dir)

    if index is None:
        if args.storage_dir.exists() or args.chroma_dir.exists():
            print("Existing index storage missing required files. Resetting...")
            if args.storage_dir.exists():
                shutil.rmtree(args.storage_dir)
            if args.chroma_dir.exists():
                shutil.rmtree(args.chroma_dir)
        print("No existing index found. Building a new one...")
        index = build_fresh_index(args.data_dir, args.storage_dir, args.chroma_dir)
        print(f"Indexed {len(collect_existing_doc_ids(index))} documents.")
        return

    try:
        added = insert_new_documents(index, args.data_dir)
    except ValueError as exc:
        sys.exit(str(exc))

    if added == 0:
        print("No new documents to index. Storage remains unchanged.")
        return

    index.storage_context.persist(persist_dir=str(args.storage_dir))
    print(f"Indexed {added} new document(s) and persisted storage to {args.storage_dir}.")


if __name__ == "__main__":
    main()