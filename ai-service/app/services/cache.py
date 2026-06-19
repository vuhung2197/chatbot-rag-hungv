"""Kết nối Redis (redis-py asyncio).

Dùng chung Redis với backend Node. Client singleton; ping an toàn (không ném).
Các helper cache (intent...) thêm ở T7.
"""

import logging

import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    """Trả client singleton (decode_responses=True để làm việc với str)."""
    global _client
    if _client is None:
        s = get_settings()
        _client = aioredis.Redis(
            host=s.redis_host,
            port=s.redis_port,
            decode_responses=True,
            socket_connect_timeout=3,
        )
        logger.info("Redis client created (%s:%s)", s.redis_host, s.redis_port)
    return _client


async def ping_redis() -> bool:
    """Health check: True nếu Redis trả PONG, False nếu lỗi (không ném)."""
    try:
        return bool(await get_redis().ping())
    except Exception as e:  # noqa: BLE001 - health check nuốt mọi lỗi có chủ đích
        logger.warning("Redis ping failed: %s", e)
        return False


async def get_cached(key: str) -> str | None:
    """Đọc cache; trả None nếu miss hoặc Redis lỗi (degrade, không ném)."""
    try:
        return await get_redis().get(key)
    except Exception as e:  # noqa: BLE001 - cache lỗi thì coi như miss
        logger.warning("cache get failed (%s): %s", key, e)
        return None


async def set_cached(key: str, value: str, ttl_sec: int) -> None:
    """Ghi cache kèm TTL; nuốt lỗi Redis (không chặn luồng chính)."""
    try:
        await get_redis().set(key, value, ex=ttl_sec)
    except Exception as e:  # noqa: BLE001 - cache lỗi thì bỏ qua
        logger.warning("cache set failed (%s): %s", key, e)


async def close_redis() -> None:
    """Đóng kết nối khi shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("Redis client closed")
