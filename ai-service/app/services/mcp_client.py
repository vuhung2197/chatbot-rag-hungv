"""MCP client — kết nối allowlist server, discover + gọi tool (Agentic RAG).

Endpoint/command CHỈ lấy từ config server-side (allowlist), KHÔNG từ request client
-> chặn SSRF/command-injection. Lỗi/timeout -> ToolResult có cấu trúc (degrade),
KHÔNG raise xuyên agent. Secret lấy từ env (api_key_env), không log.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass

from app.config import MCPServerConfig, Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class ToolDef:
    server: str
    name: str
    description: str
    input_schema: dict


@dataclass
class ToolResult:
    ok: bool
    content: str = ""
    error: str | None = None


@asynccontextmanager
async def _default_session(server: MCPServerConfig):
    """Mở 1 ClientSession đã initialize theo transport cấu hình (stdio | http)."""
    from mcp import ClientSession

    if server.transport == "stdio":
        import shlex

        from mcp import StdioServerParameters, stdio_client

        parts = shlex.split(server.command or "")
        # Truyền env hiện tại để server con đọc được key (vd TAVILY_API_KEY). Mặc định
        # StdioServerParameters dùng env tối thiểu -> server cần key sẽ thiếu.
        params = StdioServerParameters(command=parts[0], args=parts[1:], env=dict(os.environ))
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session
    else:  # http (streamable-HTTP/SSE remote)
        from mcp.client.streamable_http import streamablehttp_client

        headers: dict[str, str] = {}
        if server.api_key_env:
            key = os.environ.get(server.api_key_env)
            if key:
                headers["Authorization"] = f"Bearer {key}"  # secret -> header, không log
        async with streamablehttp_client(server.endpoint, headers=headers) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session


def _extract_text(result) -> str:
    parts: list[str] = []
    for c in getattr(result, "content", []) or []:
        text = getattr(c, "text", None)
        if text:
            parts.append(text)
    return "\n".join(parts)


class McpClient:
    def __init__(self, settings: Settings | None = None, session_factory=None) -> None:
        self._settings = settings or get_settings()
        self._session_factory = session_factory or _default_session
        self._timeout = self._settings.mcp_tool_timeout_sec
        self._cache_ttl = self._settings.mcp_tools_cache_ttl_sec
        self._tools_cache: list[ToolDef] | None = None
        self._tools_cache_at = 0.0

    def _server(self, name: str) -> MCPServerConfig | None:
        # Chỉ server trong allowlist (enabled + hợp lệ). name lạ -> None.
        return next((s for s in self._settings.enabled_mcp_servers() if s.name == name), None)

    async def _discover(self, server: MCPServerConfig) -> list[ToolDef]:
        """Discover tool của 1 server. Lỗi/timeout -> [] (degrade, không làm sập cả discover)."""
        try:
            async with self._session_factory(server) as session:
                result = await session.list_tools()
                return [
                    ToolDef(
                        server=server.name,
                        name=t.name,
                        description=getattr(t, "description", "") or "",
                        input_schema=getattr(t, "inputSchema", {}) or {},
                    )
                    for t in result.tools
                ]
        except Exception as e:  # noqa: BLE001 - 1 server lỗi không được làm sập discover
            logger.warning("MCP discover '%s' lỗi -> bỏ qua: %s", server.name, e)
            return []

    async def list_tools(self, use_cache: bool = True) -> list[ToolDef]:
        """Discover tool từ mọi server bật (SONG SONG). Cache theo TTL -> /tools nhanh."""
        now = asyncio.get_event_loop().time()
        if (
            use_cache
            and self._tools_cache is not None
            and (now - self._tools_cache_at) < self._cache_ttl
        ):
            return self._tools_cache
        servers = self._settings.enabled_mcp_servers()
        results = await asyncio.gather(*[self._discover(s) for s in servers])
        out = [t for sub in results for t in sub]
        self._tools_cache = out
        self._tools_cache_at = now
        return out

    async def call_tool(self, server_name: str, tool_name: str, args: dict | None) -> ToolResult:
        """Gọi tool theo (server allowlist, tool, args), bound timeout. Lỗi -> ToolResult."""
        server = self._server(server_name)
        if server is None:
            return ToolResult(ok=False, error=f"server không cho phép: {server_name}")
        start = asyncio.get_event_loop().time()
        try:
            async with self._session_factory(server) as session:
                result = await asyncio.wait_for(
                    session.call_tool(tool_name, args or {}), timeout=self._timeout
                )
            ms = round((asyncio.get_event_loop().time() - start) * 1000)
            # F6.2: log mỗi tool-call (request_id tự gắn qua RequestIdFilter).
            logger.info("MCP tool '%s/%s' ok (%dms)", server_name, tool_name, ms)
            return ToolResult(ok=True, content=_extract_text(result))
        except TimeoutError:
            logger.warning("MCP call_tool '%s/%s' timeout", server_name, tool_name)
            return ToolResult(ok=False, error="tool timeout")
        except Exception as e:  # noqa: BLE001 - tool lỗi -> degrade, agent xử tiếp
            logger.warning("MCP call_tool '%s/%s' lỗi: %s", server_name, tool_name, e)
            return ToolResult(ok=False, error="tool lỗi")


_default: McpClient | None = None


def get_mcp_client() -> McpClient:
    global _default
    if _default is None:
        _default = McpClient()
    return _default
