"""Unit test T6 — bảo mật MCP (F5). Khoá: allowlist, không cho client điều khiển
endpoint, secret là tên-env (không phải giá trị), tool lạ không bị thực thi.
"""

from app.agents.nodes import agentic_node
from app.config import MCPServerConfig, Settings
from app.schemas import ChatRequest
from app.services.llm import LLMMessage, ToolCall
from app.services.mcp_client import McpClient, ToolDef, ToolResult

_SRV = {"name": "fetch", "transport": "stdio", "command": "uvx mcp-server-fetch"}


def test_chatrequest_has_no_client_controlled_mcp_endpoint():
    # Client KHÔNG được chỉ định server/endpoint/command MCP qua request body (chặn SSRF).
    fields = set(ChatRequest.model_fields)
    assert not (
        fields & {"mcp_servers", "mcp_endpoint", "mcp_command", "server", "endpoint", "command"}
    )


def test_serverconfig_holds_env_name_not_secret():
    # Secret chỉ tham chiếu TÊN biến môi trường, không lưu giá trị key trong config.
    fields = set(MCPServerConfig.model_fields)
    assert "api_key_env" in fields
    assert "api_key" not in fields and "token" not in fields


async def test_call_tool_rejects_server_not_in_allowlist():
    called = {"n": 0}

    def factory(server):  # phải KHÔNG được gọi cho server ngoài allowlist
        called["n"] += 1
        raise AssertionError("không được mở session cho server lạ")

    client = McpClient(settings=Settings(mcp_servers=[_SRV]), session_factory=factory)
    r = await client.call_tool("evil", "x", {})
    assert not r.ok and "không cho phép" in r.error
    assert called["n"] == 0


class _FakeMcp:
    def __init__(self, tools):
        self._tools = tools
        self.calls = []

    async def list_tools(self):
        return self._tools

    async def call_tool(self, server, name, args):
        self.calls.append((server, name, args))
        return ToolResult(ok=True, content="x")


class _ScriptLLM:
    def __init__(self, scripted):
        self._scripted = list(scripted)

    async def complete_with_tools(self, model, messages, tools=None, **kw):
        if tools is None or not self._scripted:
            return LLMMessage(content="trả lời cuối")
        return self._scripted.pop(0)


async def test_agentic_does_not_execute_hallucinated_tool():
    # LLM bịa tool không thuộc server allowlist -> KHÔNG thực thi, vẫn trả lời.
    llm = _ScriptLLM(
        [
            LLMMessage(tool_calls=[ToolCall("t1", "evil_tool", {})]),
            LLMMessage(content="trả lời cuối"),
        ]
    )
    mcp = _FakeMcp([ToolDef(server="fetch", name="fetch", description="", input_schema={})])
    out = await agentic_node({"message": "x", "history": []}, mcp_client=mcp, llm=llm)
    assert mcp.calls == []  # tool bịa không được gọi
    assert out["reply"] == "trả lời cuối"
