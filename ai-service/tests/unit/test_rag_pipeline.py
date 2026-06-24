"""Unit test rerank/fuse/cite (thuần) + pipeline.answer (fake retriever/llm)."""

from collections.abc import AsyncIterator

from app.rag.pipeline import RagPipeline, cite, fuse
from app.rag.rerank import lexical_overlap, rerank, tokenize
from app.rag.retrieval import RetrievedChunk


def _chunk(id, title, content, score):
    return RetrievedChunk(id=id, title=title, content=content, score=score)


class TestRerank:
    def test_tokenize_vietnamese(self):
        assert "kiến" in tokenize("Kiến thức RAG") and "rag" in tokenize("Kiến thức RAG")

    def test_lexical_overlap_full(self):
        assert lexical_overlap("rag là gì", "RAG là gì vậy") == 1.0

    def test_lexical_overlap_none(self):
        assert lexical_overlap("xyz", "hoàn toàn khác") == 0.0

    def test_rerank_boosts_lexical_match(self):
        # b có vector score thấp hơn a nhưng khớp từ khóa -> có thể vượt lên
        a = _chunk(1, "khác", "nội dung không liên quan", 0.81)
        b = _chunk(2, "RAG", "RAG là kỹ thuật truy hồi", 0.79)
        ranked = rerank("RAG là gì", [a, b], alpha=0.5)
        assert ranked[0].id == 2

    def test_rerank_does_not_mutate_input(self):
        a = _chunk(1, "t", "c", 0.9)
        rerank("q", [a])
        assert a.score == 0.9


class TestFuseCite:
    def test_fuse_numbers_sources(self):
        ctx = fuse([_chunk(5, "T1", "C1", 0.9), _chunk(8, "T2", "C2", 0.8)])
        assert "[1] T1" in ctx and "[2] T2" in ctx

    def test_cite_maps_numbers_to_ids(self):
        cites = cite([_chunk(5, "T1", "C1", 0.9), _chunk(8, "T2", "C2", 0.8)])
        assert cites[0].n == 1 and cites[0].id == 5
        assert cites[1].n == 2 and cites[1].id == 8


class _FakeRetriever:
    def __init__(self, chunks):
        self._chunks = chunks

    async def retrieve(self, query, top_k=5, threshold=0.5):
        return self._chunks


class _FakeLLM:
    def __init__(self, text="Câu trả lời [1]"):
        self.text = text
        self.seen_messages = None

    async def generate(self, model, messages, temperature, max_tokens):
        self.seen_messages = messages
        return self.text

    async def stream(self, model, messages, temperature, max_tokens) -> AsyncIterator[str]:
        for tok in self.text.split():
            yield tok + " "


class TestPipeline:
    async def test_answer_with_context(self):
        chunks = [_chunk(1, "RAG", "RAG là truy hồi", 0.9)]
        p = RagPipeline(retriever=_FakeRetriever(chunks), llm=_FakeLLM())
        res = await p.answer("RAG là gì")
        assert res.has_context is True
        assert res.reply == "Câu trả lời [1]"
        assert res.citations[0].id == 1
        # context (đã fuse) chứa nội dung chunk + được nhét vào system prompt
        assert "RAG là truy hồi" in res.context
        assert "RAG là truy hồi" in p._llm.seen_messages[0]["content"]

    async def test_answer_no_context(self):
        p = RagPipeline(retriever=_FakeRetriever([]), llm=_FakeLLM())
        res = await p.answer("câu hỏi lạ")
        assert res.has_context is False
        assert res.chunks_used == [] and res.reply == ""

    async def test_answer_streaming_calls_on_token(self):
        chunks = [_chunk(1, "RAG", "RAG là truy hồi", 0.9)]
        llm = _FakeLLM(text="a b c")
        p = RagPipeline(retriever=_FakeRetriever(chunks), llm=llm)
        tokens = []
        res = await p.answer("RAG là gì", on_token=tokens.append)
        assert len(tokens) == 3
        assert res.reply.strip() == "a b c"
