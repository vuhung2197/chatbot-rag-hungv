"""Integration test web search (Tavily thật) + live_search node. `-m integration`."""

import pytest

from app.agents.nodes import live_search_node
from app.services.llm import LLMClient
from app.services.web_search import WebSearchClient

pytestmark = pytest.mark.integration


async def test_tavily_search_returns_context():
    web = WebSearchClient()
    if not web.enabled:
        pytest.skip("no TAVILY_API_KEY")
    ctx = await web.search("thời tiết Hà Nội hôm nay")
    assert ctx and len(ctx) > 0


async def test_live_search_node_end_to_end():
    web = WebSearchClient()
    if not web.enabled:
        pytest.skip("no TAVILY_API_KEY")
    out = await live_search_node(
        {"message": "tin tức công nghệ mới nhất", "history": []},
        web=web,
        llm=LLMClient(),
    )
    assert out["source_type"] == "web_search"
    assert out["reply"].strip()
