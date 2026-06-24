"""Unit test T2 — input bounds tại HTTP boundary (F6).

ChatRequest.history và ChatMessage.content phải có giới hạn để chặn DoS qua input
lớn. Vượt giới hạn -> ValidationError (FastAPI trả 422).
"""

import pytest
from pydantic import ValidationError

from app.schemas import ChatMessage, ChatRequest


def test_history_within_limit_ok():
    msgs = [ChatMessage(role="user", content="hi") for _ in range(20)]
    req = ChatRequest(message="x", history=msgs)
    assert len(req.history) == 20


def test_history_exceeds_limit_rejected():
    # F6.1: history > 20 -> 422
    msgs = [{"role": "user", "content": "hi"} for _ in range(21)]
    with pytest.raises(ValidationError):
        ChatRequest(message="x", history=msgs)


def test_message_content_too_long_rejected():
    # F6.2: content quá dài -> 422
    with pytest.raises(ValidationError):
        ChatMessage(role="user", content="a" * 10001)


def test_message_content_within_limit_ok():
    m = ChatMessage(role="user", content="a" * 10000)
    assert len(m.content) == 10000
