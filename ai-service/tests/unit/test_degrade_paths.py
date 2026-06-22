"""Unit test Phase 2 — degrade an toàn khi external dependency lỗi (F4).

Mọi dep chết phải trả sentinel/câu degrade, KHÔNG bubble 500.
"""

from app.agents.nodes import knowledge_node


class _FailingPipeline:
    """pipeline.answer raise (embeddings/DB chết giữa retrieve)."""

    async def answer(self, query, model=None, history=None, on_token=None, **kw):
        raise RuntimeError("embeddings API down")


# ── T4: KNOWLEDGE degrade khi embeddings/DB lỗi (F4.1, F4.3) ──
async def test_knowledge_node_degrades_when_pipeline_fails():
    # D2: không web-fallback, trả câu xin lỗi degrade, không raise.
    out = await knowledge_node(_state("RAG là gì"), pipeline=_FailingPipeline())
    assert out["source_type"] == "error"
    assert out["reply"]  # có câu trả lời degrade
    assert out["citations"] == []


async def test_knowledge_node_degrade_does_not_leak_detail():
    out = await knowledge_node(_state("x"), pipeline=_FailingPipeline())
    assert "embeddings API down" not in out["reply"]
    assert "RuntimeError" not in out["reply"]


def _state(message, **kw):
    return {"message": message, **kw}


# ── T5: Redis cache + DB ping degrade contract (F4.2, F4.3) ──
from app.services import cache as cache_mod  # noqa: E402
from app.services import db as db_mod  # noqa: E402


def _raise_redis_down():
    raise ConnectionError("redis down")


async def test_cache_get_degrades_to_none_when_redis_down(monkeypatch):
    monkeypatch.setattr(cache_mod, "get_redis", _raise_redis_down)
    assert await cache_mod.get_cached("k") is None


async def test_cache_set_swallows_when_redis_down(monkeypatch):
    monkeypatch.setattr(cache_mod, "get_redis", _raise_redis_down)
    await cache_mod.set_cached("k", "v", 10)  # không raise


async def test_ping_redis_false_when_down(monkeypatch):
    monkeypatch.setattr(cache_mod, "get_redis", _raise_redis_down)
    assert await cache_mod.ping_redis() is False


async def test_ping_db_false_on_error(monkeypatch):
    async def boom(*a, **k):
        raise ConnectionError("db down")

    monkeypatch.setattr(db_mod, "fetchval", boom)
    assert await db_mod.ping_db() is False
