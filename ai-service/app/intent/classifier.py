"""Phân loại intent bằng LLM, điều khiển bằng registry, có cache Redis.

1 LLM call (model nhẹ). Prompt sinh từ INTENT_REGISTRY. Output không hợp lệ / lỗi /
rỗng -> DEFAULT_INTENT (KNOWLEDGE). Cache theo hash câu hỏi để câu lặp khỏi gọi LLM.
"""

import hashlib
import logging

from app.config import get_settings
from app.intent.registry import DEFAULT_INTENT, INTENT_LABELS, INTENT_REGISTRY
from app.schemas import ModelConfig
from app.services.cache import get_cached, set_cached
from app.services.llm import extract_json, get_llm

logger = logging.getLogger(__name__)

_CACHE_PREFIX = "intent:"


def hash_question(text: str) -> str:
    """SHA256 của câu hỏi (chuẩn hoá lower+strip) — khớp ý tưởng hashQuestion phía Node."""
    return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()


def build_classifier_prompt() -> str:
    """Sinh system prompt từ registry — KHÔNG liệt kê nhãn/từ khoá cứng trong code."""
    lines = [
        f"- {label}: {d.description} Ví dụ: {'; '.join(d.examples)}."
        for label, d in INTENT_REGISTRY.items()
    ]
    labels = ", ".join(INTENT_LABELS)
    return (
        "Bạn là AI Router. Phân loại câu hỏi của người dùng vào ĐÚNG MỘT nhãn:\n"
        + "\n".join(lines)
        + "\n\nChỉ trả JSON, không thêm gì khác: "
        + '{"intent":"<MỘT TRONG: '
        + labels
        + '>","reasoning":"<ngắn gọn>"}'
    )


class IntentClassifier:
    def __init__(self, llm=None) -> None:
        self._llm = llm or get_llm()
        self._settings = get_settings()

    async def classify(
        self, message: str, model: ModelConfig | None = None, use_cache: bool = True
    ) -> dict[str, str]:
        msg = (message or "").strip()
        if not msg:
            return {"intent": "GREETING", "reasoning": "empty message"}

        key = _CACHE_PREFIX + hash_question(msg)
        if use_cache:
            cached = await get_cached(key)
            if cached in INTENT_LABELS:
                return {"intent": cached, "reasoning": "cache hit"}

        intent, reasoning = await self._classify_llm(msg, model or ModelConfig())

        if use_cache:
            await set_cached(key, intent, self._settings.intent_cache_ttl_sec)
        return {"intent": intent, "reasoning": reasoning}

    async def _classify_llm(self, msg: str, model: ModelConfig) -> tuple[str, str]:
        messages = [
            {"role": "system", "content": build_classifier_prompt()},
            {"role": "user", "content": msg},
        ]
        try:
            raw = await self._llm.generate(model, messages, temperature=0.1, max_tokens=800)
            data = extract_json(raw)
        except Exception as e:  # noqa: BLE001 - mọi lỗi (gồm LLMError) -> fallback an toàn
            logger.warning("intent classify failed -> %s: %s", DEFAULT_INTENT, e)
            return DEFAULT_INTENT, f"fallback ({type(e).__name__})"

        intent = data.get("intent")
        if intent not in INTENT_LABELS:
            logger.warning("intent lạ %r -> %s", intent, DEFAULT_INTENT)
            return DEFAULT_INTENT, "fallback (nhãn không hợp lệ)"
        return intent, str(data.get("reasoning", ""))


_default: IntentClassifier | None = None


def get_classifier() -> IntentClassifier:
    global _default
    if _default is None:
        _default = IntentClassifier()
    return _default
