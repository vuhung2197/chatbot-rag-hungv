"""Unit test T3 — LLM tool-calling (F2). Fake OpenAI client, không mạng.

complete_with_tools truyền `tools` xuống SDK + parse tool_calls; không tool ->
trả content, tool_calls rỗng. Giữ generate cũ không hồi quy.
"""

from app.schemas import ModelConfig
from app.services.llm import LLMClient


class _FakeFn:
    def __init__(self, name, arguments):
        self.name = name
        self.arguments = arguments


class _FakeToolCall:
    def __init__(self, id, name, arguments):
        self.id = id
        self.function = _FakeFn(name, arguments)


class _FakeMsg:
    def __init__(self, content=None, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls


class _FakeResp:
    def __init__(self, message):
        self.choices = [type("C", (), {"message": message})()]


class _FakeCompletions:
    def __init__(self, resp):
        self._resp = resp
        self.last_kwargs = None

    async def create(self, **kw):
        self.last_kwargs = kw
        return self._resp


class _FakeClient:
    def __init__(self, resp):
        self.chat = type("Chat", (), {"completions": _FakeCompletions(resp)})()


def _client_with(resp):
    c = LLMClient()
    fake = _FakeClient(resp)
    c._client = lambda model: fake  # type: ignore[assignment]
    return c, fake


async def test_returns_tool_calls_parsed():
    msg = _FakeMsg(content=None, tool_calls=[_FakeToolCall("t1", "fetch", '{"url": "http://x"}')])
    c, _ = _client_with(_FakeResp(msg))
    out = await c.complete_with_tools(ModelConfig(), [{"role": "user", "content": "x"}], tools=[])
    assert len(out.tool_calls) == 1
    assert out.tool_calls[0].name == "fetch"
    assert out.tool_calls[0].arguments == {"url": "http://x"}
    assert out.content == ""


async def test_passes_tools_to_sdk():
    tools = [{"type": "function", "function": {"name": "fetch", "parameters": {}}}]
    c, fake = _client_with(_FakeResp(_FakeMsg(content="done")))
    await c.complete_with_tools(ModelConfig(), [{"role": "user", "content": "x"}], tools=tools)
    assert fake.chat.completions.last_kwargs["tools"] == tools


async def test_no_tool_calls_returns_content():
    c, _ = _client_with(_FakeResp(_FakeMsg(content="trả lời thường")))
    out = await c.complete_with_tools(ModelConfig(), [{"role": "user", "content": "x"}], tools=[])
    assert out.content == "trả lời thường"
    assert out.tool_calls == []


async def test_malformed_arguments_degrade_to_empty():
    msg = _FakeMsg(tool_calls=[_FakeToolCall("t1", "fetch", "{not json")])
    c, _ = _client_with(_FakeResp(msg))
    out = await c.complete_with_tools(ModelConfig(), [{"role": "user", "content": "x"}], tools=[])
    assert out.tool_calls[0].arguments == {}
