"""Unit test /chat + /chat/stream — override agent bằng fake (không mạng)."""

from fastapi.testclient import TestClient

from app.main import agent_dep, app

client = TestClient(app)


class _FakeAgent:
    def __init__(self, state, tokens=None):
        self._state = state
        self._tokens = tokens or []
        self.last_kwargs = None

    async def run(self, message, model=None, history=None, on_token=None, **kw):
        self.last_kwargs = {"message": message, **kw}
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


def test_chat_forwards_user_identity_to_agent():
    agent = _FakeAgent(
        {
            "reply": "x",
            "source_type": "user_progress",
            "intent": "USER_PROGRESS",
            "citations": [],
            "chunks": [],
        }
    )
    app.dependency_overrides[agent_dep] = lambda: agent
    try:
        client.post("/chat", json={"message": "tiến độ", "user_id": 42, "auth_token": "jwt-abc"})
        assert agent.last_kwargs["user_id"] == 42
        assert agent.last_kwargs["auth_token"] == "jwt-abc"
    finally:
        app.dependency_overrides.clear()


def test_internal_token_enforced_when_configured(monkeypatch):
    from app import main

    monkeypatch.setattr(main.settings, "internal_api_token", "s3cret")
    _override(
        {
            "reply": "x",
            "source_type": "knowledge",
            "intent": "KNOWLEDGE",
            "citations": [],
            "chunks": [],
        }
    )
    # thiếu header -> 401
    assert client.post("/chat", json={"message": "hi"}).status_code == 401
    # sai header -> 401
    assert (
        client.post(
            "/chat", json={"message": "hi"}, headers={"X-Internal-Token": "wrong"}
        ).status_code
        == 401
    )
    # đúng header -> 200
    ok = client.post("/chat", json={"message": "hi"}, headers={"X-Internal-Token": "s3cret"})
    assert ok.status_code == 200


def test_internal_token_skipped_when_empty():
    # mặc định token rỗng (dev) -> không cần header
    _override(
        {
            "reply": "x",
            "source_type": "knowledge",
            "intent": "KNOWLEDGE",
            "citations": [],
            "chunks": [],
        }
    )
    assert client.post("/chat", json={"message": "hi"}).status_code == 200


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


class _RaisingAgent:
    async def run(self, *a, **k):
        raise RuntimeError("sk-proj-LEAK boom")


def test_chat_returns_structured_error_on_agent_failure():
    # T7/F5 (D1): agent lỗi -> 200 + source_type=error, không 500 trần, không leak.
    app.dependency_overrides[agent_dep] = lambda: _RaisingAgent()
    try:
        r = client.post("/chat", json={"message": "x"})
        assert r.status_code == 200
        body = r.json()
        assert body["source_type"] == "error"
        assert body["reply"]
        assert "sk-proj" not in body["reply"]
        assert "RuntimeError" not in body["reply"]
    finally:
        app.dependency_overrides.clear()
