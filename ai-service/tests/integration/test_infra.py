"""Integration test (cần Postgres + Redis thật chạy).

Chạy: `uv run pytest -m integration`. Bỏ qua mặc định.
Đọc cấu hình kết nối từ .env (DB_HOST/REDIS_HOST...). Khi chạy ngoài docker,
đặt DB_HOST=localhost, REDIS_HOST=127.0.0.1 (port đã map ra host).
"""

import pytest

from app.services.cache import ping_redis
from app.services.db import fetchval, ping_db

pytestmark = pytest.mark.integration


async def test_db_reachable():
    assert await ping_db() is True


async def test_redis_reachable():
    assert await ping_redis() is True


async def test_knowledge_chunks_has_rows():
    # Bảng vector dùng cho RAG — phải có dữ liệu đã index sẵn
    count = await fetchval("SELECT count(*) FROM knowledge_chunks")
    assert count is not None and count > 0
