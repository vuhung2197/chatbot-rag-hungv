# Spec: MCP Client Integration — `ai-service` (Agentic RAG)

> **Trạng thái:** DRAFT — chờ duyệt. Chưa viết code cho tới khi bạn xác nhận + chốt câu hỏi mở §7.
> **Hướng:** ai-service làm **MCP client** — agent graph gọi tool của các MCP server ngoài.
> **Target:** tính năng thực dùng trong sản phẩm (ổn định + bảo mật, không chỉ demo).
> Liên quan: [[python-ai-service-migration]] · [[rag-modernization-plan]] (Agentic RAG) · [[ai-service-prod-blockers]] · [docs/SPEC_ERROR_HANDLING.md](SPEC_ERROR_HANDLING.md)

---

## 1. Objective

**Hiện trạng:** Agent graph định tuyến `router → {knowledge | live_search | user_progress | greeting | offtopic} → END`. Mỗi intent là **một LLM call đơn, không có tool/function-calling** ([agents/graph.py](../ai-service/app/agents/graph.py), [agents/nodes.py](../ai-service/app/agents/nodes.py)). LLM bị giới hạn ở RAG nội bộ + 1 web-search cứng (Tavily).

**Mục tiêu:** Cho agent truy cập **tool động qua MCP** (Model Context Protocol) — biến RAG tĩnh thành **Agentic RAG**: LLM tự quyết định gọi tool nào (search, tra cứu, tính toán, API domain...) trong một vòng lặp có kiểm soát, rồi tổng hợp câu trả lời. Tool đến từ các **MCP server cấu hình được**, không hard-code logic.

**Người dùng:** end-user chatbot — câu hỏi cần dữ liệu/hành động ngoài KB (tra cứu thời gian thực, công cụ domain) được trả lời chính xác hơn nhờ tool, vẫn có trích nguồn.

**Thành công:** (a) agent gọi được tool từ ≥1 MCP server thật trong vòng lặp bounded; (b) tool registry **config-driven** (thêm server = sửa config, không sửa logic); (c) an toàn: allowlist server, timeout, giới hạn vòng lặp/chi phí, không lộ secret; (d) có eval + test offline.

**Ngoài phạm vi:** ai-service làm MCP *server* (expose ra ngoài); thay thế intent classifier; sửa lõi AI JS cũ của Node.

---

## 2. Features & Acceptance Criteria

### F1 — MCP client layer (kết nối + discover tool)
`app/services/mcp_client.py`: quản lý kết nối tới các MCP server cấu hình, liệt kê tool, gọi tool.
- **AC1.1** Đọc danh sách server từ config (tên, transport, endpoint/command, auth, enabled). Server `enabled=false` hoặc thiếu cấu hình → bỏ qua, không crash.
- **AC1.2** Discover: trả danh sách tool (name, description, JSON input schema) từ các server đang bật.
- **AC1.3** Gọi tool theo `(server, tool_name, args)` → trả kết quả; lỗi/timeout → trả lỗi có cấu trúc (không raise xuyên agent), log kèm `request_id`.
- **AC1.4** Mỗi tool-call có **timeout** cấu hình được; vượt → hủy, coi như tool lỗi.
- **AC1.5** Kết nối lỗi lúc khởi động → service vẫn boot (degrade: agent chạy như chưa có MCP). Khớp pattern degrade-don't-crash hiện có.

### F2 — Tool-calling trong LLM client
Mở rộng `app/services/llm.py` hỗ trợ function/tool-calling.
- **AC2.1** `generate` (hoặc API mới) nhận `tools` (schema OpenAI) + trả về tool_calls khi model yêu cầu, hoặc text khi xong.
- **AC2.2** Giữ allowlist host + timeout + `max_retries=0` đã có; không hồi quy đường không-tool.
- **AC2.3** Tool-calling chỉ bật khi có tool; không có tool → hành vi y như hiện tại.

### F3 — Agentic node (vòng lặp ReAct có kiểm soát)
Node mới chạy vòng: LLM ↔ tool cho tới khi có câu trả lời cuối.
- **AC3.1** Vòng lặp: LLM (kèm tool schema) → nếu có tool_calls, MCP client thực thi (song song nếu nhiều) → đưa kết quả lại LLM → lặp.
- **AC3.2** **Giới hạn cứng số vòng** (`mcp_max_iterations`, đề xuất 5); chạm trần → dừng + tổng hợp từ những gì đã có (không lặp vô hạn → chặn chi phí, khớp lo ngại rate-limit ở [[ai-service-prod-blockers]] P3).
- **AC3.3** Tool lỗi/timeout → đưa thông điệp lỗi cho LLM xử tiếp, không sập node.
- **AC3.4** Hỗ trợ streaming token của câu trả lời cuối qua `on_token` (mirror các node khác).
- **AC3.5** Trả `source_type` phản ánh có dùng tool (vd `agentic`) + danh sách tool đã gọi vào `meta`/citations để trace.

### F4 — Định tuyến vào agentic path
- **AC4.1** Quyết định cách vào: **(đề xuất)** thêm intent mới `AGENT`/`TOOL` vào registry + node, route qua conditional edge; KNOWLEDGE/USER_PROGRESS/GREETING/OFF_TOPIC **không đổi**. (Chốt ở Q-C §7.)
- **AC4.2** Không có MCP tool nào khả dụng → path này degrade về KNOWLEDGE (RAG thường), không lỗi.

### F5 — Bảo mật (vì là tính năng thực dùng)
- **AC5.1 (allowlist)** Chỉ kết nối server trong allowlist cấu hình (mirror `allowed_llm_hosts`); endpoint lạ → từ chối. Không cho client (request body) chỉ định server/endpoint MCP.
- **AC5.2 (secret)** Token/secret của MCP server lấy từ env, **không** log, không đưa vào prompt. Không forward `auth_token`/secret người dùng sang MCP server không tin.
- **AC5.3 (tool output không tin)** Kết quả tool được coi là dữ liệu không tin: bọc delimiter khi đưa vào prompt (giảm prompt injection), không đưa thẳng vào sink eval/SQL/shell.
- **AC5.4 (bound)** Timeout mỗi tool + trần số vòng + (tùy chọn) trần tổng tool-call/request để chặn chi phí.

### F6 — Eval + observability
- **AC6.1** Eval harness: bộ câu hỏi cần-tool vs không-cần-tool, đo agent có chọn tool đúng lúc + chất lượng câu trả lời (mở rộng `tests/eval` hiện có).
- **AC6.2** Log mỗi tool-call (server, tool, thời lượng, ok/lỗi) kèm `request_id`.

---

## 3. Project Structure

```
ai-service/app/
  services/mcp_client.py      # F1: kết nối/discover/gọi tool MCP (MỚI)
  services/llm.py             # F2: tool-calling (sửa)
  agents/nodes.py             # F3: agentic_node vòng lặp ReAct (MỚI node)
  agents/graph.py             # F4: wiring node + edge (sửa)
  intent/registry.py          # F4: thêm intent AGENT (sửa, nếu chọn Q-C đề xuất)
  config.py                   # F1/F5: mcp_servers (allowlist), mcp_max_iterations,
                              #         mcp_tool_timeout_sec (sửa)
  schemas.py                  # nếu cần schema tool-call/meta (sửa nhẹ)

ai-service/tests/unit/
  test_mcp_client.py          # F1: discover/call/timeout/degrade (fake MCP server)
  test_agentic_node.py        # F3: vòng lặp, trần iteration, tool lỗi, streaming
  test_llm_tools.py           # F2: tool-calling shape
ai-service/tests/eval/
  test_agentic_eval.py        # F6: chọn tool đúng lúc (gated, marker eval)
```

**Dependency mới (cần chốt):** `mcp` (official Python SDK) cho client + transport; (tùy) `langchain-mcp-adapters` nếu muốn dùng adapter sẵn cho LangGraph. Quyết định ở Q-A/Q-B §7.

---

## 4. Code Style

- Python 3.12 async-first; ruff + black sạch (cấu hình sẵn). Tự viết logic vòng lặp tool (học sâu) thay vì giấu hết trong adapter — trừ khi adapter rõ ràng đơn giản hơn.
- Giữ **DI seam**: mcp_client/llm inject được để test offline (fake MCP server, fake LLM trả tool_calls). KHÔNG gọi MCP/mạng thật trong unit test.
- Giữ **degrade-don't-crash**: MCP/tool lỗi → sentinel + log, không raise xuyên agent.
- Tool registry + allowlist là **nguồn sự thật cấu hình**; thêm server/tool = sửa config.
- Thông điệp lỗi tool gửi vào prompt: gọn, không lộ secret/endpoint nội bộ.

## 5. Testing Strategy

- pytest, unit **offline** (fake MCP server expose vài tool tĩnh; fake LLM kịch bản: gọi tool → nhận kết quả → trả lời). Chạy `uv run pytest tests/unit -q`, giữ 90 test cũ xanh.
- TDD: test đỏ trước mỗi AC.
- Ca trọng tâm: discover tool; gọi tool ok; tool timeout → lỗi có cấu trúc; trần iteration; tool lỗi giữa vòng → agent vẫn trả lời; allowlist reject endpoint lạ; secret không lọt vào prompt/log; degrade khi 0 tool.
- Integration (gated `-m integration`): kết nối 1 MCP server thật, 1 luồng end-to-end.
- Eval (gated `-m eval`): tỉ lệ chọn tool đúng lúc.

## 6. Boundaries

**Always do**
- Allowlist server MCP; chỉ kết nối endpoint cấu hình sẵn (server-side).
- Bound mọi vòng lặp/tool-call (timeout + trần iteration).
- Coi tool output là dữ liệu không tin (delimiter, không vào sink nguy hiểm).
- Degrade an toàn khi MCP/tool lỗi; giữ happy-path không-tool không hồi quy.
- TDD + eval; log tool-call kèm request_id.

**Ask first**
- Thêm dependency (`mcp`, `langchain-mcp-adapters`) — xác nhận trước khi cài.
- Thêm/đổi intent trong registry (ảnh hưởng classifier + eval).
- Cho phép tool có **side-effect/ghi dữ liệu** (khác tool chỉ-đọc) — cần duyệt riêng.

**Never do**
- KHÔNG cho client (request body) chỉ định server/endpoint/command MCP (chặn SSRF/command-injection).
- KHÔNG forward secret người dùng / OPENAI key sang MCP server không tin.
- KHÔNG để tool output chạy vào eval/exec/SQL/shell/file-path.
- KHÔNG vòng lặp tool không trần. KHÔNG log secret/endpoint nội bộ.

---

## 7. Câu hỏi mở (chốt trước khi /plan)

- **Q-A (server đầu tiên):** Bắt đầu với MCP server nào? Đề xuất: **1 server remote chỉ-đọc** (vd web/search hoặc 1 domain server) để thay/bổ sung LIVE_SEARCH. Cần biết server cụ thể bạn muốn dùng.
- **Q-B (transport + dep):** **streamable-HTTP/SSE** (remote, hợp container — đề xuất) hay **stdio** (spawn subprocess trong container)? Và dùng **`mcp` SDK tự viết loop** (đề xuất, học sâu) hay **`langchain-mcp-adapters`** (nhanh hơn, ít kiểm soát)?
- **Q-C (vào graph):** Thêm **intent `AGENT` + node mới** (đề xuất, giữ các intent cũ nguyên) hay **nâng cấp LIVE_SEARCH** thành agentic-with-tools?
- **Q-D (bound số):** `mcp_max_iterations` (đề xuất 5), `mcp_tool_timeout_sec` (đề xuất 20), có cần trần tổng tool-call/request không?
- **Q-E (auth tới MCP server):** server cần auth kiểu gì (API key header / OAuth)? Lấy từ env tên gì?
