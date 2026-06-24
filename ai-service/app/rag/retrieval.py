"""Truy vấn vector trên pgvector — TỰ VIẾT SQL (mục tiêu học sâu).

Dùng toán tử cosine distance `<=>` của pgvector; similarity = 1 - distance.
Tái dùng đúng bảng `knowledge_chunks` mà backend Node đã index.
"""

import logging

from pydantic import BaseModel

from app.services.db import get_pool
from app.services.embeddings import EmbeddingClient, get_embeddings

logger = logging.getLogger(__name__)


class RetrievedChunk(BaseModel):
    id: int
    title: str
    content: str
    score: float  # cosine similarity trong [0, 1], cao = gần hơn


def to_vector_literal(vec: list[float]) -> str:
    """Định dạng literal pgvector: '[v1,v2,...]' để cast `$1::vector`.

    (Trùng định dạng JSON array nên Node JSON.stringify cũng ra giống vậy.)
    """
    return "[" + ",".join(repr(float(x)) for x in vec) + "]"


# SQL tự viết: similarity = 1 - cosine_distance; lọc theo ngưỡng; sắp theo gần nhất.
_SEARCH_SQL = """
    SELECT id, title, content, 1 - (embedding <=> $1::vector) AS score
    FROM knowledge_chunks
    WHERE 1 - (embedding <=> $1::vector) > $2
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $3
"""


class Retriever:
    def __init__(self, embeddings: EmbeddingClient | None = None) -> None:
        self._embeddings = embeddings or get_embeddings()

    async def retrieve(
        self, query: str, top_k: int = 5, threshold: float = 0.5
    ) -> list[RetrievedChunk]:
        """Embed câu hỏi -> tìm top_k chunk gần nhất vượt ngưỡng similarity."""
        vec = await self._embeddings.embed(query)
        literal = to_vector_literal(vec)
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(_SEARCH_SQL, literal, threshold, top_k)
        return [
            RetrievedChunk(id=r["id"], title=r["title"], content=r["content"], score=r["score"])
            for r in rows
        ]


_default: Retriever | None = None


def get_retriever() -> Retriever:
    global _default
    if _default is None:
        _default = Retriever()
    return _default
