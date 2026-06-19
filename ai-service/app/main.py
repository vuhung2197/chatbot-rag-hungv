"""Điểm vào FastAPI cho ai-service.

T1: /health smoke. T2: /health kiểm tra Postgres + Redis; lifespan đóng pool/redis
gọn gàng khi shutdown. Các route /chat, /chat/stream thêm ở các task sau.
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI

from app.config import get_settings
from app.rag.pipeline import RagPipeline, get_pipeline
from app.schemas import ChatRequest, ChatResponse
from app.services.cache import close_redis, ping_redis
from app.services.db import close_pool, ping_db

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # startup: pool tạo lazy ở lần dùng đầu — không ép kết nối ở đây để service
    # vẫn lên được khi DB/Redis chưa sẵn sàng (health sẽ báo degraded).
    yield
    # shutdown: dọn tài nguyên
    await close_pool()
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Lõi AI (intent + RAG + agent) — chạy hybrid song song backend Node.",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict:
    """Liveness + readiness: kiểm tra song song Postgres & Redis.

    Luôn trả HTTP 200 (liveness); field `status` = "ok" khi mọi dependency up,
    ngược lại "degraded" + chỉ rõ thành phần hỏng trong `checks`.
    """
    db_ok, redis_ok = await asyncio.gather(ping_db(), ping_redis())
    checks = {
        "database": "up" if db_ok else "down",
        "redis": "up" if redis_ok else "down",
    }
    return {
        "status": "ok" if db_ok and redis_ok else "degraded",
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "checks": checks,
    }


def pipeline_dep() -> RagPipeline:
    """Depends để test override bằng pipeline giả."""
    return get_pipeline()


@app.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest, pipeline: Annotated[RagPipeline, Depends(pipeline_dep)]
) -> ChatResponse:
    """T6: định tuyến tạm coi mọi câu là KNOWLEDGE (RAG). Intent/agent thêm ở T7–T9.

    Không có chunk liên quan -> trả thông báo lịch sự (web fallback ở T9).
    """
    t0 = time.monotonic()
    history = [m.model_dump() for m in req.history]
    result = await pipeline.answer(req.message, model=req.model, history=history)

    if not result.has_context:
        return ChatResponse(
            reply="Tôi chưa tìm thấy thông tin liên quan trong tài liệu nội bộ.",
            source_type="kb_empty",
            citations=[],
            meta={"intent": "KNOWLEDGE", "total_chunks": 0, "processing_ms": _ms(t0)},
        )

    meta = {
        "intent": "KNOWLEDGE",
        "total_chunks": len(result.chunks_used),
        "processing_ms": _ms(t0),
    }
    if req.debug:
        meta["context"] = result.context
    return ChatResponse(
        reply=result.reply,
        source_type="knowledge",
        citations=[c.model_dump() for c in result.citations],
        meta=meta,
    )


def _ms(start: float) -> int:
    return round((time.monotonic() - start) * 1000)
