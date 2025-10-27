"""Custom Chroma vector store guard that tolerates empty metadata filters."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

from llama_index.core.schema import MetadataMode, TextNode
from llama_index.core.vector_stores.types import (
    VectorStoreQuery,
    VectorStoreQueryResult,
)
from llama_index.core.vector_stores.utils import (
    legacy_metadata_dict_to_node,
    metadata_dict_to_node,
)
from llama_index.core.utils import truncate_text
from llama_index.vector_stores.chroma.base import (
    ChromaVectorStore,
    _to_chroma_filter,
    logger,
)


def _normalize_where(where: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Return None for empty where clauses to satisfy Chroma validation."""
    if not where:
        return None
    if isinstance(where, dict) and all(
        key.startswith("chroma:") for key in where.keys()
    ):
        # Allow Chroma-internal metadata-only filters.
        return where
    return where


class PatchedChromaVectorStore(ChromaVectorStore):
    """Small patch around ChromaVectorStore to skip empty where payloads."""

    def query(self, query: VectorStoreQuery, **kwargs: Any) -> VectorStoreQueryResult:
        if query.filters is not None:
            if "where" in kwargs:
                raise ValueError(
                    "Cannot specify metadata filters via both query and kwargs. "
                    "Use kwargs only for chroma specific items that are "
                    "not supported via the generic query interface."
                )
            where = _to_chroma_filter(query.filters)
        else:
            where = kwargs.pop("where", None)

        where = _normalize_where(where)

        if not query.query_embedding:
            return self._get_with_optional_where(
                limit=query.similarity_top_k, where=where, **kwargs
            )

        return self._query_with_optional_where(
            query_embeddings=query.query_embedding,
            n_results=query.similarity_top_k,
            where=where,
            **kwargs,
        )

    def _query_with_optional_where(
        self,
        query_embeddings: List["float"],
        n_results: int,
        where: Optional[Dict[str, Any]],
        **kwargs: Any,
    ) -> VectorStoreQueryResult:
        results = self._collection.query(
            query_embeddings=query_embeddings,
            n_results=n_results,
            where=where,
            **kwargs,
        )

        logger.debug(f"> Top {len(results['documents'][0])} nodes:")
        nodes = []
        similarities = []
        ids = []
        for node_id, text, metadata, distance in zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            try:
                node = metadata_dict_to_node(metadata)
                node.set_content(text)
            except Exception:
                metadata, node_info, relationships = legacy_metadata_dict_to_node(
                    metadata
                )

                node = TextNode(
                    text=text,
                    id_=node_id,
                    metadata=metadata,
                    start_char_idx=node_info.get("start", None),
                    end_char_idx=node_info.get("end", None),
                    relationships=relationships,
                )

            nodes.append(node)

            similarity_score = math.exp(-distance)
            similarities.append(similarity_score)

            logger.debug(
                f"> [Node {node_id}] [Similarity score: {similarity_score}] "
                f"{truncate_text(str(text), 100)}"
            )
            ids.append(node_id)

        return VectorStoreQueryResult(nodes=nodes, similarities=similarities, ids=ids)

    def _get_with_optional_where(
        self,
        limit: Optional[int],
        where: Optional[Dict[str, Any]],
        **kwargs: Any,
    ) -> VectorStoreQueryResult:
        results = self._collection.get(
            limit=limit,
            where=where,
            **kwargs,
        )

        logger.debug(f"> Top {len(results['documents'])} nodes:")
        nodes = []
        ids = []

        if not results["ids"]:
            results["ids"] = [[]]

        for node_id, text, metadata in zip(
            results["ids"], results["documents"], results["metadatas"]
        ):
            try:
                node = metadata_dict_to_node(metadata)
                node.set_content(text)
            except Exception:
                metadata, node_info, relationships = legacy_metadata_dict_to_node(
                    metadata
                )

                node = TextNode(
                    text=text,
                    id_=node_id,
                    metadata=metadata,
                    start_char_idx=node_info.get("start", None),
                    end_char_idx=node_info.get("end", None),
                    relationships=relationships,
                )

            nodes.append(node)

            logger.debug(
                f"> [Node {node_id}] [Similarity score: N/A - using get()] "
                f"{truncate_text(str(text), 100)}"
            )
            ids.append(node_id)

        return VectorStoreQueryResult(nodes=nodes, ids=ids)