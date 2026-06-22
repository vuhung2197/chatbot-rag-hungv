"""Observability: request-id + structured timing log cho mỗi request.

Mỗi request được gán request_id (trace xuyên log), đo thời lượng, log 1 dòng có cấu trúc.
Header X-Request-ID trả về client để đối chiếu khi debug production.
"""

import contextvars
import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("ai-service.request")

REQUEST_ID_HEADER = "X-Request-ID"

# Contextvar trace request_id xuyên mọi log của 1 request (degrade/error ở node/service).
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """Bơm request_id (từ contextvar) vào mọi log record để format `[rid]`."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex[:12]
        request.state.request_id = request_id
        token = request_id_var.set(request_id)
        start = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.monotonic() - start) * 1000)
            logger.exception(
                "rid=%s %s %s -> ERROR (%dms)",
                request_id,
                request.method,
                request.url.path,
                duration_ms,
            )
            raise
        finally:
            request_id_var.reset(token)
        duration_ms = round((time.monotonic() - start) * 1000)
        logger.info(
            "rid=%s %s %s -> %d (%dms)",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
