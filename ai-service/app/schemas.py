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
    content: str = Field(max_length=10000)  # F6.2: chặn DoS qua message lớn


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)
    model: ModelConfig | None = None
    # F6.1: cap số lượng history -> chặn prompt phình + DoS.
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    debug: bool = False
    # Định danh do Node gateway forward (USER_PROGRESS gọi ngược Node API).
    user_id: int | None = None
    auth_token: str | None = None


class ChatResponse(BaseModel):
    reply: str
    source_type: str
    citations: list = Field(default_factory=list)
    meta: dict = Field(default_factory=dict)
