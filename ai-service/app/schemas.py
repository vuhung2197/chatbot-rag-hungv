"""Pydantic schemas dùng chung. Mở rộng dần (request/response /chat ở T6)."""

from pydantic import BaseModel, Field


class ModelConfig(BaseModel):
    """Cấu hình một model LLM. Mirror `{url, name}` phía Node.

    - url: base URL OpenAI-compatible (mặc định OpenAI). Ollama: http://ollama:11434/v1
    - name: tên model (vd 'gpt-4o-mini', 'llama3.2')
    """

    url: str = "https://api.openai.com/v1"
    name: str = "gpt-4o-mini"


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str
