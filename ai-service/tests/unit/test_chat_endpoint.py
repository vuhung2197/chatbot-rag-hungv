"""Unit test /chat + /chat/stream — override agent bằng fake (không mạng)."""

from fastapi.testclient import TestClient

from app.main import agent_dep, app

client = TestClient(app)


class _FakeAgent:
    def __init__(self, state, tokens=None):
        self._state = state
        self._tokens = tokens or []

    async def run(self, message, model=None, history=None, on_token=None, **kw):
        if on_token:
            for t in self._tokens:
                on_token(t)
        return self._state


def _override(state, tokens=None):
    app.dependency_overrides[agent_dep] = lambda: _FakeAgent(state, tokens)


def teardown_function():
    app.dependency_overrides.clear()


def test_chat_returns_reply_and_meta():
    _override(
        {
            "reply": "RAG là truy hồi [1]",
            "source_type": "knowledge",
            "intent": "KNOWLEDGE",
            "citations": [{"n": 1, "id": 7, "title": "T"}],
            "chunks": [{"id": 7}],
        }
    )
    resp = client.post("/chat", json={"message": "RAG là gì"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["source_type"] == "knowledge"
    assert body["meta"]["intent"] == "KNOWLEDGE"
    assert body["meta"]["total_chunks"] == 1
    assert body["citations"][0]["id"] == 7


def test_chat_rejects_empty_message():
    resp = client.post("/chat", json={"message": ""})
    assert resp.status_code == 422


def test_chat_rejects_too_long():
    resp = client.post("/chat", json={"message": "x" * 10001})
    assert resp.status_code == 422


def test_chat_stream_emits_token_text_done():
    _override(
        {
            "reply": "a b",
            "source_type": "knowledge",
            "intent": "KNOWLEDGE",
            "citations": [],
            "chunks": [],
        },
        tokens=["a", " b"],
    )
    with client.stream("POST", "/chat/stream", json={"message": "RAG là gì"}) as resp:
        assert resp.status_code == 200
        raw = "".join(resp.iter_text())
    assert '"type": "token"' in raw
    assert '"type": "text"' in raw
    assert '"type": "done"' in raw
    # token deltas xuất hiện
    assert '"content": "a"' in raw
