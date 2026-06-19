"""Registry intent — NGUỒN SỰ THẬT cho phân loại.

Thêm/sửa/bớt intent = sửa dict này, KHÔNG đụng logic classifier. Prompt phân loại
được sinh động từ registry (xem classifier.build_classifier_prompt).

3 trụ cột (pillar=True): KNOWLEDGE, LIVE_SEARCH, USER_PROGRESS.
2 guard (pillar=False): GREETING, OFF_TOPIC.
KB_CATALOG đã bỏ — câu hỏi meta ("bot học gì") đi qua KNOWLEDGE/RAG thường.
"""

from pydantic import BaseModel


class IntentDef(BaseModel):
    pillar: bool
    description: str
    examples: list[str]


INTENT_REGISTRY: dict[str, IntentDef] = {
    "GREETING": IntentDef(
        pillar=False,
        description="Chào hỏi, cảm ơn, hỏi thăm xã giao, hỏi bot là ai.",
        examples=["Xin chào", "Cảm ơn bạn", "Bạn là ai?"],
    ),
    "OFF_TOPIC": IntentDef(
        pillar=False,
        description="Chính trị nhạy cảm, tôn giáo cực đoan, bạo lực, khiêu dâm, chất cấm.",
        examples=["Quan điểm về đảng phái X", "Cách chế tạo vũ khí"],
    ),
    "USER_PROGRESS": IntentDef(
        pillar=True,
        description="Hỏi về tiến độ/kết quả học tập CỦA CHÍNH người dùng.",
        examples=["Tiến độ của tôi thế nào", "Tôi đã học bao nhiêu từ vựng"],
    ),
    "LIVE_SEARCH": IntentDef(
        pillar=True,
        description="Cần dữ liệu thời gian thực / sự kiện nóng / giá cả / thời tiết.",
        examples=["Giá vàng hôm nay", "Thời tiết Hà Nội", "Tin mới nhất về iPhone"],
    ),
    "KNOWLEDGE": IntentDef(
        pillar=True,
        description=(
            "Kiến thức bền vững, định nghĩa, kỹ thuật, giải thích khái niệm (RAG nội bộ); "
            "kể cả câu hỏi meta về tài liệu bot đã học."
        ),
        examples=["RAG là gì", "Cách dùng useEffect", "Bạn đã học những tài liệu nào"],
    ),
}

INTENT_LABELS: list[str] = list(INTENT_REGISTRY.keys())
DEFAULT_INTENT = "KNOWLEDGE"  # fallback an toàn (còn có web fallback phía sau)
