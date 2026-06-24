"""Unit test T1 — LLM client có timeout + không retry nhân đôi (F3).

AsyncOpenAI mặc định timeout 600s và tự retry; nhân với _retry (3 lần) thành 3×3.
Yêu cầu: client tạo với timeout cấu hình được + max_retries=0 để _retry là cơ chế
retry DUY NHẤT.
"""

from app.config import get_settings
from app.schemas import ModelConfig
from app.services.llm import LLMClient


def test_default_llm_timeout_setting():
    # F3.2: có setting timeout, mặc định hợp lý.
    assert get_settings().llm_timeout_sec == 30


def test_client_created_with_timeout_and_no_sdk_retry():
    # F3.1: AsyncOpenAI nhận timeout từ settings + max_retries=0.
    client = LLMClient()
    c = client._client(ModelConfig(url="https://api.openai.com/v1", name="gpt-4o-mini"))
    assert c.max_retries == 0
    assert float(c.timeout) == float(get_settings().llm_timeout_sec)
