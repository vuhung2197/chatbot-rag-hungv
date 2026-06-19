"""Integration test RAG pipeline — retrieve + LLM thật. `-m integration`."""

import pytest

from app.rag.pipeline import RagPipeline

pytestmark = pytest.mark.integration


async def test_answer_grounded_with_citations():
    res = await RagPipeline().answer("kiến thức", top_k=3, threshold=0.0, max_tokens=300)
    assert res.has_context is True
    assert res.reply.strip()
    assert len(res.citations) >= 1
    assert len(res.chunks_used) == len(res.citations)
