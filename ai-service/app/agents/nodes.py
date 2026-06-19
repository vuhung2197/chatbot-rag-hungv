"""Logic từng node của agent graph — TỰ VIẾT (học sâu).

Mỗi node async nhận state + deps (inject để test). LangGraph chỉ lo wiring (graph.py).
T8: router + knowledge + pending(stub cho intent khác). T9 thay pending bằng node thật
(live_search / greeting / offtopic / user_progress) + web fallback.
"""

import logging

from app.agents.state import GraphState
from app.intent.classifier import IntentClassifier
from app.rag.pipeline import RagPipeline

logger = logging.getLogger(__name__)

_KB_EMPTY_REPLY = "Tôi chưa tìm thấy thông tin liên quan trong tài liệu nội bộ."


async def router_node(state: GraphState, *, classifier: IntentClassifier) -> dict:
    """Phân loại intent, đặt vào state để conditional edge định tuyến."""
    out = await classifier.classify(state["message"], model=state.get("model"))
    logger.info("intent=%s | %s", out["intent"], out["reasoning"])
    return {"intent": out["intent"], "reasoning": out["reasoning"]}


def route_by_intent(state: GraphState) -> str:
    """Edge function: tên node kế tiếp theo intent. KNOWLEDGE -> RAG, còn lại -> pending."""
    return "knowledge" if state.get("intent") == "KNOWLEDGE" else "pending"


async def knowledge_node(state: GraphState, *, pipeline: RagPipeline) -> dict:
    """Trụ cột KNOWLEDGE: RAG nội bộ. Rỗng -> kb_empty (T9 chèn web fallback trước bước này)."""
    result = await pipeline.answer(
        state["message"],
        model=state.get("model"),
        history=state.get("history"),
        on_token=state.get("on_token"),
    )
    if not result.has_context:
        return {"reply": _KB_EMPTY_REPLY, "source_type": "kb_empty", "citations": [], "chunks": []}
    return {
        "reply": result.reply,
        "source_type": "knowledge",
        "citations": [c.model_dump() for c in result.citations],
        "chunks": [c.model_dump() for c in result.chunks_used],
    }


async def pending_node(state: GraphState) -> dict:
    """Stub cho các intent chưa nối (T9 thay thế). Giữ graph chạy được end-to-end."""
    intent = state.get("intent", "?")
    return {
        "reply": f"(Intent {intent} sẽ được xử lý ở bước sau.)",
        "source_type": "pending",
        "citations": [],
        "chunks": [],
    }
