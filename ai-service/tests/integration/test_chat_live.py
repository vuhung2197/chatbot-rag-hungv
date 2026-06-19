"""Integration test /chat — pipeline + LLM + DB thật. `-m integration`.

Dùng httpx.AsyncClient (cùng event loop pytest) thay TestClient để tương thích
với fixture đóng pool ở conftest (TestClient chạy app ở loop riêng -> lỗi teardown).
"""

import httpx
import pytest

from app.main import app

pytestmark = pytest.mark.integration


async def test_chat_knowledge_grounded():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/chat", json={"message": "kiến thức", "debug": True})
    assert resp.status_code == 200
    body = resp.json()
    assert body["source_type"] in ("knowledge", "kb_empty")
    if body["source_type"] == "knowledge":
        assert body["reply"].strip()
        assert body["meta"]["total_chunks"] >= 1
        assert "context" in body["meta"]
