"""Kết nối PostgreSQL bằng asyncpg.

Dùng chung DB với backend Node (cùng `knowledge_chunks`, pgvector). Pool async
singleton; an toàn khi DB tạm down (caller dùng ping_db / try-except).
"""

import logging

import asyncpg

from app.config import get_settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Trả pool singleton, tạo lần đầu khi cần."""
    global _pool
    if _pool is None:
        s = get_settings()
        _pool = await asyncpg.create_pool(
            host=s.db_host,
            port=s.db_port,
            user=s.db_user,
            password=s.db_password,
            database=s.db_database,
            min_size=1,
            max_size=10,
            command_timeout=10,
        )
        logger.info("PostgreSQL pool created (%s:%s/%s)", s.db_host, s.db_port, s.db_database)
    return _pool


async def fetchval(query: str, *args):
    """Chạy query trả về 1 giá trị scalar (vd count)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval(query, *args)


async def ping_db() -> bool:
    """Health check: trả True nếu kết nối + query được, False nếu lỗi (không ném)."""
    try:
        result = await fetchval("SELECT 1")
        return result == 1
    except Exception as e:  # noqa: BLE001 - health check nuốt mọi lỗi có chủ đích
        logger.warning("DB ping failed: %s", e)
        return False


async def close_pool() -> None:
    """Đóng pool khi shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL pool closed")
