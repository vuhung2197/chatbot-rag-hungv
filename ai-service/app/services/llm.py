"""LLM client: OpenAI-compatible + Ollama, có streaming, retry, parse JSON.

Một client duy nhất cho cả hai: OpenAI và Ollama đều nói giao thức Chat Completions,
chỉ khác `base_url`. Ollama dùng api_key giả ('ollama'). Wrapper này là chỗ DUY NHẤT
gọi LLM cho các bước sinh câu trả lời — tách khỏi logic intent/RAG để dễ test & thay model.
"""

import asyncio
import json
import logging
import re
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any, TypeVar

from openai import AsyncOpenAI

from app.config import Settings, get_settings
from app.schemas import ModelConfig

logger = logging.getLogger(__name__)

T = TypeVar("T")

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


class LLMError(Exception):
    """Lỗi gọi LLM sau khi đã retry, hoặc output không hợp lệ."""


def extract_json(text: str) -> dict[str, Any]:
    """Bóc object JSON đầu tiên từ output LLM (chịu được fence ```json``` & prose thừa).

    Model nhỏ/reasoning hay kèm văn bản quanh JSON -> lấy từ '{' đầu tới '}' cuối.
    """
    if not text:
        raise LLMError("LLM trả về rỗng, không có JSON")
    match = _JSON_RE.search(text)
    if not match:
        raise LLMError(f"Không tìm thấy JSON trong output: {text[:120]!r}")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as e:
        raise LLMError(f"JSON không parse được: {e}") from e


def _is_ollama(url: str) -> bool:
    return "11434" in url or "ollama" in url


class LLMClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._clients: dict[str, AsyncOpenAI] = {}  # cache theo base_url

    def _client(self, model: ModelConfig) -> AsyncOpenAI:
        url = model.url
        if url not in self._clients:
            api_key = "ollama" if _is_ollama(url) else (self._settings.openai_api_key or "missing")
            self._clients[url] = AsyncOpenAI(base_url=url, api_key=api_key)
        return self._clients[url]

    async def _retry(self, fn: Callable[[], Awaitable[T]], attempts: int = 3) -> T:
        """Gọi lại khi lỗi tạm thời (timeout/ratelimit/5xx). Backoff tuyến tính."""
        last: Exception | None = None
        for i in range(attempts):
            try:
                return await fn()
            except Exception as e:  # noqa: BLE001 - bọc mọi lỗi LLM để retry rồi nâng LLMError
                last = e
                logger.warning("LLM call failed (lần %d/%d): %s", i + 1, attempts, e)
                if i < attempts - 1:
                    await asyncio.sleep(0.5 * (i + 1))
        raise LLMError(f"LLM thất bại sau {attempts} lần: {last}") from last

    async def generate(
        self,
        model: ModelConfig,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str:
        """Sinh câu trả lời (non-stream). Trả về text (chuỗi rỗng nếu model không trả nội dung)."""

        async def _call() -> str:
            resp = await self._client(model).chat.completions.create(
                model=model.name,
                messages=messages,  # type: ignore[arg-type]
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content or ""

        return await self._retry(_call)

    async def stream(
        self,
        model: ModelConfig,
        messages: list[dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> AsyncIterator[str]:
        """Stream từng delta token. Không retry giữa chừng stream (tránh lặp token)."""
        stream = await self._client(model).chat.completions.create(
            model=model.name,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta


_default_client: LLMClient | None = None


def get_llm() -> LLMClient:
    global _default_client
    if _default_client is None:
        _default_client = LLMClient()
    return _default_client
