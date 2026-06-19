"""Unit test agent nodes + graph routing (fake classifier/pipeline, không mạng)."""

from app.agents.graph import AgentGraph
from app.agents.nodes import knowledge_node, route_by_intent, router_node
from app.rag.pipeline import Citation, RagResult
from app.rag.retrieval import RetrievedChunk


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


def _ctx_result():
    return RagResult(
        reply="đáp [1]",
        citations=[Citation(n=1, id=7, title="T")],
        chunks_used=[RetrievedChunk(id=7, title="T", content="c", score=0.9)],
        context="[1] T\nc",
        has_context=True,
    )


# ── node logic trực tiếp ─────────────────────────────────────
async def test_router_node_sets_intent():
    out = await router_node({"message": "giá vàng"}, classifier=_FakeClassifier("LIVE_SEARCH"))
    assert out["intent"] == "LIVE_SEARCH"


def test_route_by_intent():
    assert route_by_intent({"intent": "KNOWLEDGE"}) == "knowledge"
    assert route_by_intent({"intent": "GREETING"}) == "pending"
    assert route_by_intent({"intent": "LIVE_SEARCH"}) == "pending"


async def test_knowledge_node_with_context():
    out = await knowledge_node({"message": "q"}, pipeline=_FakePipeline(_ctx_result()))
    assert out["source_type"] == "knowledge"
    assert out["citations"][0]["id"] == 7


async def test_knowledge_node_empty():
    empty = RagResult(reply="", citations=[], chunks_used=[], context="", has_context=False)
    out = await knowledge_node({"message": "q"}, pipeline=_FakePipeline(empty))
    assert out["source_type"] == "kb_empty"


# ── graph compiled end-to-end (routing đúng) ────────────────
async def test_graph_routes_knowledge_to_rag():
    agent = AgentGraph(
        classifier=_FakeClassifier("KNOWLEDGE"), pipeline=_FakePipeline(_ctx_result())
    )
    state = await agent.run("RAG là gì")
    assert state["intent"] == "KNOWLEDGE"
    assert state["source_type"] == "knowledge"
    assert state["reply"] == "đáp [1]"


async def test_graph_routes_other_intent_to_pending():
    agent = AgentGraph(
        classifier=_FakeClassifier("GREETING"), pipeline=_FakePipeline(_ctx_result())
    )
    state = await agent.run("xin chào")
    assert state["intent"] == "GREETING"
    assert state["source_type"] == "pending"
