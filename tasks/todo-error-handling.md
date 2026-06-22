# TODO: Error Handling Hardening — `ai-service`

Plan: [tasks/plan-error-handling.md](plan-error-handling.md) · Spec: [docs/SPEC_ERROR_HANDLING.md](../docs/SPEC_ERROR_HANDLING.md)
Quy ước: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong. TDD: viết test đỏ trước.

## Phase 0 — Foundation

- [x] **T1 — LLM client timeout + max_retries=0** `[S]` ✅ `llm_timeout_sec=30` + `max_retries=0` · test 2 + full 66 pass · ruff/black sạch
  - File: `app/config.py` (thêm `llm_timeout_sec: int = 30`), `app/services/llm.py:69`
  - Làm: `AsyncOpenAI(base_url=url, api_key=api_key, timeout=settings.llm_timeout_sec, max_retries=0)`; giữ `_retry` 3 lần là cơ chế retry duy nhất.
  - Test mới `tests/unit/test_llm_timeout.py`: assert client được tạo với `timeout` đúng + `max_retries=0` (patch/inspect kwargs); fake client treo → `_retry` xử → `LLMError` (không treo).
  - **AC:** F3.1–F3.3. **Verify:** `uv run pytest tests/unit/test_llm_timeout.py tests/unit/test_llm.py -q`.
  - Phụ thuộc: không.

- [x] **T2 — Input bounds (history/content)** `[XS]` ✅ history max_length=20 + content max_length=10000 · test 4 + full 70 pass
  - File: `app/schemas.py` — `history: list[ChatMessage] = Field(default_factory=list, max_length=20)`, `ChatMessage.content` thêm `max_length` (đề xuất 10000).
  - Test mới `tests/unit/test_input_bounds.py`: history > 20 → 422; content quá dài → 422; trong giới hạn → OK.
  - **AC:** F6.1–F6.3. **Verify:** `uv run pytest tests/unit/test_input_bounds.py tests/unit/test_contract.py -q`.
  - Phụ thuộc: không.

## Phase 1 — Streaming (blocker chính)

- [x] **T3 — SSE terminal error event + cancellation** `[M]` ✅ error event (no leak) + cancel task on disconnect · test 3 + full 73 pass
  - File: `app/main.py` `event_gen` (108–154).
  - Làm:
    - Bọc toàn bộ vòng stream + `await task` trong `try/except Exception` → `logger.exception(...)` + `yield _sse("error", content="<xin lỗi tiếng Việt>")`; **không** lộ chi tiết.
    - `finally`: nếu `task` chưa xong → `task.cancel()` + `await task` (nuốt `CancelledError`); phân biệt `CancelledError` (không log lỗi) với lỗi thật.
    - Thêm `error` vào tập SSE type hợp lệ (đồng bộ contract Node — kiểm `test_contract.py`).
  - Test mới `tests/unit/test_chat_stream_errors.py`:
    - fake agent raise sau vài token → nhận `error` event, không leak key/stacktrace, stream đóng (F1.1–1.2).
    - lỗi trước token đầu → vẫn `status`→`error`, không treo (F1.4).
    - client disconnect (đóng iterator giữa chừng) → `task` bị cancel, không rò (F2.1–2.3).
    - happy-path vẫn `status→token*→text→done` (F1.3).
  - **AC:** F1.*, F2.*. **Verify:** `uv run pytest tests/unit/test_chat_stream_errors.py tests/unit/test_chat_endpoint.py -q`.
  - Phụ thuộc: T1 (lỗi LLM deterministic để test).

- [ ] **✅ Checkpoint 1** — stream kết thúc tường minh, không rò task, không leak secret. Chạy full `tests/unit` xanh.

## Phase 2 — Degrade paths

- [x] **T4 — KNOWLEDGE degrade khi embeddings/DB lỗi** `[M]` ✅ pipeline lỗi -> câu xin lỗi degrade (source_type=error), no leak, no web-fallback · test 2 + full 75 pass
  - File: `app/agents/nodes.py` (`knowledge_node` ~80–105), `app/rag/pipeline.py`/`retrieval.py` (cho lỗi propagate có kiểm soát).
  - Làm: bọc retrieve/generate trong knowledge_node; embeddings/DB raise → trả `{reply: <xin lỗi degrade>, source_type:"error"/"degraded"}` (theo D2), KHÔNG web-fallback, KHÔNG 500.
  - Test mới `tests/unit/test_degrade_paths.py::test_knowledge_node_when_embeddings_fail` (+ DB fail).
  - **AC:** F4.1, F4.3 (phần retrieval). **Verify:** `uv run pytest tests/unit/test_degrade_paths.py tests/unit/test_agent_graph.py -q`.
  - Phụ thuộc: T1.

- [x] **T5 — Redis cache + DB ping degrade contract** `[S]` ✅ lock test: redis down -> get=None/set no-raise/ping=False; db lỗi -> ping=False · test 4 + full 79 pass
  - File: xác nhận/sửa nhẹ `app/services/cache.py`, `app/services/db.py`.
  - Test mới (cùng `test_degrade_paths.py`): patch `get_redis` raise → `get_cached`=None, `set_cached` no-raise, `ping_redis`=False; `ping_db`=False khi lỗi. Classifier vẫn chạy khi Redis chết.
  - **AC:** F4.2, F4.3 (ping). **Verify:** `uv run pytest tests/unit/test_degrade_paths.py tests/unit/test_intent.py -q`.
  - Phụ thuộc: không (có thể song song T4).

- [x] **T6 — node_api + Tavily degrade → node fallback** `[S]` ✅ node_api lỗi->None->progress_unavailable; web None->web_empty; _format rỗng->None · test 4 + full 83 pass
  - File: xác nhận `app/clients/node_api.py`, `app/services/web_search.py`; bọc fallback ở `user_progress_node`/`live_search_node` trong `nodes.py`.
  - Test mới (cùng `test_degrade_paths.py`): node_api timeout/500/JSON hỏng → None → user_progress_node trả lời degrade; web_search empty/lỗi → live_search_node fallback. Không crash.
  - **AC:** F4.4, F4.5. **Verify:** `uv run pytest tests/unit/test_degrade_paths.py tests/unit/test_agent_graph.py -q`.
  - Phụ thuộc: T1.

- [ ] **✅ Checkpoint 2** — mọi external dep chết đều degrade an toàn, không 500. Full `tests/unit` xanh.

## Phase 3 — Hoàn thiện

- [x] **T7 — `/chat` non-stream lỗi có cấu trúc** `[S]` ✅ agent lỗi -> 200 + source_type=error (D1), no leak · test 1 + full 84 pass
  - File: `app/main.py` `chat` handler (92–109).
  - Làm (D1): bọc `agent.run` → lỗi trả HTTP 200 + `ChatResponse{reply:<xin lỗi>, source_type:"error", citations:[], meta}`; không 500 trần, không leak (F5.2).
  - Test (bổ sung `test_chat_endpoint.py`): fake agent raise → 200 với source_type="error", body sạch.
  - **AC:** F5.1–5.2. **Verify:** `uv run pytest tests/unit/test_chat_endpoint.py -q`.
  - Phụ thuộc: T1.

- [x] **T8 — Logging đường lỗi nhất quán** `[XS]` ✅ contextvar + RequestIdFilter -> mọi log có `[rid]`; format cập nhật · test 2 + full 86 pass
  - File: các chỗ degrade đã đụng (T3–T7).
  - Làm: đảm bảo log kèm `request_id` (middleware sẵn) + tên dep + loại lỗi; auth/SSRF-reject ≥ WARNING. Không thêm test riêng — review log thủ công + giữ test cũ.
  - **AC:** F7.1–7.2. **Verify:** đọc log một run mẫu (`uv run pytest -q` + grep), ruff sạch.
  - Phụ thuộc: T3–T7.

- [ ] **✅ Checkpoint 3 (final)** — `uv run pytest tests/unit -q` (64 + mới) xanh; `ruff check` + `black --check` sạch; happy-path không hồi quy. Sẵn sàng re-ship.

---
Ước lượng: XS≈<30ph, S≈30–60ph, M≈1–2h. Tổng ~1 ngày làm việc tập trung.
