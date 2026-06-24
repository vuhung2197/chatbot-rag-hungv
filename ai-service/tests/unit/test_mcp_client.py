"""Unit test T2 — MCP client layer (F1, F5.1/5.2). Offline: fake session_factory.

Kiểm: discover tool; call ok; timeout -> lỗi có cấu trúc; allowlist reject server lạ;
connection lỗi -> degrade (bỏ qua server); 0 server -> rỗng.
"""

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass

from app.config import Settings
from app.services.mcp_client import McpClient


@dataclass
class _FakeTool:
    name: str
    description: str
    inputSchema: dict


@dataclass
class _FakeContent:
    text: str


class _FakeListResult:
    def __init__(self, tools):
        self.tools = tools


class _FakeCallResult:
    def __init__(self, content):
        self.content = content


class _FakeSession:
    def __init__(self, tools=None, call_text="ok", call_sleep=0.0, call_raises=False):
        self._tools = tools or []
        self._call_text = call_text
        self._call_sleep = call_sleep
        self._call_raises = call_raises

    async def list_tools(self):
        return _FakeListResult(self._tools)

    async def call_tool(self, name, args):
        if self._call_sleep:
            await asyncio.sleep(self._call_sleep)
        if self._call_raises:
            raise RuntimeError("boom")
        return _FakeCallResult([_FakeContent(self._call_text)])


def _factory_for(sessions, fail_servers=()):
    @asynccontextmanager
    async def factory(server):
        if server.name in fail_servers:
            raise ConnectionError("cannot connect")
        yield sessions[server.name]

    return factory


def _settings(servers):
    return Settings(mcp_servers=servers)


_FETCH = {"name": "fetch", "transport": "stdio", "command": "uvx mcp-server-fetch"}


async def test_list_tools_aggregates():
    sess = _FakeSession(tools=[_FakeTool("fetch", "Fetch URL", {"type": "object"})])
    client = McpClient(settings=_settings([_FETCH]), session_factory=_factory_for({"fetch": sess}))
    tools = await client.list_tools()
    assert len(tools) == 1
    assert tools[0].server == "fetch" and tools[0].name == "fetch"
    assert tools[0].input_schema == {"type": "object"}


async def test_call_tool_ok():
    sess = _FakeSession(call_text="hello world")
    client = McpClient(settings=_settings([_FETCH]), session_factory=_factory_for({"fetch": sess}))
    r = await client.call_tool("fetch", "fetch", {"url": "http://x"})
    assert r.ok and "hello world" in r.content


async def test_call_tool_timeout_returns_structured_error():
    sess = _FakeSession(call_sleep=0.2)
    client = McpClient(settings=_settings([_FETCH]), session_factory=_factory_for({"fetch": sess}))
    client._timeout = 0.05
    r = await client.call_tool("fetch", "fetch", {})
    assert not r.ok and "timeout" in r.error


async def test_call_tool_rejects_unknown_server():
    client = McpClient(
        settings=_settings([_FETCH]), session_factory=_factory_for({"fetch": _FakeSession()})
    )
    r = await client.call_tool("evil", "x", {})
    assert not r.ok and "không cho phép" in r.error


async def test_list_tools_degrades_on_connection_error():
    client = McpClient(
        settings=_settings([_FETCH]), session_factory=_factory_for({}, fail_servers={"fetch"})
    )
    assert await client.list_tools() == []


async def test_no_servers_returns_empty():
    client = McpClient(settings=_settings([]), session_factory=_factory_for({}))
    assert await client.list_tools() == []


async def test_call_tool_logs_observability(caplog):
    import logging

    sess = _FakeSession(call_text="ok")
    client = McpClient(settings=_settings([_FETCH]), session_factory=_factory_for({"fetch": sess}))
    with caplog.at_level(logging.INFO):
        await client.call_tool("fetch", "fetch", {})
    assert any("MCP tool 'fetch/fetch' ok" in r.getMessage() for r in caplog.records)
