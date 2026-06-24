"""Unit test LLM client — phần logic thuần (không gọi mạng)."""

import pytest

from app.services.llm import LLMClient, LLMError, extract_json


class TestExtractJson:
    def test_plain_json(self):
        assert extract_json('{"intent": "KNOWLEDGE"}') == {"intent": "KNOWLEDGE"}

    def test_json_with_code_fence(self):
        text = '```json\n{"intent": "GREETING", "reasoning": "hi"}\n```'
        assert extract_json(text)["intent"] == "GREETING"

    def test_json_with_surrounding_prose(self):
        text = 'Suy nghĩ... Kết quả: {"a": 1, "b": "x"} (xong)'
        assert extract_json(text) == {"a": 1, "b": "x"}

    def test_empty_raises(self):
        with pytest.raises(LLMError):
            extract_json("")

    def test_no_json_raises(self):
        with pytest.raises(LLMError):
            extract_json("không có gì ở đây")

    def test_malformed_json_raises(self):
        with pytest.raises(LLMError):
            extract_json("{intent: KNOWLEDGE}")  # thiếu dấu nháy


class TestRetry:
    async def test_succeeds_after_transient_failures(self):
        client = LLMClient()
        calls = {"n": 0}

        async def flaky():
            calls["n"] += 1
            if calls["n"] < 3:
                raise RuntimeError("tạm thời")
            return "ok"

        result = await client._retry(flaky, attempts=3)
        assert result == "ok"
        assert calls["n"] == 3

    async def test_raises_llmerror_after_exhausting(self):
        client = LLMClient()

        async def always_fail():
            raise RuntimeError("hỏng luôn")

        with pytest.raises(LLMError):
            await client._retry(always_fail, attempts=2)


def test_ollama_client_uses_dummy_key():
    from app.schemas import ModelConfig

    client = LLMClient()
    c = client._client(ModelConfig(url="http://ollama:11434/v1", name="llama3.2"))
    assert c.api_key == "ollama"


class TestBaseUrlAllowlist:
    def test_rejects_attacker_host(self):
        from app.schemas import ModelConfig

        client = LLMClient()
        # SSRF/lộ key: host lạ phải bị từ chối TRƯỚC khi gắn OPENAI_API_KEY
        with pytest.raises(LLMError):
            client._client(ModelConfig(url="http://attacker.example/v1", name="gpt-4o-mini"))

    def test_allows_openai(self):
        from app.schemas import ModelConfig

        client = LLMClient()
        c = client._client(ModelConfig(url="https://api.openai.com/v1", name="gpt-4o-mini"))
        assert c is not None
