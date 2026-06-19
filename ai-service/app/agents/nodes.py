"""Logic từng node của agent graph — TỰ VIẾT (học sâu).

Mỗi node async nhận state + deps (inject để test). LangGraph chỉ lo wiring (graph.py).
3 trụ cột: knowledge (RAG + web fallback) / live_search (web) / user_progress (Node API).
2 guard: greeting / offtopic.
"""

import logging

from app.agents.state import GraphState
from app.clients.node_api import NodeApiClient
from app.intent.classifier import IntentClassifier
from app.rag.pipeline import RagPipeline
from app.schemas import ModelConfig
from app.services.llm import LLMClient
from app.services.web_search import WebSearchClient

logger = logging.getLogger(__name__)

_KB_EMPTY_REPLY = "Tôi chưa tìm thấy thông tin liên quan trong tài liệu nội bộ."
_PROGRESS_UNAVAILABLE = "Hiện chưa lấy được dữ liệu tiến độ học tập của bạn."
_OFFTOPIC_REPLY = "Xin lỗi, tôi không thể thảo luận về chủ đề này."

_WEB_SYSTEM = (
    "Bạn là trợ lý AI. Trả lời câu hỏi DỰA TRÊN kết quả tìm kiếm web dưới đây.\n"
    "Trả lời chính xác, ngắn gọn, DẪN NGUỒN dạng [Tiêu đề](URL), trình bày Markdown.\n"
    "Nếu kết quả không đủ để trả lời, hãy nói rõ.\n\n---\n{context}\n---"
)
_GREETING_SYSTEM = (
    "Bạn là trợ lý học tiếng Anh thân thiện. " "Trả lời chào hỏi ngắn gọn bằng tiếng Việt."
)
_PROGRESS_SYSTEM = (
    "Diễn giải dữ liệu tiến độ học tập sau cho người dùng, "
    "ngắn gọn, động viên, trình bày Markdown."
)


async def router_node(state: GraphState, *, classifier: IntentClassifier) -> dict:
    """Phân loại intent, đặt vào state để conditional edge định tuyến."""
    out = await classifier.classify(state["message"], model=state.get("model"))
    logger.info("intent=%s | %s", out["intent"], out["reasoning"])
    return {"intent": out["intent"], "reasoning": out["reasoning"]}


# Map intent -> tên node. Nguồn sự thật định tuyến của graph.
INTENT_TO_NODE = {
    "KNOWLEDGE": "knowledge",
    "LIVE_SEARCH": "live_search",
    "USER_PROGRESS": "user_progress",
    "GREETING": "greeting",
    "OFF_TOPIC": "offtopic",
}


def route_by_intent(state: GraphState) -> str:
    """Edge function: tên node kế tiếp theo intent (mặc định knowledge)."""
    return INTENT_TO_NODE.get(state.get("intent", ""), "knowledge")


async def _synthesize_web(state: GraphState, llm: LLMClient, context: str) -> str:
    messages = [
        {"role": "system", "content": _WEB_SYSTEM.format(context=context)},
        *(state.get("history") or [])[-4:],
        {"role": "user", "content": state["message"]},
    ]
    model = state.get("model") or ModelConfig()
    on_token = state.get("on_token")
    if on_token is not None:
        parts: list[str] = []
        async for delta in llm.stream(model, messages, 0.4, 1500):
            parts.append(delta)
            on_token(delta)
        return "".join(parts)
    return await llm.generate(model, messages, 0.4, 1500)


async def knowledge_node(
    state: GraphState,
    *,
    pipeline: RagPipeline,
    web: WebSearchClient | None = None,
    llm: LLMClient | None = None,
) -> dict:
    """KNOWLEDGE: RAG nội bộ; rỗng -> web fallback (nếu có) -> kb_empty."""
    result = await pipeline.answer(
        state["message"],
        model=state.get("model"),
        history=state.get("history"),
        on_token=state.get("on_token"),
    )
    if result.has_context:
        return {
            "reply": result.reply,
            "source_type": "knowledge",
            "citations": [c.model_dump() for c in result.citations],
            "chunks": [c.model_dump() for c in result.chunks_used],
        }
    # Fallback web khi KB rỗng
    if web is not None and web.enabled and llm is not None:
        context = await web.search(state["message"])
        if context:
            reply = await _synthesize_web(state, llm, context)
            return {"reply": reply, "source_type": "kb_fallback_web", "citations": [], "chunks": []}
    return {"reply": _KB_EMPTY_REPLY, "source_type": "kb_empty", "citations": [], "chunks": []}


async def live_search_node(state: GraphState, *, web: WebSearchClient, llm: LLMClient) -> dict:
    """LIVE_SEARCH: dữ liệu thời gian thực -> web search + tổng hợp."""
    if not web.enabled:
        return {
            "reply": "Tính năng tìm kiếm web hiện chưa được cấu hình.",
            "source_type": "web_disabled",
            "citations": [],
            "chunks": [],
        }
    context = await web.search(state["message"])
    if not context:
        return {
            "reply": "Tôi chưa tìm được thông tin cập nhật cho câu hỏi này.",
            "source_type": "web_empty",
            "citations": [],
            "chunks": [],
        }
    reply = await _synthesize_web(state, llm, context)
    return {"reply": reply, "source_type": "web_search", "citations": [], "chunks": []}


async def greeting_node(state: GraphState, *, llm: LLMClient) -> dict:
    """GREETING: trả lời xã giao ngắn, thân thiện (LLM)."""
    messages = [
        {"role": "system", "content": _GREETING_SYSTEM},
        {"role": "user", "content": state["message"]},
    ]
    reply = await llm.generate(state.get("model") or ModelConfig(), messages, 0.7, 200)
    return {"reply": reply, "source_type": "greeting", "citations": [], "chunks": []}


async def offtopic_node(state: GraphState) -> dict:
    """OFF_TOPIC: từ chối tĩnh (không gọi LLM)."""
    return {"reply": _OFFTOPIC_REPLY, "source_type": "off_topic", "citations": [], "chunks": []}


async def user_progress_node(state: GraphState, *, node_api: NodeApiClient, llm: LLMClient) -> dict:
    """USER_PROGRESS: lấy dữ liệu tiến độ qua Node API rồi để LLM diễn giải.

    Chưa đăng nhập -> nhắc đăng nhập. Endpoint Node chưa có/lỗi -> báo chưa khả dụng.
    """
    user_id = state.get("user_id")
    if not user_id:
        return {
            "reply": "Bạn cần đăng nhập để xem tiến độ học tập của mình.",
            "source_type": "auth_required",
            "citations": [],
            "chunks": [],
        }
    data = await node_api.get_user_progress(user_id, state.get("auth_token"))
    if not data:
        return {
            "reply": _PROGRESS_UNAVAILABLE,
            "source_type": "progress_unavailable",
            "citations": [],
            "chunks": [],
        }
    messages = [
        {"role": "system", "content": _PROGRESS_SYSTEM},
        {"role": "user", "content": f"Dữ liệu: {data}\n\nCâu hỏi: {state['message']}"},
    ]
    reply = await llm.generate(state.get("model") or ModelConfig(), messages, 0.3, 800)
    return {"reply": reply, "source_type": "user_progress", "citations": [], "chunks": []}
