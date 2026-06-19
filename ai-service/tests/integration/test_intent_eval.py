"""Eval intent classifier — LLM thật. `uv run pytest -m eval`.

Bảng câu hỏi gán nhãn; yêu cầu accuracy >= ngưỡng. Bộ eval đầy đủ hơn ở T13.
"""

import pytest

from app.intent.classifier import IntentClassifier

pytestmark = pytest.mark.eval

CASES = [
    ("Xin chào bạn", "GREETING"),
    ("Cảm ơn nhiều nhé", "GREETING"),
    ("Tiến độ học của tôi thế nào", "USER_PROGRESS"),
    ("Tôi đã học được bao nhiêu từ vựng rồi", "USER_PROGRESS"),
    ("Giá vàng hôm nay bao nhiêu", "LIVE_SEARCH"),
    ("Tin tức mới nhất về AI", "LIVE_SEARCH"),
    ("RAG là gì", "KNOWLEDGE"),
    ("Giải thích cách hoạt động của thì hiện tại hoàn thành", "KNOWLEDGE"),
]


async def test_intent_accuracy_threshold():
    c = IntentClassifier()
    correct = 0
    wrong = []
    for msg, expected in CASES:
        got = (await c.classify(msg, use_cache=False))["intent"]
        if got == expected:
            correct += 1
        else:
            wrong.append((msg, expected, got))
    acc = correct / len(CASES)
    print(f"\nIntent accuracy: {acc:.0%} ({correct}/{len(CASES)}). Sai: {wrong}")
    assert acc >= 0.85, f"accuracy {acc:.0%} < 85%; sai: {wrong}"
