"""Eval — agent chọn intent AGENT (dùng tool) đúng lúc. `-m eval`.

Dùng intent classifier thật (LLM) trên bộ câu cần-tool vs không-cần-tool. Đo
accuracy phân biệt AGENT vs phần còn lại. Chạy: `uv run pytest -m eval`.
"""

import pytest

from app.intent.classifier import IntentClassifier

pytestmark = pytest.mark.eval

# (câu, có-nên-dùng-tool?) — AGENT = đọc/lấy nội dung URL cụ thể qua công cụ.
_CASES = [
    ("Đọc trang https://example.com và tóm tắt giúp tôi", True),
    ("Lấy nội dung của URL https://news.ycombinator.com", True),
    ("RAG là gì", False),
    ("Xin chào bạn", False),
    ("Tiến độ học của tôi thế nào", False),
    ("Giá vàng hôm nay", False),
]


async def test_agent_intent_accuracy():
    clf = IntentClassifier()
    correct = 0
    for question, want_agent in _CASES:
        out = await clf.classify(question, use_cache=False)
        is_agent = out["intent"] == "AGENT"
        correct += int(is_agent == want_agent)
    accuracy = correct / len(_CASES)
    assert accuracy >= 0.8, f"AGENT intent accuracy {accuracy:.0%} < 80%"
