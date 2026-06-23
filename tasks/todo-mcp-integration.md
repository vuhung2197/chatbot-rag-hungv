# TODO: MCP Client Integration — `ai-service` (Agentic RAG)

Plan: [tasks/plan-mcp-integration.md](plan-mcp-integration.md) · Spec: [docs/SPEC_MCP_INTEGRATION.md](../docs/SPEC_MCP_INTEGRATION.md)
`[ ]` chưa làm · `[~]` đang làm · `[x]` xong. TDD: test đỏ trước.

## Phase 0 — Foundation

- [x] **T1 — Dependency `mcp` + config** `[S]` ✅ mcp==1.28.0 · MCPServerConfig + allowlist + bound (5/20s) · test 3 + full 93 pass
  - File: `pyproject.toml` (thêm `mcp`), `app/config.py`.
  - Config mới: `mcp_servers` (list/JSON: `{name, transport, endpoint|command, api_key_env, enabled}`), `mcp_max_iterations=5`, `mcp_tool_timeout_sec=20`. Parser bỏ qua server `enabled=false`/thiếu cấu hình.
  - Test `test_mcp_config.py`: parse server defs; default bound; server thiếu field/disabled bị loại.
  - **AC:** F1.1 (phần config), F5.4 bound. **Verify:** `uv run pytest tests/unit/test_mcp_config.py -q`.
  - Phụ thuộc: không.

## Phase 1 — Components

- [x] **T2 — MCP client layer** `[M]` ✅ connect/discover/call + timeout + allowlist + degrade · session_factory DI · test 6 + full 99 pass
  - File: `app/services/mcp_client.py` (MỚI).
  - `connect()`/`list_tools()` (discover name+desc+schema), `call_tool(server, name, args)` với timeout (`mcp_tool_timeout_sec`); lỗi/timeout → kết quả lỗi có cấu trúc (không raise); chỉ kết nối server trong allowlist; key từ `api_key_env`, không log.
  - Test `test_mcp_client.py` (fake MCP server in-process / fake tại boundary SDK): discover; call ok; timeout→lỗi; allowlist reject endpoint lạ; 0 server → degrade (list rỗng, không crash).
  - **AC:** F1.1–1.5, F5.1, F5.2. **Verify:** `uv run pytest tests/unit/test_mcp_client.py -q`.
  - Phụ thuộc: T1.

- [x] **T3 — LLM tool-calling** `[S–M]` ✅ complete_with_tools(tools) -> LLMMessage(content, tool_calls); args hỏng->{}; generate cũ giữ nguyên · test 4 + full 103 pass
  - File: `app/services/llm.py`.
  - `generate(..., tools=None)` truyền `tools` xuống `chat.completions.create`; trả tool_calls khi model yêu cầu, text khi xong (giữ allowlist host + timeout + max_retries=0). Không tool → hành vi cũ.
  - Test `test_llm_tools.py` (fake OpenAI client): trả tool_calls đúng shape; không-tool không hồi quy.
  - **AC:** F2.1–2.3. **Verify:** `uv run pytest tests/unit/test_llm_tools.py tests/unit/test_llm.py tests/unit/test_llm_timeout.py -q`.
  - Phụ thuộc: T1 (độc lập T2).

## Phase 2 — Agentic path

- [x] **T4 — Agentic node (ReAct loop bounded)** `[M–L]` ✅ vòng LLM↔tool, trần iteration, tool lỗi→tiếp, streaming, delimiter tool-output, tools_used trace · test 6 + full 109 pass
  - File: `app/agents/nodes.py` (node `agentic_node`), `app/agents/state.py` nếu cần field.
  - Vòng: LLM(+tool schema) → tool_calls → MCP call (song song nếu nhiều) → kết quả lại LLM → lặp. Trần `mcp_max_iterations` → dừng + tổng hợp. Tool lỗi→đưa LLM xử tiếp. Stream câu cuối qua `on_token`. `source_type="agentic"` + tool đã gọi vào meta.
  - Test `test_agentic_node.py` (fake mcp_client + fake LLM kịch bản): gọi tool→trả lời; trần iteration; tool lỗi giữa vòng→vẫn trả lời; streaming; tool-output bọc delimiter (F5.3).
  - **AC:** F3.1–3.5, F5.3. **Verify:** `uv run pytest tests/unit/test_agentic_node.py -q`.
  - Phụ thuộc: T2, T3.

- [ ] **✅ Checkpoint 1** — vòng lặp tool chạy offline; trần iteration dừng sạch. Full unit xanh.

- [x] **T5 — Intent `AGENT` + graph wiring + degrade** `[M]` ✅ intent AGENT + node "agentic" wired; route degrade->knowledge khi 0 server · test 4 + full 113 pass
  - File: `app/intent/registry.py` (thêm `AGENT`), `app/agents/nodes.py` (INTENT_TO_NODE), `app/agents/graph.py` (add_node + edge + inject mcp_client/llm).
  - 0 tool khả dụng → agentic path degrade về knowledge_node (RAG thường), không lỗi.
  - Test: cập nhật `test_agent_graph.py` (route AGENT→agentic node; degrade khi 0 tool); `test_intent.py` nếu eval intent cần nhãn mới.
  - **AC:** F4.1–4.2. **Verify:** `uv run pytest tests/unit/test_agent_graph.py tests/unit/test_intent.py -q`.
  - Phụ thuộc: T4.

- [ ] **✅ Checkpoint 2** — end-to-end qua graph: câu cần-tool → agentic node → trả lời có tool; 0 tool → KNOWLEDGE. Full unit xanh.

## Phase 3 — Hardening & eval

- [ ] **T6 — Bảo mật (lock test)** `[S]`
  - File: bổ sung test + sửa nhẹ nếu hở.
  - Test `test_mcp_security.py`: allowlist reject server/endpoint lạ; client (request body) KHÔNG chỉ định được server/endpoint; secret (`api_key_env`) không xuất hiện trong prompt/log/meta; tool-output không vào sink eval/exec.
  - **AC:** F5.1–5.4 (khoá). **Verify:** `uv run pytest tests/unit/test_mcp_security.py -q`.
  - Phụ thuộc: T2, T4, T5.

- [ ] **T7 — Eval + observability + integration** `[M]`
  - File: `tests/eval/test_agentic_eval.py` (gated eval), log tool-call ở mcp_client/agentic_node (kèm request_id), `tests/integration/test_mcp_live.py` (gated, server thật).
  - Eval: bộ câu cần-tool vs không-cần-tool → agent chọn tool đúng lúc. Integration: 1 luồng end-to-end với **Fetch** (`mcp-server-fetch`, stdio `uvx mcp-server-fetch`, read-only, không key). Config: `{"name":"fetch","transport":"stdio","command":"uvx mcp-server-fetch","enabled":true}`. ⚠️ cần `uvx`/`uv` trong môi trường chạy (chạy ai-service ngoài Docker hoặc thêm vào Dockerfile).
  - **AC:** F6.1–6.2. **Verify:** `uv run pytest -m eval -q` / `-m integration -q`.
  - Phụ thuộc: T5 (eval); T6 + server thật (integration).

- [ ] **✅ Checkpoint 3 (final)** — full `tests/unit` xanh (90 + mới); ruff/black sạch; eval + integration pass; happy-path không hồi quy. Sẵn sàng ship (dev/nội bộ).

---
Ước lượng: S≈30–60ph, M≈1–2h, L≈2–4h. Tổng ~2–3 ngày tập trung.
Lưu ý: T1 cần xác nhận cài dep; T7 integration cần bạn cấp MCP server thật.
