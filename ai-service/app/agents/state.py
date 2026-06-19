"""State của agent graph (LangGraph).

TypedDict total=False: node chỉ trả về các field nó cập nhật, LangGraph merge vào state.
"""

from collections.abc import Callable
from typing import Any, TypedDict

from app.schemas import ModelConfig


class GraphState(TypedDict, total=False):
    # input
    message: str
    history: list[dict[str, str]]
    model: ModelConfig
    on_token: Callable[[str], None] | None
    user_id: int | None
    auth_token: str | None
    # router đặt
    intent: str
    reasoning: str
    # node trả lời đặt
    reply: str
    source_type: str
    citations: list[Any]
    chunks: list[Any]
