"""Unit test retrieval — phần thuần (định dạng vector literal)."""

from app.rag.retrieval import RetrievedChunk, to_vector_literal


def test_vector_literal_format():
    assert to_vector_literal([0.1, 0.2, 0.3]) == "[0.1,0.2,0.3]"


def test_vector_literal_empty():
    assert to_vector_literal([]) == "[]"


def test_vector_literal_casts_ints_to_float():
    assert to_vector_literal([1, 2]) == "[1.0,2.0]"


def test_retrieved_chunk_model():
    c = RetrievedChunk(id=1, title="t", content="c", score=0.87)
    assert c.score == 0.87 and c.id == 1
