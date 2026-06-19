"""Unit test /chat — override pipeline bằng fake (không gọi LLM/DB)."""

from fastapi.testclient import TestClient

from app.main import app, pipeline_dep
from app.rag.pipeline import RagResult
from app.rag.retrieval import RetrievedChunk

client = TestClient(app)


class _FakePipeline:
    def __init__(self, result: RagResult):
        self._result = result

    async def answer(self, query, model=None, history=None, **kw):
        return self._result


def _override(result: RagResult):
    app.dependency_overrides[pipeline_dep] = lambda: _FakePipeline(result)


def teardown_function():
    app.dependency_overrides.clear()


def test_chat_with_context():
    _override(
        RagResult(
            reply="RAG là truy hồi [1]",
            citations=[],
            chunks_used=[RetrievedChunk(id=1, title="RAG", content="c", score=0.9)],
            context="[1] RAG\nc",
            has_context=True,
        )
    )
    resp = client.post("/chat", json={"message": "RAG là gì"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["source_type"] == "knowledge"
    assert body["reply"] == "RAG là truy hồi [1]"
    assert body["meta"]["total_chunks"] == 1
    assert "context" not in body["meta"]  # debug=false -> không lộ context


def test_chat_debug_exposes_context():
    _override(
        RagResult(
            reply="x",
            citations=[],
            chunks_used=[RetrievedChunk(id=1, title="t", content="c", score=0.9)],
            context="CTX",
            has_context=True,
        )
    )
    resp = client.post("/chat", json={"message": "hỏi", "debug": True})
    assert resp.json()["meta"]["context"] == "CTX"


def test_chat_no_context_returns_polite():
    _override(RagResult(reply="", citations=[], chunks_used=[], context="", has_context=False))
    resp = client.post("/chat", json={"message": "câu hỏi lạ"})
    assert resp.status_code == 200
    assert resp.json()["source_type"] == "kb_empty"


def test_chat_rejects_empty_message():
    resp = client.post("/chat", json={"message": ""})
    assert resp.status_code == 422  # Pydantic validation


def test_chat_rejects_too_long():
    resp = client.post("/chat", json={"message": "x" * 10001})
    assert resp.status_code == 422
