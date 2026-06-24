# ai-service — Lõi AI Python (FastAPI)

Tài liệu kiến trúc + runbook + nhật ký quyết định cho `ai-service/`.
Spec: [`../PYTHON_AI_SERVICE_SPEC.md`](../PYTHON_AI_SERVICE_SPEC.md) · Kế hoạch: [`../tasks/plan.md`](../tasks/plan.md)

## 1. Vì sao

Lõi AI (intent · RAG · agent · LLM · web search) tách khỏi backend Node thành **một microservice Python**, chạy **hybrid** song song. Node giữ nghiệp vụ (auth, wallet, học tập, lưu hội thoại) + làm **gateway**. Mục tiêu: stack đúng thị trường AI Engineer (Python · FastAPI · LangGraph · LlamaIndex · pgvector) và học sâu bằng cách **tự viết** các thành phần cốt lõi thay vì gọi black-box.

## 2. Kiến trúc

```
Client ──HTTP──> Node (Express)                 ai-service (FastAPI :8000)
                  │  auth + persistence            │
                  │  AI_SERVICE_ENABLED=true        │
                  └── proxy /chat,/chat/stream ───> POST /chat, /chat/stream (SSE)
                                                     │
                                          ┌──────────┴───────────┐
                                          │   LangGraph agent     │
                                          │   router (intent)     │
                                          │   ├ knowledge (RAG)   │──> pgvector (knowledge_chunks)
                                          │   ├ live_search       │──> Tavily
                                          │   ├ user_progress ────┼──> Node /internal/user-progress
                                          │   ├ greeting          │
                                          │   └ offtopic          │
                                          └───────────────────────┘
                                          LLM: OpenAI-compat / Ollama (on-prem)
                                          Cache intent: Redis
```

**Dòng xử lý 1 request `/chat`:** router_node phân loại intent (LLM, cache Redis theo hash) → edge định tuyến tới node trụ cột → node sinh câu trả lời (RAG/web/...) → trả `{reply, source_type, citations, meta}`. `/chat/stream` bắc cầu `on_token` → SSE (`status`/`token`/`text`/`done`).

## 3. Module map (`ai-service/app/`)

| Đường dẫn | Vai trò | Tự viết? |
|---|---|---|
| `main.py` | FastAPI: `/health`, `/chat`, `/chat/stream` | — |
| `config.py` | Settings (Pydantic, đọc `.env`) | — |
| `observability.py` | Middleware request-id + timing log | ✔ |
| `intent/registry.py` | Nguồn sự thật 5 intent (thêm intent = sửa config) | ✔ |
| `intent/classifier.py` | Phân loại LLM (prompt sinh từ registry) + cache | ✔ |
| `rag/retrieval.py` | Truy vấn pgvector (SQL cosine `<=>`) | ✔ |
| `rag/rerank.py` | Rerank = α·vector + (1-α)·lexical overlap | ✔ |
| `rag/pipeline.py` | retrieve→rerank→fuse→generate→cite | ✔ |
| `agents/graph.py` + `nodes.py` | LangGraph wiring + logic từng node | wiring: LangGraph · logic: ✔ |
| `services/llm.py` | LLM client (OpenAI-compat + Ollama, stream, retry) | ✔ |
| `services/embeddings.py` | Embedding `text-embedding-3-small` (1536) | — |
| `services/web_search.py` | Tavily | ✔ |
| `services/db.py` / `cache.py` | asyncpg pool / redis | ✔ |
| `clients/node_api.py` | Gọi ngược Node (USER_PROGRESS) | ✔ |

## 4. Runbook

```bash
# Local dev (ai-service/)
uv sync
cp .env.example .env          # điền OPENAI_API_KEY, TAVILY_API_KEY...
uv run uvicorn app.main:app --reload --port 8000
curl localhost:8000/health

# Test
uv run pytest                 # unit (mặc định bỏ integration/eval)
uv run pytest -m integration  # DB/Redis/LLM/embeddings/Tavily thật
uv run pytest -m eval -s      # eval harness (in báo cáo accuracy/recall/faithfulness/latency)
uv run ruff check . && uv run black --check .

# Trong Docker stack
docker compose up -d --build ai-service ollama
docker exec chatbot-ollama ollama pull llama3.2   # (tùy chọn) chạy LLM on-prem

# Bật/tắt hybrid (phía Node)
# đặt AI_SERVICE_ENABLED=true cho backend rồi restart -> chat đi qua Python
# bỏ flag -> quay về luồng Node cũ (rollback an toàn)
```

## 5. Cấu hình (env)

`DB_*`, `REDIS_*` (dùng chung Node) · `OPENAI_API_KEY` · `EMBEDDING_MODEL=text-embedding-3-small` · `TAVILY_API_KEY` · `OLLAMA_BASE_URL` · `NODE_API_URL` · `INTENT_CACHE_TTL_SEC`.

## 6. Observability

Mỗi request có `X-Request-ID` (tự sinh hoặc nhận từ header) → log 1 dòng: `rid=<id> METHOD path -> status (Nms)`. router_node log intent + reasoning. Đối chiếu `X-Request-ID` giữa Node ↔ Python khi debug.

## 7. Kết quả eval (KB + LLM thật)

| Metric | Kết quả |
|---|---|
| Intent accuracy | 100% (8 ca) |
| Retrieval recall (câu KB) | 100% |
| Faithfulness (LLM-judge) | 100% |
| Latency intent / answer | ~1s / ~4s |

> KB hiện chứa tài liệu "QĐ02 - Quy định bảo mật thông tin" (91 chunks). Bài học: ngưỡng retrieval quá thấp (0.0) ép context lạc → hallucination; eval bắt được điều này (faithfulness tụt). Dùng threshold thực tế → grounded.

## 8. Nhật ký quyết định (cho phỏng vấn)

- **Hybrid thay vì viết lại toàn bộ:** chỉ tách lõi AI; phần nghiệp vụ (16k LOC Node) giữ nguyên → rủi ro thấp, giá trị portfolio cao.
- **Feature flag migration:** `AI_SERVICE_ENABLED` cho phép cutover dần + rollback tức thì (đổi 1 biến env), không downtime.
- **Registry-driven intent:** prompt phân loại sinh từ config → thêm intent = sửa data, không sửa logic.
- **Tự viết retrieval/rerank/node-logic:** hiểu cosine distance, fusion, citation, agent state — không phụ thuộc black-box; LangGraph/LlamaIndex chỉ làm khung.
- **Fail-safe về KNOWLEDGE:** mọi lỗi phân loại → KNOWLEDGE (còn web fallback) → không bao giờ "chết" câu hỏi.
- **Không re-index:** dùng đúng `text-embedding-3-small` + pgvector sẵn có → tái dùng `knowledge_chunks` của Node.
- **Cache intent theo hash:** bù độ trễ của LLM-classify; Redis down → degrade, không vỡ.
- **Test 3 tầng:** unit (logic thuần, mock) · integration (DB/LLM/Tavily thật) · eval (chất lượng RAG) — mặc định chỉ chạy unit cho nhanh.
