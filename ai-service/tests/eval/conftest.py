"""Reset pool/redis sau mỗi eval test — như tests/integration/conftest.py.

Tránh pool asyncpg tạo ở loop test này rò sang loop test khác ("Event loop is closed").
"""

import pytest

from app.services.cache import close_redis
from app.services.db import close_pool


@pytest.fixture(autouse=True)
async def _reset_singletons():
    yield
    await close_pool()
    await close_redis()
