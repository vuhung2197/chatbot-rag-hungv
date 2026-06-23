"""Integration test MCP — Fetch server thật qua stdio. `-m integration`.

Cần `uvx` (uv) + mạng để chạy `uvx mcp-server-fetch`. Tự skip nếu không có uvx.
Chạy: `uv run pytest -m integration tests/integration/test_mcp_live.py`.
"""

import shutil

import pytest

from app.config import MCPServerConfig, Settings
from app.services.mcp_client import McpClient

pytestmark = pytest.mark.integration

_FETCH = MCPServerConfig(name="fetch", transport="stdio", command="uvx mcp-server-fetch")


def _skip_if_no_uvx():
    if shutil.which("uvx") is None:
        pytest.skip("uvx không có — cần uv để chạy mcp-server-fetch")


async def test_fetch_server_discovers_tools():
    _skip_if_no_uvx()
    client = McpClient(settings=Settings(mcp_servers=[_FETCH.model_dump()]))
    tools = await client.list_tools()
    names = {t.name for t in tools}
    assert "fetch" in names  # mcp-server-fetch expose tool 'fetch'


async def test_fetch_tool_returns_content():
    _skip_if_no_uvx()
    client = McpClient(settings=Settings(mcp_servers=[_FETCH.model_dump()]))
    res = await client.call_tool("fetch", "fetch", {"url": "https://example.com"})
    assert res.ok
    assert "example" in res.content.lower()
