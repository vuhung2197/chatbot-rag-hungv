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

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse

from app.agents.graph import AgentGraph, get_agent
from app.config import get_settings
from app.observability import RequestContextMiddleware, RequestIdFilter
from app.schemas import ChatRequest, ChatResponse
from app.services.cache import close_redis, ping_redis
from app.services.db import close_pool, ping_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s",
)
# Gắn filter vào mọi handler root -> mọi log record có request_id (F7.1).
for _h in logging.getLogger().handlers:
    _h.addFilter(RequestIdFilter())
logger = logging.getLogger(__name__)
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
app.add_middleware(RequestContextMiddleware)


@app.get("/health")
async def health(x_internal_token: str | None = Header(default=None)) -> dict:
    """Liveness + readiness (luôn 200).

    Caller chưa auth -> chỉ `status` (tránh lộ version/environment/deps cho recon).
    Khi token chưa cấu hình (dev) hoặc khớp -> trả chi tiết đầy đủ.
    """
    db_ok, redis_ok = await asyncio.gather(ping_db(), ping_redis())
    status = "ok" if db_ok and redis_ok else "degraded"

    expected = settings.internal_api_token
    detailed = (not expected) or (x_internal_token == expected)
    if not detailed:
        return {"status": status}

    return {
        "status": status,
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "checks": {"database": "up" if db_ok else "down", "redis": "up" if redis_ok else "down"},
    }


def agent_dep() -> AgentGraph:
    """Depends để test override bằng agent giả."""
    return get_agent()


def verify_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    """Chặn truy cập trực tiếp: nếu INTERNAL_API_TOKEN được đặt, request phải kèm header khớp.

    Service không tự có auth user; đây là lớp shared-secret giữa Node gateway ↔ Python.
    Để rỗng (dev) -> bỏ qua. Đặt trong prod + chỉ Node biết token.
    """
    expected = settings.internal_api_token
    if expected and x_internal_token != expected:
        raise HTTPException(status_code=401, detail="invalid internal token")


def _ms(start: float) -> int:
    return round((time.monotonic() - start) * 1000)


def _meta(state: dict, t0: float) -> dict:
    return {
        "intent": state.get("intent"),
        "source_type": state.get("source_type"),
        "total_chunks": len(state.get("chunks", [])),
        "processing_ms": _ms(t0),
    }


@app.get("/tools", dependencies=[Depends(verify_internal_token)])
async def list_tools() -> dict:
    """Liệt kê MCP tool khả dụng (cho UI dropdown chọn server/tool). Rỗng nếu chưa cấu hình."""
    from app.services.mcp_client import get_mcp_client

    tools = await get_mcp_client().list_tools()
    return {
        "servers": sorted({t.server for t in tools}),
        "tools": [
            {"server": t.server, "name": t.name, "description": t.description} for t in tools
        ],
    }


@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_internal_token)])
async def chat(req: ChatRequest, agent: Annotated[AgentGraph, Depends(agent_dep)]) -> ChatResponse:
    """Chạy agent graph (đồng bộ), trả lời kèm intent + citations."""
    t0 = time.monotonic()
    history = [m.model_dump() for m in req.history]
    try:
        state = await agent.run(
            req.message,
            model=req.model,
            history=history,
            user_id=req.user_id,
            auth_token=req.auth_token,
            force_agent=req.force_agent,
            mcp_server=req.mcp_server,
        )
    except Exception:
        # F5 (D1): lỗi -> 200 + ChatResponse có cấu trúc (source_type=error), KHÔNG
        # 500 trần, KHÔNG leak chi tiết. Node persistence/UI xử nhất quán happy-path.
        logger.exception("/chat lỗi")
        return ChatResponse(
            reply="Đã có lỗi khi xử lý yêu cầu. Vui lòng thử lại.",
            source_type="error",
            citations=[],
            meta={"source_type": "error", "processing_ms": _ms(t0)},
        )
    return ChatResponse(
        reply=state.get("reply", ""),
        source_type=state.get("source_type", "unknown"),
        citations=state.get("citations", []),
        meta=_meta(state, t0),
    )


def _sse(event_type: str, **data) -> str:
    """Định dạng 1 SSE event (mirror format Node: {type, ...})."""
    return f"data: {json.dumps({'type': event_type, **data}, ensure_ascii=False)}\n\n"


@app.post("/chat/stream", dependencies=[Depends(verify_internal_token)])
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
                    req.message,
                    model=req.model,
                    history=history,
                    on_token=on_token,
                    user_id=req.user_id,
                    auth_token=req.auth_token,
                    force_agent=req.force_agent,
                    mcp_server=req.mcp_server,
                )
            finally:
                queue.put_nowait(_DONE)  # type: ignore[arg-type]

        task = asyncio.create_task(run())
        try:
            yield _sse("status", content="Đang xử lý...")
            while True:
                item = await queue.get()
                if item is _DONE:
                    break
                yield _sse("token", content=item)
            state = await task  # re-raise lỗi từ agent.run (nếu có)
            yield _sse("text", content=state.get("reply", ""))
            yield _sse("done", **_meta(state, t0), citations=state.get("citations", []))
        except asyncio.CancelledError:
            raise  # client disconnect / shutdown -> để finally hủy task
        except Exception:
            # F1: lỗi giữa stream -> báo client 1 event 'error' tường minh, KHÔNG leak
            # stacktrace/secret (chi tiết chỉ vào log server).
            logger.exception("stream lỗi giữa chừng")
            yield _sse("error", content="Đã có lỗi khi xử lý yêu cầu. Vui lòng thử lại.")
        finally:
            # F2: client disconnect (GeneratorExit) hoặc lỗi -> hủy task nền, tránh
            # rò task / LLM call mồ côi.
            if not task.done():
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

    return StreamingResponse(event_gen(), media_type="text/event-stream")
