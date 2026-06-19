"""RAG pipeline: retrieve -> rerank -> fuse -> generate -> cite.

Ghép các thành phần tự viết (retrieval/rerank) với LLM client. retriever & llm
được inject -> unit test answer() bằng fake, không cần mạng.
"""

import logging
from collections.abc import Callable

from pydantic import BaseModel

from app.rag.rerank import rerank
from app.rag.retrieval import RetrievedChunk, get_retriever
from app.schemas import ModelConfig
from app.services.llm import get_llm

logger = logging.getLogger(__name__)

# Port triết lý prompt từ Node: tận dụng ngữ cảnh kể cả một phần; chỉ nói "không biết"
# khi HOÀN TOÀN không liên quan; trích nguồn; trình bày Markdown.
_SYSTEM_TEMPLATE = (
    "Bạn là một trợ lý AI chuyên nghiệp. Hãy trả lời dựa trên thông tin được cung cấp.\n"
    "Nếu ngữ cảnh có thông tin liên quan (kể cả chỉ một phần), "
    "hãy tổng hợp và trả lời dựa trên đó.\n"
    "Chỉ khi ngữ cảnh HOÀN TOÀN không liên quan đến câu hỏi "
    'thì mới nói "Tôi không biết".\n'
    "Trích dẫn nguồn theo số [n] và trình bày Markdown.\n\n"
    "---\n{context}\n---"
)


class Citation(BaseModel):
    n: int
    id: int
    title: str


class RagResult(BaseModel):
    reply: str
    citations: list[Citation]
    chunks_used: list[RetrievedChunk]
    context: str
    has_context: bool


def fuse(chunks: list[RetrievedChunk]) -> str:
    """Ghép chunk thành context đánh số [n] để model trích nguồn."""
    blocks = []
    for i, c in enumerate(chunks, start=1):
        blocks.append(f"[{i}] {c.title}\n{c.content}")
    return "\n\n".join(blocks)


def cite(chunks: list[RetrievedChunk]) -> list[Citation]:
    """Tạo danh sách citation khớp số [n] trong context."""
    return [Citation(n=i, id=c.id, title=c.title) for i, c in enumerate(chunks, start=1)]


class RagPipeline:
    def __init__(self, retriever=None, llm=None) -> None:
        self._retriever = retriever or get_retriever()
        self._llm = llm or get_llm()

    async def answer(
        self,
        query: str,
        model: ModelConfig | None = None,
        history: list[dict[str, str]] | None = None,
        on_token: Callable[[str], None] | None = None,
        top_k: int = 5,
        threshold: float = 0.5,
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> RagResult:
        """Trả lời grounded trên KB. Nếu không có chunk -> has_context=False (agent lo fallback)."""
        model = model or ModelConfig()
        retrieved = await self._retriever.retrieve(query, top_k=top_k, threshold=threshold)

        if not retrieved:
            return RagResult(reply="", citations=[], chunks_used=[], context="", has_context=False)

        ranked = rerank(query, retrieved)
        context = fuse(ranked)
        messages = [
            {"role": "system", "content": _SYSTEM_TEMPLATE.format(context=context)},
            *(history or [])[-6:],
            {"role": "user", "content": query},
        ]

        if on_token is not None:
            parts: list[str] = []
            async for delta in self._llm.stream(model, messages, temperature, max_tokens):
                parts.append(delta)
                on_token(delta)
            reply = "".join(parts)
        else:
            reply = await self._llm.generate(model, messages, temperature, max_tokens)

        return RagResult(
            reply=reply,
            citations=cite(ranked),
            chunks_used=ranked,
            context=context,
            has_context=True,
        )


_default: RagPipeline | None = None


def get_pipeline() -> RagPipeline:
    global _default
    if _default is None:
        _default = RagPipeline()
    return _default
