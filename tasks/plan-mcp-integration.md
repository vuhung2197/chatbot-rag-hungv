# Plan: MCP Client Integration — `ai-service` (Agentic RAG)

Spec: [docs/SPEC_MCP_INTEGRATION.md](../docs/SPEC_MCP_INTEGRATION.md) · Todo: [tasks/todo-mcp-integration.md](todo-mcp-integration.md)
TDD: test đỏ trước mỗi task. Giữ 90 test cũ xanh. Test unit **offline** (fake MCP server / fake LLM).

## Decisions đã chốt ("hướng tốt nhất")
- **D-A:** Vendor-neutral, config-driven. Unit test dùng **fake MCP server in-process**. Server integration đầu tiên (T7) = **Fetch** (`mcp-server-fetch`, stdio, read-only, không key) — đã chốt.
- **D-B:** Official **`mcp` SDK**; transport chính **streamable-HTTP** (+ stdio qua config); **tự viết ReAct loop**.
- **D-C:** Thêm intent **`AGENT`** + node mới; intent cũ không đổi; 0 tool khả dụng → degrade KNOWLEDGE.
- **D-D:** `mcp_max_iterations=5`, `mcp_tool_timeout_sec=20`.
- **D-E:** Per-server config: `{name, transport, endpoint/command, api_key_env, enabled}`; key đọc từ env theo `api_key_env`, không log.

## Dependency graph

```
T1 (deps + config) ──┬─> T2 (MCP client layer) ──┐
                     └─> T3 (LLM tool-calling) ───┴─> T4 (agentic node ReAct) ─> CP1
                                                              │
                                                              v
                                          T5 (intent AGENT + graph wiring) ─> CP2
                                                              │
                                                              v
                                          T6 (security hardening + tests)
                                                              │
                                                              v
                                          T7 (eval + observability + integration) ─> CP3
```

- **T1** nền tảng (dep `mcp` + config allowlist/bound).
- **T2** (client) và **T3** (LLM tool-calling) độc lập nhau, cùng cần cho **T4**.
- **T4** là vertical slice đầu: vòng lặp tool chạy được (fake client + fake LLM).
- **T5** ghép vào graph qua intent mới + degrade.
- **T6** khoá bảo mật bằng test (allowlist, secret, tool-output không tin).
- **T7** eval + 1 luồng integration với server thật.

## Phases & tasks (slice dọc theo component, mỗi task có test riêng)

### Phase 0 — Foundation
- **T1** Thêm dependency `mcp` + config (allowlist server, bound). ⚠️ **Gate:** cài dep cần xác nhận (boundary spec).

### Phase 1 — Components
- **T2** MCP client layer: connect/discover/call/timeout/degrade (F1)
- **T3** LLM tool-calling: `generate` nhận `tools` + trả tool_calls (F2)

### Phase 2 — Agentic path
- **T4** Agentic node: vòng lặp ReAct bounded, tool lỗi→tiếp, streaming (F3)
- **✅ Checkpoint 1** — vòng lặp tool chạy offline (fake client+LLM): gọi tool→kết quả→trả lời; chạm trần iteration dừng sạch.
- **T5** Intent `AGENT` + graph wiring + degrade-to-knowledge (F4)
- **✅ Checkpoint 2** — end-to-end qua graph: câu cần-tool route tới agentic node, trả lời có tool; 0 tool → KNOWLEDGE.

### Phase 3 — Hardening & eval
- **T6** Bảo mật: allowlist reject, secret không lọt prompt/log, tool-output delimiter (F5)
- **T7** Eval chọn-tool-đúng-lúc + log tool-call + 1 luồng integration server thật (F6)
- **✅ Checkpoint 3 (final)** — full `tests/unit` xanh (90 + mới), ruff/black sạch, eval/integration pass, happy-path không hồi quy.

## Verification chung
- Mỗi task: `cd ai-service && uv run pytest tests/unit/<file> -q` xanh + không vỡ test cũ.
- Checkpoint: full `uv run pytest tests/unit -q` + `ruff check app tests` + `black --check app tests`.
- Integration/eval gated (`-m integration` / `-m eval`), chạy tường minh ở T7.

## Rủi ro / cần người quyết
- **Cài dep `mcp`** (T1) — xác nhận trước.
- **Server MCP thật** (T7) — cần bạn cấp endpoint + loại auth (Q-A/Q-E spec).
- **Tool có side-effect** (ghi dữ liệu) — ngoài scope; chỉ tool read-only trừ khi bạn duyệt riêng.

## Out of scope
ai-service làm MCP *server*; tool ghi/side-effect; sửa lõi AI JS Node; các blocker `[PROD]` ở [[ai-service-prod-blockers]] (auth/SSRF/rate-limit) — milestone riêng.
