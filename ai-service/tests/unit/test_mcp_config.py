"""Unit test T1 — config MCP: allowlist server + bound (F1.1 config, F5.4).

Server cấu hình qua list MCPServerConfig; enabled_mcp_servers() lọc server bật +
hợp lệ (http cần endpoint, stdio cần command). Bound mặc định hợp lý.
"""

from app.config import MCPServerConfig, Settings


def test_default_bounds():
    s = Settings()
    assert s.mcp_max_iterations == 5
    assert s.mcp_tool_timeout_sec == 20
    assert s.mcp_servers == []
    assert s.enabled_mcp_servers() == []


def test_enabled_filter_keeps_valid_enabled_only():
    s = Settings(
        mcp_servers=[
            {"name": "web", "transport": "http", "endpoint": "https://mcp.example/sse"},
            {"name": "off", "transport": "http", "endpoint": "https://x/sse", "enabled": False},
            {"name": "bad_http", "transport": "http"},  # thiếu endpoint -> loại
            {"name": "fs", "transport": "stdio", "command": "uvx mcp-fs"},
            {"name": "bad_stdio", "transport": "stdio"},  # thiếu command -> loại
        ]
    )
    names = [x.name for x in s.enabled_mcp_servers()]
    assert names == ["web", "fs"]


def test_server_validity_rules():
    assert MCPServerConfig(name="a", transport="http", endpoint="https://x/sse").is_valid()
    assert not MCPServerConfig(name="a", transport="http").is_valid()
    assert MCPServerConfig(name="a", transport="stdio", command="x").is_valid()
    assert not MCPServerConfig(name="a", transport="unknown", endpoint="https://x").is_valid()
