# TODO: Python AI Service (FastAPI, hybrid)

Chi tiết: [tasks/plan.md](plan.md) · Spec: [PYTHON_AI_SERVICE_SPEC.md](../PYTHON_AI_SERVICE_SPEC.md)
Ưu tiên **học sâu** — mỗi checkpoint có mục 🎓 tự kiểm tra hiểu biết.

## Phase 0 — Foundation
- [x] **T1** — Scaffold `ai-service` (FastAPI `/health`, config, ruff/black/pytest, Dockerfile). `[S]` ✅ uv sync OK · ruff/black/pytest xanh · docker build + container /health 200
- [ ] **T2** — Nối Postgres (asyncpg) + Redis + thêm `ai-service`+`ollama` vào docker-compose. `[S–M]` — *cần T1*
- [ ] **✅ Checkpoint A** — service chạy trong stack, nối DB/Redis/Ollama → review.

## Phase 1 — KNOWLEDGE end-to-end (RAG)
- [ ] **T3** — LLM client `services/llm.py` (OpenAI-compat + Ollama, stream, retry, JSON). `[S]` — *cần T2*
- [ ] **T4** — Embeddings + pgvector retrieval **tự viết SQL** (`text-embedding-3-small` 1536). `[S–M]` — *cần T2*
- [ ] **T5** — RAG pipeline: rerank + fuse + citation **tự viết** (`rag/pipeline.py`). `[M]` — *cần T4*
- [ ] **T6** — `/chat` endpoint (KNOWLEDGE only, chưa graph) + Pydantic schemas. `[S]` — *cần T3,T5*
- [ ] **✅ Checkpoint B** — KNOWLEDGE grounded trên KB thật + citation → review.

## Phase 2 — Intent + Agent graph
- [ ] **T7** — Intent registry + classifier (1 LLM call, cache Redis, fallback KNOWLEDGE). `[S–M]` — *cần T3*
- [ ] **T8** — LangGraph graph + nodes **tự viết logic** (router + knowledge + fallback). `[M]` — *cần T6,T7*
- [ ] **T9** — Nodes còn lại: live_search / greeting / offtopic / progress (gọi ngược Node API). `[M]` — *cần T8*
- [ ] **✅ Checkpoint C** — 5 intent route + trả lời đúng qua graph → review.

## Phase 3 — Streaming + tích hợp Node
- [ ] **T10** — `/chat/stream` SSE (token streaming, mirror format Node). `[S–M]` — *cần T9*
- [ ] **T11** — Node gateway proxy `/chat`+`/chat/stream` sau `AI_SERVICE_ENABLED` (rollback flag). `[M]` — *cần T10*
- [ ] **T12** — Contract test (Pydantic↔zod) + persistence hội thoại đúng. `[S]` — *cần T11*
- [ ] **✅ Checkpoint D** — hybrid full qua frontend, rollback bằng flag → review.

## Phase 4 — Eval, observability, docs, cleanup
- [ ] **T13** — RAG/intent eval harness (accuracy, hit@k, faithfulness, latency; so vs Node). `[M]` — *cần T9*
- [ ] **T14** — Observability + `docs/PYTHON_AI_SERVICE.md` (nhật ký học tập). `[S–M]` — *cần T12*
- [ ] **T15** — (ask-first) Gỡ lõi AI JS cũ khỏi Node. `[M]` — *cần T13,T14 + duyệt*
- [ ] **✅ Checkpoint E** — đạt mọi success criteria, portfolio-ready.

---
Mọi điểm đã chốt — sẵn sàng implement sau khi bạn duyệt plan.
