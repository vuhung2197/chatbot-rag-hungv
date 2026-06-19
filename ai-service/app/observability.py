"""Observability: request-id + structured timing log cho mỗi request.

Mỗi request được gán request_id (trace xuyên log), đo thời lượng, log 1 dòng có cấu trúc.
Header X-Request-ID trả về client để đối chiếu khi debug production.
"""

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("ai-service.request")

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex[:12]
        request.state.request_id = request_id
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
