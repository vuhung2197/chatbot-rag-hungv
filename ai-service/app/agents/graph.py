"""Agent graph (LangGraph) — wiring các node tự viết.

build_graph inject classifier + pipeline (test bằng fake). AgentGraph.run là API gọn
cho endpoint /chat dùng (T8 thay dần định tuyến if-else ở main.py).
"""

import logging
from functools import partial

from langgraph.graph import END, StateGraph

from app.agents.nodes import knowledge_node, pending_node, route_by_intent, router_node
from app.agents.state import GraphState
from app.intent.classifier import IntentClassifier, get_classifier
from app.rag.pipeline import RagPipeline, get_pipeline
from app.schemas import ModelConfig

logger = logging.getLogger(__name__)


def build_graph(classifier: IntentClassifier, pipeline: RagPipeline):
    """Dựng + compile graph: router -> (knowledge | pending) -> END."""
    g = StateGraph(GraphState)
    g.add_node("router", partial(router_node, classifier=classifier))
    g.add_node("knowledge", partial(knowledge_node, pipeline=pipeline))
    g.add_node("pending", pending_node)

    g.set_entry_point("router")
    g.add_conditional_edges(
        "router", route_by_intent, {"knowledge": "knowledge", "pending": "pending"}
    )
    g.add_edge("knowledge", END)
    g.add_edge("pending", END)
    return g.compile()


class AgentGraph:
    def __init__(
        self, classifier: IntentClassifier | None = None, pipeline: RagPipeline | None = None
    ):
        self._graph = build_graph(classifier or get_classifier(), pipeline or get_pipeline())

    async def run(
        self,
        message: str,
        model: ModelConfig | None = None,
        history: list[dict[str, str]] | None = None,
        on_token=None,
        user_id: int | None = None,
        auth_token: str | None = None,
    ) -> GraphState:
        state: GraphState = {
            "message": message,
            "model": model,
            "history": history or [],
            "on_token": on_token,
            "user_id": user_id,
            "auth_token": auth_token,
        }
        return await self._graph.ainvoke(state)


_default: AgentGraph | None = None


def get_agent() -> AgentGraph:
    global _default
    if _default is None:
        _default = AgentGraph()
    return _default
