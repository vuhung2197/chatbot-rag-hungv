"""Web search qua Tavily (search engine tối ưu cho LLM) — mirror webSearch.service.js.

Trả context dạng text sạch để LLM tổng hợp. Không có key / lỗi -> None (degrade).
"""

import logging

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

_TAVILY_URL = "https://api.tavily.com/search"


class WebSearchClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self._settings.tavily_api_key)

    async def search(self, query: str, max_results: int = 5) -> str | None:
        """Tìm web; trả context text (kèm URL để trích nguồn) hoặc None nếu không dùng được."""
        if not self.enabled:
            logger.info("web search disabled (no TAVILY_API_KEY)")
            return None
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    _TAVILY_URL,
                    json={
                        "api_key": self._settings.tavily_api_key,
                        "query": query,
                        "max_results": max_results,
                        "include_answer": True,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:  # noqa: BLE001 - lỗi web -> degrade, không ném
            logger.warning("web search failed: %s", e)
            return None
        return self._format(data)

    @staticmethod
    def _format(data: dict) -> str | None:
        parts: list[str] = []
        if data.get("answer"):
            parts.append(f"Tóm tắt: {data['answer']}")
        for r in data.get("results", []):
            parts.append(f"- [{r.get('title', '')}]({r.get('url', '')})\n  {r.get('content', '')}")
        return "\n\n".join(parts) if parts else None


_default: WebSearchClient | None = None


def get_web_search() -> WebSearchClient:
    global _default
    if _default is None:
        _default = WebSearchClient()
    return _default
