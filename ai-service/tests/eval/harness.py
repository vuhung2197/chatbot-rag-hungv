"""Hàm đo cho eval harness (T13). Tách khỏi test để tái dùng / chạy thủ công."""

from app.rag.pipeline import RagResult
from app.schemas import ModelConfig
from app.services.llm import LLMClient, extract_json

# Bộ câu hỏi gán nhãn. kb=True: kỳ vọng CÓ trong kho kiến thức nội bộ.
# KB hiện tại chứa tài liệu "QĐ02 - Quy định bảo mật thông tin" -> câu KB hỏi về chủ đề này.
EVAL_CASES = [
    {"q": "Xin chào bạn", "intent": "GREETING", "kb": False},
    {"q": "Cảm ơn nhiều nhé", "intent": "GREETING", "kb": False},
    {"q": "Tiến độ học của tôi thế nào", "intent": "USER_PROGRESS", "kb": False},
    {"q": "Tôi đã học được bao nhiêu từ vựng", "intent": "USER_PROGRESS", "kb": False},
    {"q": "Giá vàng hôm nay bao nhiêu", "intent": "LIVE_SEARCH", "kb": False},
    {"q": "Tin tức mới nhất về AI", "intent": "LIVE_SEARCH", "kb": False},
    {"q": "Quy định bảo mật thông tin gồm những nội dung gì", "intent": "KNOWLEDGE", "kb": True},
    {"q": "Quy định về quản lý và bảo vệ mật khẩu thế nào", "intent": "KNOWLEDGE", "kb": True},
]

_FAITHFUL_PROMPT = (
    "Bạn là giám khảo. Cho NGỮ CẢNH và CÂU TRẢ LỜI. Câu trả lời có được hỗ trợ HOÀN TOÀN "
    "bởi ngữ cảnh không (không bịa thông tin ngoài ngữ cảnh)?\n"
    # escape {{ }} vì dùng .format() phía dưới ({context}/{answer} mới là field)
    'Chỉ trả JSON: {{"faithful": true|false}}\n\n'
    "NGỮ CẢNH:\n{context}\n\nCÂU TRẢ LỜI:\n{answer}"
)


async def judge_faithful(llm: LLMClient, context: str, answer: str) -> bool:
    """LLM-judge: câu trả lời có grounded trong context không."""
    msg = [
        {
            "role": "system",
            "content": "Bạn đánh giá tính trung thực (faithfulness) của câu trả lời RAG.",
        },
        {"role": "user", "content": _FAITHFUL_PROMPT.format(context=context, answer=answer)},
    ]
    try:
        raw = await llm.generate(ModelConfig(), msg, temperature=0.0, max_tokens=100)
        return bool(extract_json(raw).get("faithful"))
    except Exception:  # noqa: BLE001 - judge lỗi -> coi như không faithful (an toàn)
        return False


def score_intent(results: list[tuple[str, str]]) -> float:
    """results: list (expected, got). Trả accuracy."""
    if not results:
        return 0.0
    return sum(1 for exp, got in results if exp == got) / len(results)


def faithfulness_rate(flags: list[bool]) -> float:
    return sum(1 for f in flags if f) / len(flags) if flags else 0.0


def retrieval_recall(has_context_flags: list[bool]) -> float:
    """Tỉ lệ câu KB lấy được ≥1 chunk."""
    return (
        sum(1 for f in has_context_flags if f) / len(has_context_flags)
        if has_context_flags
        else 0.0
    )


def summarize(result: RagResult) -> str:
    return f"has_context={result.has_context} chunks={len(result.chunks_used)}"
