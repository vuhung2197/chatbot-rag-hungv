"""Agent graph (LangGraph) — wiring các node tự viết.

build_graph inject mọi dependency (test bằng fake). AgentGraph.run là API gọn cho /chat.
router -> (knowledge | live_search | user_progress | greeting | offtopic) -> END.
"""

import logging
from functools import partial

from langgraph.graph import END, StateGraph

from app.agents.nodes import (
    agentic_node,
    greeting_node,
    knowledge_node,
    live_search_node,
    offtopic_node,
    route_by_intent,
    router_node,
    user_progress_node,
)
from app.agents.state import GraphState
from app.clients.node_api import NodeApiClient, get_node_api
from app.intent.classifier import IntentClassifier, get_classifier
from app.rag.pipeline import RagPipeline, get_pipeline
from app.schemas import ModelConfig
from app.services.llm import LLMClient, get_llm
from app.services.mcp_client import McpClient, get_mcp_client
from app.services.web_search import WebSearchClient, get_web_search

logger = logging.getLogger(__name__)

_NODE_NAMES = ["knowledge", "live_search", "user_progress", "greeting", "offtopic", "agentic"]


def build_graph(
    classifier: IntentClassifier,
    pipeline: RagPipeline,
    web: WebSearchClient,
    llm: LLMClient,
    node_api: NodeApiClient,
    mcp_client: McpClient,
):
    """Dựng + compile graph với deps inject sẵn vào từng node."""
    g = StateGraph(GraphState)
    g.add_node("router", partial(router_node, classifier=classifier))
    g.add_node("knowledge", partial(knowledge_node, pipeline=pipeline, web=web, llm=llm))
    g.add_node("live_search", partial(live_search_node, web=web, llm=llm))
    g.add_node("user_progress", partial(user_progress_node, node_api=node_api, llm=llm))
    g.add_node("greeting", partial(greeting_node, llm=llm))
    g.add_node("offtopic", offtopic_node)
    g.add_node("agentic", partial(agentic_node, mcp_client=mcp_client, llm=llm))

    g.set_entry_point("router")
    g.add_conditional_edges("router", route_by_intent, {n: n for n in _NODE_NAMES})
    for n in _NODE_NAMES:
        g.add_edge(n, END)
    return g.compile()


class AgentGraph:
    def __init__(
        self,
        classifier: IntentClassifier | None = None,
        pipeline: RagPipeline | None = None,
        web: WebSearchClient | None = None,
        llm: LLMClient | None = None,
        node_api: NodeApiClient | None = None,
        mcp_client: McpClient | None = None,
    ):
        self._graph = build_graph(
            classifier or get_classifier(),
            pipeline or get_pipeline(),
            web or get_web_search(),
            llm or get_llm(),
            node_api or get_node_api(),
            mcp_client or get_mcp_client(),
        )

    async def run(
        self,
        message: str,
        model: ModelConfig | None = None,
        history: list[dict[str, str]] | None = None,
        on_token=None,
        user_id: int | None = None,
        auth_token: str | None = None,
        force_agent: bool = False,
        mcp_server: str | None = None,
        mcp_servers: list[str] | None = None,
    ) -> GraphState:
        state: GraphState = {
            "message": message,
            "model": model,
            "history": history or [],
            "on_token": on_token,
            "user_id": user_id,
            "auth_token": auth_token,
            "force_agent": force_agent,
            "mcp_server": mcp_server,
            "mcp_servers": mcp_servers,
        }
        return await self._graph.ainvoke(state)


_default: AgentGraph | None = None


def get_agent() -> AgentGraph:
    global _default
    if _default is None:
        _default = AgentGraph()
    return _default
