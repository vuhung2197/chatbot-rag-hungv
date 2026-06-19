"""Điểm vào FastAPI cho ai-service.

T1: /health smoke. T2: /health kiểm tra Postgres + Redis; lifespan đóng pool/redis
gọn gàng khi shutdown. Các route /chat, /chat/stream thêm ở các task sau.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
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
