"""Điểm vào FastAPI cho ai-service.

/health: liveness + DB/Redis. /chat: chạy agent graph (đủ 5 intent). /chat/stream: SSE
stream token. Định tuyến/RAG/web/agent nằm trong app.agents — main chỉ là lớp HTTP.
"""

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.responses import StreamingResponse

from app.agents.graph import AgentGraph, get_agent
from app.config import get_settings
from app.schemas import ChatRequest, ChatResponse
from app.services.cache import close_redis, ping_redis
from app.services.db import close_pool, ping_db

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # startup: pool/redis tạo lazy -> service vẫn lên khi dep chưa sẵn sàng.
    yield
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
    """Liveness + readiness: kiểm tra song song Postgres & Redis (luôn 200)."""
    db_ok, redis_ok = await asyncio.gather(ping_db(), ping_redis())
    checks = {"database": "up" if db_ok else "down", "redis": "up" if redis_ok else "down"}
    return {
        "status": "ok" if db_ok and redis_ok else "degraded",
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "checks": checks,
    }


def agent_dep() -> AgentGraph:
    """Depends để test override bằng agent giả."""
    return get_agent()


def _ms(start: float) -> int:
    return round((time.monotonic() - start) * 1000)


def _meta(state: dict, t0: float) -> dict:
    return {
        "intent": state.get("intent"),
        "source_type": state.get("source_type"),
        "total_chunks": len(state.get("chunks", [])),
        "processing_ms": _ms(t0),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, agent: Annotated[AgentGraph, Depends(agent_dep)]) -> ChatResponse:
    """Chạy agent graph (đồng bộ), trả lời kèm intent + citations."""
    t0 = time.monotonic()
    history = [m.model_dump() for m in req.history]
    state = await agent.run(req.message, model=req.model, history=history)
    return ChatResponse(
        reply=state.get("reply", ""),
        source_type=state.get("source_type", "unknown"),
        citations=state.get("citations", []),
        meta=_meta(state, t0),
    )


def _sse(event_type: str, **data) -> str:
    """Định dạng 1 SSE event (mirror format Node: {type, ...})."""
    return f"data: {json.dumps({'type': event_type, **data}, ensure_ascii=False)}\n\n"


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest, agent: Annotated[AgentGraph, Depends(agent_dep)]):
    """SSE: stream từng token (event 'token'), rồi 'text' (đầy đủ) + 'done' (meta)."""
    history = [m.model_dump() for m in req.history]

    async def event_gen() -> AsyncIterator[str]:
        t0 = time.monotonic()
        queue: asyncio.Queue[str] = asyncio.Queue()
        _DONE = object()

        def on_token(delta: str) -> None:
            queue.put_nowait(delta)

        async def run():
            try:
                return await agent.run(
                    req.message, model=req.model, history=history, on_token=on_token
                )
            finally:
                queue.put_nowait(_DONE)  # type: ignore[arg-type]

        task = asyncio.create_task(run())
        yield _sse("status", content="Đang xử lý...")
        while True:
            item = await queue.get()
            if item is _DONE:
                break
            yield _sse("token", content=item)
        state = await task
        yield _sse("text", content=state.get("reply", ""))
        yield _sse("done", **_meta(state, t0), citations=state.get("citations", []))

    return StreamingResponse(event_gen(), media_type="text/event-stream")
