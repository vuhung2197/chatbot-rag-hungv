"""Unit test intent classifier — fake LLM + monkeypatch cache (không mạng)."""

import pytest

from app.intent import classifier as clf
from app.intent.classifier import IntentClassifier, build_classifier_prompt, hash_question
from app.intent.registry import INTENT_LABELS


@pytest.fixture(autouse=True)
def _no_cache(monkeypatch):
    """Mặc định tắt cache trong unit test (tránh chạm Redis)."""

    async def _get(_key):
        return None

    async def _set(_key, _value, _ttl):
        return None

    monkeypatch.setattr(clf, "get_cached", _get)
    monkeypatch.setattr(clf, "set_cached", _set)


class _FakeLLM:
    def __init__(self, output):
        self.output = output
        self.calls = 0

    async def generate(self, model, messages, temperature, max_tokens):
        self.calls += 1
        return self.output


def test_prompt_lists_all_labels():
    prompt = build_classifier_prompt()
    for label in INTENT_LABELS:
        assert label in prompt


def test_hash_question_normalizes():
    assert hash_question(" RAG là gì ") == hash_question("rag là gì")


async def test_valid_intent():
    c = IntentClassifier(llm=_FakeLLM('{"intent":"LIVE_SEARCH","reasoning":"thời sự"}'))
    out = await c.classify("giá vàng hôm nay")
    assert out["intent"] == "LIVE_SEARCH"


async def test_invalid_intent_falls_back_to_knowledge():
    c = IntentClassifier(llm=_FakeLLM('{"intent":"BANANA"}'))
    out = await c.classify("câu gì đó")
    assert out["intent"] == "KNOWLEDGE"


async def test_unparseable_falls_back():
    c = IntentClassifier(llm=_FakeLLM("model lảm nhảm không có json"))
    out = await c.classify("câu gì đó")
    assert out["intent"] == "KNOWLEDGE"


async def test_empty_message_is_greeting_without_llm():
    llm = _FakeLLM('{"intent":"KNOWLEDGE"}')
    c = IntentClassifier(llm=llm)
    out = await c.classify("   ")
    assert out["intent"] == "GREETING"
    assert llm.calls == 0  # không gọi LLM cho câu rỗng


async def test_cache_hit_skips_llm(monkeypatch):
    async def _hit(_key):
        return "USER_PROGRESS"

    monkeypatch.setattr(clf, "get_cached", _hit)
    llm = _FakeLLM('{"intent":"KNOWLEDGE"}')
    c = IntentClassifier(llm=llm)
    out = await c.classify("tiến độ của tôi")
    assert out["intent"] == "USER_PROGRESS"
    assert out["reasoning"] == "cache hit"
    assert llm.calls == 0  # cache hit -> KHÔNG gọi LLM
