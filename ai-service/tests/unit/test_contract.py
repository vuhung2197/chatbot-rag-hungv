"""Contract test: schema Python ↔ payload Node (aiServiceClient.js / chat.schemas.js).

Chống drift giữa 2 phía. Node gửi {message, model:{url,name}, history:[{role,content}]}
và đọc lại {reply, source_type, citations, meta:{intent,source_type,total_chunks,processing_ms}}.
SSE: Node parse các event type status/token/text/done.
"""

import json

from app.main import _sse
from app.schemas import ChatRequest, ChatResponse


def test_request_accepts_node_payload():
    # Đúng hình dạng aiServiceClient.aiChat() gửi đi
    payload = {
        "message": "RAG là gì",
        "model": {"url": "https://api.openai.com/v1", "name": "gpt-4o-mini"},
        "history": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "chào"}],
    }
    req = ChatRequest(**payload)
    assert req.message == "RAG là gì"
    assert req.model.name == "gpt-4o-mini"
    assert req.history[0].role == "user"


def test_request_minimal_payload():
    # Node có thể gửi model=null / history rỗng
    req = ChatRequest(message="hello", model=None, history=[])
    assert req.model is None and req.history == []


def test_response_has_fields_node_reads():
    resp = ChatResponse(
        reply="đáp",
        source_type="knowledge",
        citations=[{"n": 1, "id": 7, "title": "T"}],
        meta={
            "intent": "KNOWLEDGE",
            "source_type": "knowledge",
            "total_chunks": 1,
            "processing_ms": 5,
        },
    )
    body = resp.model_dump()
    # các field aiServiceClient/chat.service đọc
    assert {"reply", "source_type", "citations", "meta"} <= set(body)
    assert {"intent", "source_type", "total_chunks", "processing_ms"} <= set(body["meta"])


def test_sse_event_types_match_node_parser():
    # Node aiChatStream phân biệt status/token/text/done qua field 'type'
    for et in ("status", "token", "text", "done"):
        raw = _sse(et, content="x")
        assert raw.startswith("data: ") and raw.endswith("\n\n")
        evt = json.loads(raw[len("data: ") :].strip())
        assert evt["type"] == et
