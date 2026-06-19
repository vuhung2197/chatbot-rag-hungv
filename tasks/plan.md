# Implementation Plan: Python AI Service (FastAPI, hybrid lâu dài)

> Nguồn: [PYTHON_AI_SERVICE_SPEC.md](../PYTHON_AI_SERVICE_SPEC.md). Trạng thái: **chờ duyệt**. Chưa code tới khi bạn OK.
> Thay thế plan intent-Node cũ (đã SUPERSEDED).
> **Ưu tiên: học sâu** → mỗi checkpoint có "🎓 Phải giải thích được" (tự kiểm tra hiểu biết, dùng khi phỏng vấn).

## Overview

Dựng `ai-service/` (FastAPI) chạy song song Node, sở hữu lõi AI: intent + RAG + agent (LangGraph) + LLM (OpenAI-compat & Ollama) + web search. Tái dùng `knowledge_chunks` (pgvector, `text-embedding-3-small` 1536) — **không re-index**. Node làm gateway proxy `/chat` sau feature flag. USER_PROGRESS gọi ngược Node API. Tự viết chunking/retrieval/rerank/node-logic; framework chỉ làm khung.

## Architecture Decisions

- **Slice dọc, KNOWLEDGE trước.** Đường RAG nội bộ là rủi ro + giá trị học cao nhất → làm end-to-end sớm (Phase 1) để fail-fast, trước khi thêm agent graph.
- **Endpoint thẳng trước, graph sau.** Phase 1 nối KNOWLEDGE trực tiếp vào `/chat` (chưa LangGraph) để cô lập rủi ro RAG; Phase 2 mới bọc bằng graph + thêm các intent khác.
- **Tự viết phần lõi.** retrieval SQL, rerank, fuse, citation, node-logic là code mình viết + unit test; LlamaIndex/LangGraph là khung lắp vào.
- **Feature flag rollback.** Node proxy sang Python sau `AI_SERVICE_ENABLED`; tắt → luồng Node cũ. App nghiệp vụ không downtime.
- **Tái dùng hạ tầng.** Postgres/Redis/Kafka đã có; chỉ thêm `ai-service` + `ollama` vào docker-compose.

## Dependency Graph

```
Phase 0  scaffold + infra (DB/Redis/Ollama, /health)
   │
Phase 1  LLM client → embeddings+retrieval → rag pipeline → /chat (KNOWLEDGE only)   ◄ rủi ro cao, làm sớm
   │
Phase 2  intent registry+classifier → LangGraph graph → live/greeting/offtopic/progress nodes
   │
Phase 3  /chat/stream (SSE) → Node gateway proxy (flag) → contract+persistence
   │
Phase 4  eval harness → observability+docs → (ask-first) gỡ lõi AI JS cũ
```

Thứ tự: 1→2→…→15 (bottom-up, mỗi task để hệ thống chạy được).

---

## Task List

### Phase 0: Foundation

#### Task 1: Scaffold `ai-service`
**Description:** Tạo skeleton FastAPI: `pyproject.toml` (uv), `app/main.py` (`/health`), `app/config.py` (Pydantic Settings đọc `.env`), cấu hình ruff/black/mypy/pytest, `Dockerfile`.
**Acceptance:**
- [ ] `uv run uvicorn app.main:app` chạy, `GET /health` → 200.
- [ ] `ruff check` + `black --check` + `pytest` (1 test smoke) xanh.
**Verify:** chạy local + `docker build ai-service`.
**Deps:** None. **Files:** `ai-service/{pyproject.toml,Dockerfile,app/main.py,app/config.py,tests/unit/test_health.py}`. **Scope:** S.

#### Task 2: Kết nối hạ tầng (DB/Redis) + docker-compose + Ollama
**Description:** `app/services/db.py` (asyncpg pool tới Postgres hiện có), `app/services/cache.py` (redis-py). Thêm service `ai-service` + `ollama` vào `docker-compose.yml`. `/health` kiểm tra DB + Redis.
**Acceptance:**
- [ ] `docker compose up ai-service ollama` chạy; `/health` báo DB + Redis OK.
- [ ] asyncpg query thử `SELECT count(*) FROM knowledge_chunks` trả số > 0.
**Verify:** compose up; curl /health.
**Deps:** T1. **Files:** `ai-service/app/services/{db.py,cache.py}`, `docker-compose.yml`, `ai-service/app/main.py`. **Scope:** S–M.

### ✅ Checkpoint A (sau T1–2)
- [ ] Service Python chạy trong stack, nối được Postgres/Redis/Ollama.
- [ ] 🎓 Phải giải thích được: vì sao asyncpg/async, pool là gì, Ollama phục vụ gì.
- [ ] **Review với người dùng.**

---

### Phase 1: Vertical slice — KNOWLEDGE end-to-end (RAG nội bộ)

#### Task 3: LLM client (`services/llm.py`)
**Description:** Client gọi LLM OpenAI-compatible + Ollama (chọn qua config), hỗ trợ streaming, retry, parse JSON-mode. Wrapper tự viết quanh `openai` SDK.
**Acceptance:**
- [ ] `generate()` (non-stream) và `stream()` (async generator token) hoạt động với cả OpenAI-compat và Ollama.
- [ ] Lỗi/timeout → retry; parse JSON an toàn (bóc `{...}`).
**Verify:** unit test (mock); integration 1 call thật mỗi provider.
**Deps:** T2. **Files:** `ai-service/app/services/llm.py`, `tests/unit/test_llm.py`. **Scope:** S.

#### Task 4: Embeddings + pgvector retrieval (TỰ VIẾT)
**Description:** `services/embeddings.py` (gọi `text-embedding-3-small`, 1536) + `rag/retrieval.py` (truy vấn `knowledge_chunks` bằng SQL native `1-(embedding<=>$1::vector)`, top-k + threshold). Tự viết SQL, không dùng wrapper.
**Acceptance:**
- [ ] Query mẫu trả top-k chunk đúng thứ tự điểm giảm dần; score khớp công thức cosine.
- [ ] Vector input cùng định dạng cột (1536) — không lỗi cast.
**Verify:** integration test với KB thật; so điểm với `searchSimilarVectors` của Node trên cùng câu.
**Deps:** T2. **Files:** `ai-service/app/services/embeddings.py`, `app/rag/retrieval.py`, `tests/integration/test_retrieval.py`. **Scope:** S–M.

#### Task 5: RAG pipeline — rerank + fuse + citation (TỰ VIẾT)
**Description:** `rag/rerank.py` (rerank theo điểm/đa tiêu chí — hàm thuần), `rag/pipeline.py` ghép retrieve→rerank→fuse context→generate→cite. Prompt grounding + "chỉ nói không biết khi hoàn toàn không liên quan" (port triết lý từ Node).
**Acceptance:**
- [ ] `rerank`/`fuse`/`cite` là hàm thuần, có unit test.
- [ ] `pipeline.answer(q)` trả câu trả lời grounded + danh sách citation (title/id).
**Verify:** unit (pure fns); integration end-to-end 1 câu KB → đúng + có citation.
**Deps:** T4. **Files:** `ai-service/app/rag/{rerank.py,pipeline.py}`, `tests/unit/test_rerank.py`. **Scope:** M.

#### Task 6: `/chat` endpoint (KNOWLEDGE only, chưa graph)
**Description:** `schemas.py` (Pydantic mirror `chat.schemas.js`) + route `POST /chat` gọi thẳng `rag.pipeline` cho mọi câu (tạm coi tất cả là KNOWLEDGE). Chưa intent/agent.
**Acceptance:**
- [ ] `POST /chat {message}` → JSON `{reply, citations, meta}` grounded trên KB.
- [ ] Validate input (Pydantic), lỗi 422 rõ ràng.
**Verify:** curl/pytest httpx; câu KB → trả lời đúng.
**Deps:** T3, T5. **Files:** `ai-service/app/{schemas.py,main.py}`, `tests/integration/test_chat.py`. **Scope:** S.

### ✅ Checkpoint B (sau T3–6)
- [ ] KNOWLEDGE chạy end-to-end qua FastAPI, grounded trên `knowledge_chunks` thật, có citation.
- [ ] 🎓 Phải giải thích được: pipeline RAG từng bước, cosine vs distance, vì sao rerank/fuse, cách chống hallucination.
- [ ] **Review với người dùng.**

---

### Phase 2: Intent + Agent graph (3 trụ cột + 2 guard)

#### Task 7: Intent registry + classifier + cache
**Description:** `intent/registry.py` (5 nhãn config-driven, port từ SPEC.md cũ), `intent/classifier.py` (sinh prompt từ registry, 1 LLM call model nhẹ, validate, fallback KNOWLEDGE), cache Redis theo hash câu hỏi.
**Acceptance:**
- [ ] Thêm intent = sửa registry, 0 dòng logic; output lạ → KNOWLEDGE.
- [ ] Cache hit không gọi LLM; Redis down vẫn chạy (degrade).
**Verify:** unit (prompt build, parse, fallback); eval bảng ≥90%.
**Deps:** T3. **Files:** `ai-service/app/intent/{registry.py,classifier.py}`, `tests/unit/test_intent.py`. **Scope:** S–M.

#### Task 8: LangGraph agent graph (router + state)
**Description:** `agents/graph.py` (định nghĩa graph + state Pydantic) + `agents/nodes.py` (TỰ VIẾT logic: router dùng classifier, `knowledge_node` gọi pipeline T5, điều kiện web-fallback). Mới có 2 node thật (knowledge, fallback), số còn lại stub.
**Acceptance:**
- [ ] Graph route đúng theo intent (test với node mock); state truyền qua các bước.
- [ ] `knowledge_node` tái dùng `rag.pipeline`; fallback khi retrieval rỗng.
**Verify:** unit test định tuyến; integration câu KB qua graph = kết quả T6.
**Deps:** T6, T7. **Files:** `ai-service/app/agents/{graph.py,nodes.py}`, `tests/unit/test_graph.py`. **Scope:** M.

#### Task 9: Các node còn lại — live / greeting / offtopic / progress
**Description:** `services/web_search.py` + `live_search_node`; `greeting_node` + `offtopic_node`; `clients/node_api.py` + `user_progress_node` (gọi ngược Node API lấy dữ liệu học tập). Web fallback cho knowledge dùng chung web_search.
**Acceptance:**
- [ ] LIVE_SEARCH trả lời grounded web + nguồn; GREETING/OFF_TOPIC trả lời guard đúng.
- [ ] USER_PROGRESS lấy data qua Node API (auth token forward), trả lời theo data thật.
**Verify:** integration mỗi node 1 câu; progress test với Node chạy kèm.
**Deps:** T8. **Files:** `ai-service/app/services/web_search.py`, `app/clients/node_api.py`, `app/agents/nodes.py`. **Scope:** M.

### ✅ Checkpoint C (sau T7–9)
- [ ] Cả 5 intent route + trả lời đúng qua graph; webOnly tương đương Node.
- [ ] 🎓 Phải giải thích được: LangGraph state/node/edge, vì sao agent graph hơn if-else, fail-safe.
- [ ] **Review với người dùng.**

---

### Phase 3: Streaming + tích hợp Node (hybrid)

#### Task 10: `/chat/stream` SSE (streaming token)
**Description:** Route `GET/POST /chat/stream` chạy graph với callback `on_token`, đẩy SSE events (`status`/`token`/`text`/`done`) — mirror format Node hiện tại.
**Acceptance:**
- [ ] Client nhận token tăng dần; event cuối có `reply` đầy đủ + meta (intent, time, citations).
**Verify:** curl SSE thấy token deltas.
**Deps:** T9. **Files:** `ai-service/app/main.py`, `app/agents/graph.py`. **Scope:** S–M.

#### Task 11: Node gateway proxy (feature flag)
**Description:** Backend Node proxy `/chat` + `/chat/stream` sang `ai-service` sau `AI_SERVICE_ENABLED` (env). Auth giữ ở Node; SSE passthrough; tắt flag → handler Node cũ.
**Acceptance:**
- [ ] Flag ON: frontend chat hoạt động qua Python (cả stream).
- [ ] Flag OFF: quay về luồng Node cũ, không vỡ.
**Verify:** bật/tắt flag, test frontend cả 2 chế độ.
**Deps:** T10. **Files:** `backend/src/modules/chat/{controllers,services}/*` (proxy layer), `backend/.env.example`. **Scope:** M.

#### Task 12: Contract test + persistence
**Description:** Đảm bảo Node vẫn lưu hội thoại/usage từ kết quả proxied (metadata: intent/source/time/citations). Contract test schema Pydantic ↔ zod.
**Acceptance:**
- [ ] Hội thoại lưu đúng (intent, source, processing_time) khi qua Python.
- [ ] Contract test khớp field request/response 2 phía.
**Verify:** gửi chat qua Python → kiểm DB; chạy contract test.
**Deps:** T11. **Files:** `backend/.../chat.service.js`, `ai-service/tests/contract/`. **Scope:** S.

### ✅ Checkpoint D (sau T10–12)
- [ ] Hybrid full chạy qua frontend; rollback bằng flag; hội thoại lưu đúng.
- [ ] 🎓 Phải giải thích được: SSE vs WebSocket, proxy/gateway pattern, vì sao feature-flag migration.
- [ ] **Review với người dùng.**

---

### Phase 4: Eval, observability, docs, cleanup

#### Task 13: RAG/intent eval harness
**Description:** `tests/eval/` — bảng `{câu hỏi, intent kỳ vọng, đoạn ground-truth}`; đo intent accuracy, retrieval hit@k, faithfulness (LLM-judge), latency. So Python vs Node để chứng minh không hồi quy.
**Acceptance:**
- [ ] Báo cáo: intent ≥90%, faithfulness ≥ Node, latency ghi nhận.
**Verify:** `uv run pytest -m eval` xuất báo cáo.
**Deps:** T9. **Files:** `ai-service/tests/eval/*`. **Scope:** M.

#### Task 14: Observability + docs (nhật ký học tập)
**Description:** Structured logging (request id, intent, timing), metric cơ bản; `docs/PYTHON_AI_SERVICE.md` (kiến trúc, runbook, nhật ký quyết định & vì sao — dùng cho phỏng vấn).
**Acceptance:**
- [ ] Log có cấu trúc, đo thời gian từng stage; doc đủ để người khác dựng lại + bạn trình bày được.
**Verify:** xem log 1 request; review doc.
**Deps:** T12. **Files:** `ai-service/app/**` (logging), `docs/PYTHON_AI_SERVICE.md`. **Scope:** S–M.

#### Task 15: Gỡ lõi AI JS cũ (ask-first)
**Description:** Sau khi flag ON ổn định & eval đạt: gỡ dần `intentRouter.js`, handlers RAG JS, `advancedRAGFixed.js`... khỏi Node (giữ proxy). Hỏi trước khi xóa từng phần.
**Acceptance:**
- [ ] Node không còn lõi Aic JS trùng lặp; app vẫn chạy đầy đủ.
**Verify:** `npm run check` + smoke test toàn app.
**Deps:** T13, T14 + duyệt. **Files:** `backend/services/*`, `backend/src/modules/chat/*`. **Scope:** M (xóa).

### ✅ Checkpoint E (hoàn thành)
- [ ] Mọi success criteria trong spec đạt; portfolio-ready (doc + eval + demo).
- [ ] 🎓 Phải giải thích được: toàn bộ kiến trúc hybrid end-to-end.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vector Python không khớp định dạng pgvector (cast `::vector`) | Med | T4 integration so điểm trực tiếp với Node trên cùng câu |
| LangGraph + LlamaIndex lệch version / học cong | Med | Khung tối thiểu; tự viết node-logic; pin version trong pyproject |
| Proxy SSE Node→Python lỗi buffering | Med | T11 test stream thật; passthrough không buffer |
| USER_PROGRESS cần auth context khi gọi ngược Node | Med | Forward JWT/token từ gateway; T9 test có Node kèm |
| Ollama nặng tài nguyên máy dev | Low | Model nhỏ; chỉ để minh chứng on-prem, mặc định vẫn OpenAI-compat |
| Học sâu kéo dài tiến độ | Low | Checkpoint 🎓 cô đọng; framework lo phần không cốt lõi |

## Open Questions

Không còn — spec đã chốt toàn bộ. Sẵn sàng implement sau khi bạn duyệt plan.
