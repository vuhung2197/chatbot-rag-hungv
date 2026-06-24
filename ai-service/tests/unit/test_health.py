"""Test cho /health.

T1: smoke 200.
T2: /health báo trạng thái DB + Redis. Ở unit test ta mock ping để KHÔNG cần
dịch vụ thật chạy; test tích hợp thật nằm ở tests/integration/.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok_when_deps_up(monkeypatch):
    # Mock ping DB/Redis trả True (không cần Postgres/Redis thật)
    async def _ok():
        return True

    monkeypatch.setattr("app.main.ping_db", _ok)
    monkeypatch.setattr("app.main.ping_redis", _ok)

    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai-service"
    assert body["checks"] == {"database": "up", "redis": "up"}


def test_health_minimal_without_token_when_configured(monkeypatch):
    # Token cấu hình + không gửi header -> chỉ status, ẩn version/environment/service.
    async def _ok():
        return True

    monkeypatch.setattr("app.main.ping_db", _ok)
    monkeypatch.setattr("app.main.ping_redis", _ok)
    monkeypatch.setattr("app.main.settings.internal_api_token", "s3cret")

    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert "version" not in body
    assert "environment" not in body
    assert "service" not in body


def test_health_full_with_token(monkeypatch):
    async def _ok():
        return True

    monkeypatch.setattr("app.main.ping_db", _ok)
    monkeypatch.setattr("app.main.ping_redis", _ok)
    monkeypatch.setattr("app.main.settings.internal_api_token", "s3cret")

    body = client.get("/health", headers={"X-Internal-Token": "s3cret"}).json()
    assert body["environment"] == "development"
    assert body["checks"]["database"] == "up"


def test_health_degraded_when_dep_down(monkeypatch):
    async def _ok():
        return True

    async def _fail():
        return False

    monkeypatch.setattr("app.main.ping_db", _ok)
    monkeypatch.setattr("app.main.ping_redis", _fail)

    resp = client.get("/health")
    # Liveness vẫn 200, nhưng status=degraded + chỉ rõ thành phần hỏng
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["checks"]["database"] == "up"
    assert body["checks"]["redis"] == "down"
