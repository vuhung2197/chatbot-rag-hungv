"""Client gọi ngược backend Node — giữ business logic (vd tiến độ học) ở 1 nơi.

USER_PROGRESS: Python lấy dữ liệu tiến độ qua endpoint Node (sẽ thêm ở phase tích hợp
Node — T11). Endpoint chưa tồn tại -> trả None (degrade), node sẽ báo chưa khả dụng.
"""

import logging

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class NodeApiClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    async def get_user_progress(self, user_id: int, auth_token: str | None = None) -> dict | None:
        """GET tiến độ học của user. Trả dict, hoặc None nếu lỗi/endpoint chưa có."""
        url = f"{self._settings.node_api_url}/internal/user-progress/{user_id}"
        headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, headers=headers)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:  # noqa: BLE001 - chưa có endpoint / lỗi -> degrade
            logger.warning("node_api get_user_progress failed: %s", e)
            return None


_default: NodeApiClient | None = None


def get_node_api() -> NodeApiClient:
    global _default
    if _default is None:
        _default = NodeApiClient()
    return _default
