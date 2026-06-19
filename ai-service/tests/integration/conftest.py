"""Fixture cho integration test.

pytest-asyncio tạo event loop MỚI mỗi test function. Pool asyncpg / client Redis
là singleton tạo ở loop của test đầu -> nếu tái dùng ở loop test sau sẽ lỗi
"another operation is in progress". Reset singleton (đóng pool/redis) sau mỗi test
để mỗi test tự tạo lại trên loop của chính nó. Production (uvicorn 1 loop) không bị.
"""

import pytest

from app.services.cache import close_redis
from app.services.db import close_pool


@pytest.fixture(autouse=True)
async def _reset_singletons():
    yield
    await close_pool()
    await close_redis()
