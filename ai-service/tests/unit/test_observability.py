"""Unit test observability middleware."""

from fastapi.testclient import TestClient

from app.main import agent_dep, app
from app.observability import REQUEST_ID_HEADER

client = TestClient(app)


def test_response_has_request_id_header():
    resp = client.get("/health")
    assert REQUEST_ID_HEADER in resp.headers
    assert len(resp.headers[REQUEST_ID_HEADER]) >= 8


def test_request_id_echoed_when_provided():
    resp = client.get("/health", headers={REQUEST_ID_HEADER: "trace-abc-123"})
    assert resp.headers[REQUEST_ID_HEADER] == "trace-abc-123"


def test_chat_path_also_traced():
    class _FakeAgent:
        async def run(self, message, model=None, history=None, on_token=None, **kw):
            return {
                "reply": "x",
                "source_type": "knowledge",
                "intent": "KNOWLEDGE",
                "citations": [],
                "chunks": [],
            }

    app.dependency_overrides[agent_dep] = lambda: _FakeAgent()
    try:
        resp = client.post("/chat", json={"message": "hi"})
        assert resp.status_code == 200
        assert REQUEST_ID_HEADER in resp.headers
    finally:
        app.dependency_overrides.clear()
