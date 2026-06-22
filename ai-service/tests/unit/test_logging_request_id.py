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
