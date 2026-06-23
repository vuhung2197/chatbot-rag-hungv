"""Unit test agent nodes + graph routing (fake deps, không mạng)."""

from collections.abc import AsyncIterator

from app.agents.graph import AgentGraph
from app.agents.nodes import (
    greeting_node,
    knowledge_node,
    live_search_node,
    offtopic_node,
    route_by_intent,
    router_node,
    user_progress_node,
)
from app.rag.pipeline import Citation, RagResult
from app.rag.retrieval import RetrievedChunk


# ── Fakes ────────────────────────────────────────────────────
class _FakeClassifier:
    def __init__(self, intent):
        self.intent = intent

    async def classify(self, message, model=None, use_cache=True):
        return {"intent": self.intent, "reasoning": "fake"}


class _FakePipeline:
    def __init__(self, result):
        self._result = result

    async def answer(self, query, model=None, history=None, on_token=None, **kw):
        return self._result


class _FakeLLM:
    def __init__(self, text="reply"):
        self.text = text

    async def generate(self, model, messages, temperature, max_tokens):
        return self.text

    async def stream(self, model, messages, temperature, max_tokens) -> AsyncIterator[str]:
        yield self.text

    async def complete_with_tools(
        self, model, messages, tools=None, temperature=0.3, max_tokens=1024
    ):
        from app.services.llm import LLMMessage

        return LLMMessage(content=self.text)


class _FakeMcp:
    def __init__(self, tools=None):
        self._tools = tools or []

    async def list_tools(self):
        return self._tools

    async def call_tool(self, server, name, args):
        from app.services.mcp_client import ToolResult

        return ToolResult(ok=True, content="x")


class _FakeWeb:
    def __init__(self, enabled=True, context="kết quả web"):
        self.enabled = enabled
        self._context = context

    async def search(self, query, max_results=5):
        return self._context


class _FakeNodeApi:
    def __init__(self, data):
        self._data = data

    async def get_user_progress(self, user_id, auth_token=None):
        return self._data


def _ctx():
    return RagResult(
        reply="đáp [1]",
        citations=[Citation(n=1, id=7, title="T")],
        chunks_used=[RetrievedChunk(id=7, title="T", content="c", score=0.9)],
        context="[1] T\nc",
        has_context=True,
    )


def _empty():
    return RagResult(reply="", citations=[], chunks_used=[], context="", has_context=False)


def _agent(intent, pipeline=None):
    return AgentGraph(
        classifier=_FakeClassifier(intent),
        pipeline=_FakePipeline(pipeline or _ctx()),
        web=_FakeWeb(),
        llm=_FakeLLM("xin chào"),
        node_api=_FakeNodeApi({"vocab": 10}),
    )


# ── node logic trực tiếp ─────────────────────────────────────
async def test_router_node_sets_intent():
    out = await router_node({"message": "x"}, classifier=_FakeClassifier("LIVE_SEARCH"))
    assert out["intent"] == "LIVE_SEARCH"


def test_route_by_intent_maps_all():
    assert route_by_intent({"intent": "KNOWLEDGE"}) == "knowledge"
    assert route_by_intent({"intent": "LIVE_SEARCH"}) == "live_search"
    assert route_by_intent({"intent": "USER_PROGRESS"}) == "user_progress"
    assert route_by_intent({"intent": "GREETING"}) == "greeting"
    assert route_by_intent({"intent": "OFF_TOPIC"}) == "offtopic"
    assert route_by_intent({"intent": "???"}) == "knowledge"  # mặc định


def test_route_agent_degrades_to_knowledge_without_servers():
    # F4.2: AGENT mà không có MCP server bật -> degrade KNOWLEDGE (settings mặc định rỗng).
    assert route_by_intent({"intent": "AGENT"}) == "knowledge"


def test_route_agent_to_agentic_with_servers(monkeypatch):
    from app.agents import nodes
    from app.config import Settings

    monkeypatch.setattr(
        nodes,
        "get_settings",
        lambda: Settings(mcp_servers=[{"name": "fetch", "transport": "stdio", "command": "x"}]),
    )
    assert route_by_intent({"intent": "AGENT"}) == "agentic"


def test_agent_intent_registered():
    from app.intent.registry import INTENT_LABELS

    assert "AGENT" in INTENT_LABELS


async def test_graph_routes_agent_to_agentic_node(monkeypatch):
    from app.agents import nodes
    from app.config import Settings

    monkeypatch.setattr(
        nodes,
        "get_settings",
        lambda: Settings(mcp_servers=[{"name": "fetch", "transport": "stdio", "command": "x"}]),
    )
    agent = AgentGraph(
        classifier=_FakeClassifier("AGENT"),
        pipeline=_FakePipeline(_ctx()),
        web=_FakeWeb(),
        llm=_FakeLLM("đáp agentic"),
        node_api=_FakeNodeApi({}),
        mcp_client=_FakeMcp(tools=[]),
    )
    state = await agent.run("đọc trang này")
    assert state["source_type"] == "agentic"
    assert state["reply"] == "đáp agentic"


async def test_knowledge_node_with_context():
    out = await knowledge_node({"message": "q"}, pipeline=_FakePipeline(_ctx()))
    assert out["source_type"] == "knowledge" and out["citations"][0]["id"] == 7


async def test_knowledge_node_web_fallback_when_empty():
    out = await knowledge_node(
        {"message": "q"}, pipeline=_FakePipeline(_empty()), web=_FakeWeb(), llm=_FakeLLM("web ans")
    )
    assert out["source_type"] == "kb_fallback_web"


async def test_knowledge_node_kb_empty_when_no_web():
    out = await knowledge_node({"message": "q"}, pipeline=_FakePipeline(_empty()))
    assert out["source_type"] == "kb_empty"


async def test_live_search_node():
    out = await live_search_node({"message": "giá vàng"}, web=_FakeWeb(), llm=_FakeLLM("ans"))
    assert out["source_type"] == "web_search"


async def test_live_search_disabled():
    out = await live_search_node({"message": "x"}, web=_FakeWeb(enabled=False), llm=_FakeLLM())
    assert out["source_type"] == "web_disabled"


async def test_greeting_node():
    out = await greeting_node({"message": "hi"}, llm=_FakeLLM("Chào bạn!"))
    assert out["source_type"] == "greeting" and out["reply"] == "Chào bạn!"


async def test_offtopic_node():
    out = await offtopic_node({"message": "chính trị"})
    assert out["source_type"] == "off_topic"


async def test_user_progress_requires_login():
    out = await user_progress_node(
        {"message": "tiến độ"}, node_api=_FakeNodeApi(None), llm=_FakeLLM()
    )
    assert out["source_type"] == "auth_required"


async def test_user_progress_unavailable_when_no_data():
    out = await user_progress_node(
        {"message": "tiến độ", "user_id": 1}, node_api=_FakeNodeApi(None), llm=_FakeLLM()
    )
    assert out["source_type"] == "progress_unavailable"


async def test_user_progress_with_data():
    out = await user_progress_node(
        {"message": "tiến độ", "user_id": 1},
        node_api=_FakeNodeApi({"vocab": 5}),
        llm=_FakeLLM("Bạn đã học 5 từ"),
    )
    assert out["source_type"] == "user_progress"


# ── graph compiled end-to-end (routing đúng) ────────────────
async def test_graph_routes_knowledge():
    state = await _agent("KNOWLEDGE").run("RAG là gì")
    assert state["source_type"] == "knowledge"


async def test_graph_routes_greeting():
    state = await _agent("GREETING").run("xin chào")
    assert state["source_type"] == "greeting"


async def test_graph_routes_offtopic():
    state = await _agent("OFF_TOPIC").run("chính trị")
    assert state["source_type"] == "off_topic"


async def test_graph_routes_live_search():
    state = await _agent("LIVE_SEARCH").run("giá vàng hôm nay")
    assert state["source_type"] == "web_search"
