"""Unit test T8 — request_id gắn vào mọi log record (F7.1).

Middleware đặt request_id vào contextvar; RequestIdFilter bơm vào record để mọi
log (degrade/error ở node/service) đều trace được theo rid.
"""

import logging

from app.observability import RequestIdFilter, request_id_var


def _record():
    return logging.LogRecord("n", logging.INFO, "p", 1, "msg", None, None)


def test_filter_injects_request_id_from_contextvar():
    rec = _record()
    token = request_id_var.set("abc123")
    try:
        RequestIdFilter().filter(rec)
        assert rec.request_id == "abc123"
    finally:
        request_id_var.reset(token)


def test_filter_default_when_unset():
    rec = _record()
    RequestIdFilter().filter(rec)
    assert rec.request_id == "-"


# ── clamp X-Request-ID (chống log injection / record phình) ──
from app.observability import clean_request_id  # noqa: E402


def test_clean_request_id_strips_and_truncates():
    # ký tự lạ + newline (log injection) bị loại, độ dài cắt <= 64
    cleaned = clean_request_id("ab\n12 evil; drop" + "x" * 200)
    assert "\n" not in cleaned and " " not in cleaned and ";" not in cleaned
    assert len(cleaned) <= 64
    assert cleaned.startswith("ab12")


def test_clean_request_id_generates_when_empty():
    cleaned = clean_request_id(None)
    assert cleaned and len(cleaned) == 12  # uuid hex[:12]
