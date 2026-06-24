"""Integration test retrieval — embed thật + pgvector thật. `-m integration`."""

import pytest

from app.rag.retrieval import Retriever
from app.services.embeddings import EmbeddingClient

pytestmark = pytest.mark.integration


async def test_embed_dimension_1536():
    vec = await EmbeddingClient().embed("xin chào")
    assert len(vec) == 1536  # text-embedding-3-small


async def test_retrieve_returns_ordered_chunks():
    chunks = await Retriever().retrieve("kiến thức", top_k=5, threshold=0.0)
    assert len(chunks) >= 1
    # điểm giảm dần (gần nhất trước) và nằm trong [0, 1]
    scores = [c.score for c in chunks]
    assert scores == sorted(scores, reverse=True)
    assert all(0.0 <= s <= 1.0 + 1e-6 for s in scores)


async def test_threshold_filters():
    high = await Retriever().retrieve("kiến thức", top_k=10, threshold=0.99)
    low = await Retriever().retrieve("kiến thức", top_k=10, threshold=0.0)
    assert len(high) <= len(low)
