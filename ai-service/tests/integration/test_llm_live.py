"""Integration test LLM — gọi OpenAI thật (cần OPENAI_API_KEY). `-m integration`."""

import pytest

from app.schemas import ModelConfig
from app.services.llm import LLMClient

pytestmark = pytest.mark.integration

MODEL = ModelConfig(url="https://api.openai.com/v1", name="gpt-4o-mini")
MESSAGES = [
    {"role": "system", "content": "Trả lời cực ngắn."},
    {"role": "user", "content": "Thủ đô Việt Nam là gì? Trả 1 từ."},
]


async def test_generate_returns_text():
    client = LLMClient()
    out = await client.generate(MODEL, MESSAGES, temperature=0, max_tokens=20)
    assert isinstance(out, str) and len(out) > 0
    assert "nội" in out.lower() or "hà" in out.lower()


async def test_stream_yields_tokens():
    client = LLMClient()
    chunks = [c async for c in client.stream(MODEL, MESSAGES, temperature=0, max_tokens=20)]
    assert len(chunks) >= 1
    assert "".join(chunks).strip()
