"""Cấu hình tập trung cho ai-service.

Đọc từ biến môi trường / file .env (Pydantic Settings). Các giá trị DB/Redis/LLM
sẽ được dùng dần ở các task sau (T2 trở đi); ở T1 chỉ cần khung + metadata service.
"""

from functools import lru_cache

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class MCPServerConfig(BaseModel):
    """Khai báo 1 MCP server agent được phép kết nối (allowlist, config-driven).

    - transport: "http" (streamable-HTTP/SSE remote) cần `endpoint`; "stdio" cần `command`.
    - api_key_env: TÊN biến môi trường chứa key (không lưu key trực tiếp ở đây).
    """

    name: str
    transport: str = "http"
    endpoint: str | None = None
    command: str | None = None
    api_key_env: str | None = None
    enabled: bool = True

    def is_valid(self) -> bool:
        if self.transport == "http":
            return bool(self.endpoint)
        if self.transport == "stdio":
            return bool(self.command)
        return False


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # bỏ qua biến môi trường lạ thay vì lỗi
    )

    # ── Service ─────────────────────────────────────────────
    app_name: str = "ai-service"
    version: str = "0.1.0"
    environment: str = "development"

    # ── Postgres (dùng từ T2) ───────────────────────────────
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "postgres"
    db_password: str = "postgres123"
    db_database: str = "chatbot"

    # ── Redis (dùng từ T2) ──────────────────────────────────
    redis_host: str = "127.0.0.1"
    redis_port: int = 6379

    # ── LLM (dùng từ T3) ────────────────────────────────────
    openai_api_key: str = ""
    embedding_model: str = "text-embedding-3-small"  # khớp vector đã index (1536 chiều)
    ollama_base_url: str = "http://localhost:11434"
    # Allowlist host base_url LLM — chặn SSRF/lộ key qua model.url do client gửi.
    # Host ngoài danh sách -> từ chối (xem services/llm.py).
    allowed_llm_hosts: str = "api.openai.com,localhost,127.0.0.1,ollama"
    # Timeout (giây) cho mỗi call LLM. max_retries=0 phía SDK -> _retry là cơ chế
    # retry duy nhất (tránh 3×3). Tránh treo request theo default SDK (600s).
    llm_timeout_sec: int = 30

    # ── Bảo mật service-to-service ──────────────────────────
    # Nếu đặt, mọi request /chat,/chat/stream phải kèm header X-Internal-Token khớp.
    # Để rỗng (dev) -> bỏ qua kiểm tra. Node gateway gửi token này.
    internal_api_token: str = ""

    # ── Intent classifier (T7) ──────────────────────────────
    intent_cache_ttl_sec: int = 86400  # 1 ngày; câu hỏi lặp khỏi gọi lại LLM

    # ── Web search (T9) ─────────────────────────────────────
    tavily_api_key: str = ""

    # ── Node API (T9: gọi ngược cho USER_PROGRESS) ──────────
    node_api_url: str = "http://localhost:3001"

    # ── MCP (Agentic RAG) ───────────────────────────────────
    # Allowlist server agent được phép kết nối (config-driven). Set qua env MCP_SERVERS
    # dạng JSON list. Rỗng = không có MCP (agent degrade về RAG thường).
    mcp_servers: list[MCPServerConfig] = []
    mcp_max_iterations: int = 5  # trần vòng lặp tool/request -> chặn chi phí + lặp vô hạn
    mcp_tool_timeout_sec: int = 20  # timeout mỗi tool-call

    def enabled_mcp_servers(self) -> list[MCPServerConfig]:
        """Server đang bật + cấu hình hợp lệ (bỏ qua disabled/thiếu field)."""
        return [s for s in self.mcp_servers if s.enabled and s.is_valid()]


@lru_cache
def get_settings() -> Settings:
    """Singleton settings (cache để khỏi đọc .env nhiều lần)."""
    return Settings()
