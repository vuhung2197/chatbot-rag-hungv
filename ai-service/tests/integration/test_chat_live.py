"""Integration test /chat + /chat/stream — agent + LLM + DB thật. `-m integration`."""

import httpx
import pytest

from app.main import app

pytestmark = pytest.mark.integration


async def test_chat_knowledge_routes_and_answers():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/chat", json={"message": "kiến thức"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["intent"] in (
        "KNOWLEDGE",
        "LIVE_SEARCH",
        "GREETING",
        "USER_PROGRESS",
        "OFF_TOPIC",
    )
    assert body["reply"].strip()


async def test_chat_stream_yields_events():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        async with client.stream("POST", "/chat/stream", json={"message": "kiến thức"}) as resp:
            assert resp.status_code == 200
            raw = "".join([chunk async for chunk in resp.aiter_text()])
    assert '"type": "done"' in raw
    assert '"type": "text"' in raw
