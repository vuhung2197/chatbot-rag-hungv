"""Cấu hình tập trung cho ai-service.

Đọc từ biến môi trường / file .env (Pydantic Settings). Các giá trị DB/Redis/LLM
sẽ được dùng dần ở các task sau (T2 trở đi); ở T1 chỉ cần khung + metadata service.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


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


@lru_cache
def get_settings() -> Settings:
    """Singleton settings (cache để khỏi đọc .env nhiều lần)."""
    return Settings()
