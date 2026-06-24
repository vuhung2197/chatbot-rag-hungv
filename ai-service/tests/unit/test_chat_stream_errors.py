"""Unit test T3 — SSE kết thúc tường minh khi lỗi + hủy task khi client disconnect.

F1: agent lỗi giữa stream -> client nhận event 'error' (không leak secret/stacktrace),
    không treo, happy-path không đổi.
F2: client disconnect -> task agent.run bị cancel, không rò.
"""

import asyncio

from fastapi.testclient import TestClient

from app.main import agent_dep, app, chat_stream
from app.schemas import ChatRequest

client = TestClient(app)


class _RaisingAgent:
    """Phát vài token rồi raise (mô phỏng LLM/DB chết giữa stream)."""

    def __init__(self, tokens=None, exc=None):
        self._tokens = tokens or []
        self._exc = exc or RuntimeError("sk-proj-LEAK-secret-không-được-lộ")

    async def run(self, message, model=None, history=None, on_token=None, **kw):
        if on_token:
            for t in self._tokens:
                on_token(t)
        raise self._exc


class _BlockingAgent:
    """Chạy mãi tới khi bị cancel — để test client disconnect."""

    def __init__(self):
        self.cancelled = False
        self.started = asyncio.Event()

    async def run(self, message, model=None, history=None, on_token=None, **kw):
        self.started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            self.cancelled = True
            raise


def teardown_function():
    app.dependency_overrides.clear()


def test_stream_emits_error_event_on_failure():
    app.dependency_overrides[agent_dep] = lambda: _RaisingAgent(tokens=["a", "b"])
    with client.stream("POST", "/chat/stream", json={"message": "x"}) as resp:
        assert resp.status_code == 200
        raw = "".join(resp.iter_text())
    assert '"type": "error"' in raw  # F1.1
    assert '"type": "done"' not in raw  # không giả vờ thành công
    # F1.2: không leak chi tiết kỹ thuật / secret
    assert "sk-proj" not in raw
    assert "Traceback" not in raw
    assert "RuntimeError" not in raw


def test_stream_error_before_first_token():
    # F1.4: lỗi trước token đầu -> vẫn status rồi error, không treo.
    app.dependency_overrides[agent_dep] = lambda: _RaisingAgent(tokens=[])
    with client.stream("POST", "/chat/stream", json={"message": "x"}) as resp:
        raw = "".join(resp.iter_text())
    assert '"type": "status"' in raw
    assert '"type": "error"' in raw


async def test_stream_cancels_task_on_client_disconnect():
    # F2: đóng iterator giữa chừng -> task agent.run bị cancel.
    agent = _BlockingAgent()
    resp = await chat_stream(ChatRequest(message="x"), agent)
    it = resp.body_iterator
    first = await it.__anext__()  # nhận event 'status'
    assert '"type": "status"' in first
    await asyncio.wait_for(agent.started.wait(), 1)  # đảm bảo task nền đã chạy
    await it.aclose()  # mô phỏng client disconnect
    assert agent.cancelled is True
