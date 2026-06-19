"""Rerank context — TỰ VIẾT (học sâu).

Vector score đo tương đồng ngữ nghĩa nhưng bỏ sót khớp từ khóa chính xác (tên riêng,
thuật ngữ). Ta kết hợp: final = alpha*vector + (1-alpha)*lexical_overlap.
Hàm THUẦN (không I/O) -> unit test dễ, giải thích được khi phỏng vấn.
"""

import re

from app.rag.retrieval import RetrievedChunk

_WORD_RE = re.compile(r"\w+", re.UNICODE)


def tokenize(text: str) -> set[str]:
    """Tách token chữ-thường (Unicode-aware, gồm chữ tiếng Việt có dấu)."""
    return {t.lower() for t in _WORD_RE.findall(text)}


def lexical_overlap(query: str, content: str) -> float:
    """Tỉ lệ token câu hỏi xuất hiện trong content, trong [0, 1]."""
    q = tokenize(query)
    if not q:
        return 0.0
    c = tokenize(content)
    return len(q & c) / len(q)


def rerank(query: str, chunks: list[RetrievedChunk], alpha: float = 0.7) -> list[RetrievedChunk]:
    """Sắp lại chunk theo điểm kết hợp ngữ nghĩa + từ vựng (giảm dần).

    alpha: trọng số vector score (mặc định 0.7 nghiêng về ngữ nghĩa).
    Trả chunk mới với `score` = điểm kết hợp (không sửa input).
    """

    def combined(c: RetrievedChunk) -> RetrievedChunk:
        lex = lexical_overlap(query, f"{c.title} {c.content}")
        final = alpha * c.score + (1 - alpha) * lex
        return c.model_copy(update={"score": final})

    return sorted((combined(c) for c in chunks), key=lambda c: c.score, reverse=True)
