#!/usr/bin/env python3
"""Simple command-line chat assistant backed by a LlamaIndex VectorStoreIndex."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable

import chromadb
from chromadb.errors import NotFoundError
from llama_index.core import Settings, StorageContext, VectorStoreIndex, load_index_from_storage
from llama_index.core.chat_engine import ContextChatEngine
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI

from chroma_store import PatchedChromaVectorStore


COLLECTION_NAME = "llama_index_docs"


def has_docstore(persist_dir: Path) -> bool:
    """Return True when docstore persistence exists."""
    return (persist_dir / "docstore.json").exists()


def has_chroma_store(chroma_dir: Path) -> bool:
    """Return True when the Chroma persistence directory contains data."""
    return (chroma_dir / "chroma.sqlite3").exists()


def configure_models(llm_model: str, embed_model: str) -> None:
    """Configure global LlamaIndex settings for the chosen LLM and embed model."""
    Settings.llm = OpenAI(model=llm_model)
    Settings.embed_model = OpenAIEmbedding(model=embed_model)


def create_storage_context(persist_dir: Path, chroma_dir: Path) -> StorageContext:
    """Create storage context pointing at the persistent Chroma vector store."""
    if not persist_dir.exists() or not has_docstore(persist_dir):
        raise FileNotFoundError(
            f"No index metadata found at {persist_dir}. "
            "Run incremental_index.py to build the index before chatting."
        )

    if not has_chroma_store(chroma_dir):
        raise FileNotFoundError(
            f"No Chroma vector store found at {chroma_dir}. "
            "Run incremental_index.py to build the index before chatting."
        )

    client = chromadb.PersistentClient(path=str(chroma_dir))
    try:
        collection = client.get_collection(COLLECTION_NAME)
    except NotFoundError as exc:
        raise RuntimeError(
            f"Chroma collection missing in {chroma_dir}. "
            "Run incremental_index.py to (re)build the index."
        ) from exc

    vector_store = PatchedChromaVectorStore(chroma_collection=collection)
    return StorageContext.from_defaults(
        persist_dir=str(persist_dir),
        vector_store=vector_store,
    )


def load_existing_index(persist_dir: Path, chroma_dir: Path) -> VectorStoreIndex:
    """Load the persisted index or raise a helpful error if missing or invalid."""
    storage_ctx = create_storage_context(persist_dir, chroma_dir)
    return load_index_from_storage(storage_ctx)


def print_sources(nodes: Iterable, limit: int) -> None:
    """Emit the most relevant source snippets for the user."""
    shown_any = False
    for i, node_with_score in enumerate(nodes):
        if i >= limit:
            break

        node = getattr(node_with_score, "node", node_with_score)
        metadata = getattr(node, "metadata", {}) or {}
        source = (
            metadata.get("file_path")
            or metadata.get("source")
            or getattr(node, "ref_doc_id", "Unknown source")
        )

        raw_text = getattr(node, "text", "") or getattr(node, "get_content", lambda: "")()
        snippet = " ".join(raw_text.strip().split())
        if not snippet:
            snippet = "[empty snippet]"

        score = getattr(node_with_score, "score", None)
        score_display = f" (score={score:.3f})" if isinstance(score, (int, float)) else ""
        print(f"- {source}{score_display}: {snippet[:160]}")
        shown_any = True

    if shown_any:
        print()


def chat_loop(chat_engine, show_sources: bool, source_count: int) -> None:
    """Run an interactive REPL loop for chatting."""
    print("Type your question and press Enter. Use ':exit' or Ctrl-D to quit.\n")
    while True:
        try:
            user_input = input("You> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            return

        if not user_input:
            continue
        if user_input.lower() in {":exit", "exit", "quit", ":quit"}:
            print("Goodbye!")
            return

        response = chat_engine.chat(user_input)
        print(f"\nAssistant> {response.response}\n")

        if show_sources:
            source_nodes = getattr(response, "source_nodes", None) or []
            if source_nodes:
                print_sources(source_nodes, source_count)
            else:
                print("No supporting sources were retrieved from the index.\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Chat with a local document index using LlamaIndex."
    )
    parser.add_argument(
        "--storage-dir",
        type=Path,
        default=Path("./storage"),
        help="Directory where the index is persisted.",
    )
    parser.add_argument(
        "--chroma-dir",
        type=Path,
        default=Path("./storage/chroma_db"),
        help="Directory where the persistent Chroma vector store lives.",
    )
    parser.add_argument(
        "--llm-model",
        default="gpt-4o-mini",
        help="OpenAI chat model identifier used for responses.",
    )
    parser.add_argument(
        "--embed-model",
        default="text-embedding-3-small",
        help="OpenAI embedding model identifier used for indexing.",
    )
    parser.add_argument(
        "--system-prompt",
        default="You are a helpful assistant that grounds answers in the provided documents.",
        help="System prompt passed to the chat engine.",
    )
    parser.add_argument(
        "--show-sources",
        action="store_true",
        help="Display source snippets used to produce each answer.",
    )
    parser.add_argument(
        "--source-count",
        type=int,
        default=3,
        help="Maximum number of source snippets to display when --show-sources is set.",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=4,
        help="Number of top-matching nodes retrieved from the index per turn.",
    )
    parser.add_argument(
        "--doc-filter",
        default=None,
        help="Limit retrieval to documents whose ID contains this substring.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    configure_models(args.llm_model, args.embed_model)
    try:
        index = load_existing_index(args.storage_dir, args.chroma_dir)
    except Exception as exc:
        sys.exit(str(exc))

    doc_ids = list(index.docstore.docs.keys())
    retriever_kwargs = {"similarity_top_k": args.top_k}
    if args.doc_filter:
        filtered_ids = [doc_id for doc_id in doc_ids if args.doc_filter in doc_id]
        if not filtered_ids:
            sys.exit(
                f"No documents in the store match substring '{args.doc_filter}'. "
                "Try a different filter or rebuild the index."
            )
        retriever_kwargs["doc_ids"] = filtered_ids

    retriever = index.as_retriever(**retriever_kwargs)
    chat_engine = ContextChatEngine.from_defaults(
        retriever=retriever,
        system_prompt=args.system_prompt,
        llm=Settings.llm,
        verbose=False,
    )

    chat_loop(chat_engine, args.show_sources, args.source_count)


if __name__ == "__main__":
    main()