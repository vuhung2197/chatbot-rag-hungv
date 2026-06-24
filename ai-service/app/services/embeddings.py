"""Embedding client — dùng OpenAI text-embedding-3-small (1536 chiều).

PHẢI khớp model đã index `knowledge_chunks` để vector tương thích (không re-index).
"""

import logging

from openai import AsyncOpenAI

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class EmbeddingClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client = AsyncOpenAI(api_key=self._settings.openai_api_key or "missing")

    async def embed(self, text: str) -> list[float]:
        """Trả vector embedding cho 1 đoạn text."""
        resp = await self._client.embeddings.create(
            model=self._settings.embedding_model,
            input=text,
        )
        return resp.data[0].embedding


_default: EmbeddingClient | None = None


def get_embeddings() -> EmbeddingClient:
    global _default
    if _default is None:
        _default = EmbeddingClient()
    return _default
