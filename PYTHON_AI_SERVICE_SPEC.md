# Spec: Python AI Service — tách lõi AI sang FastAPI (hybrid lâu dài)

> Trạng thái: **DRAFT — chờ duyệt**. Chưa code tới khi bạn xác nhận.
> Quan hệ với tài liệu khác: **thay thế** [SPEC.md](SPEC.md) (refactor intent trong Node) — lõi intent sẽ được xây lại trong service Python này. Khuyến nghị tạm dừng `tasks/plan.md` cũ.
> Bám theo định hướng nghề: [AI Engineer — Ngân hàng](file:///Users/macbook/Documents/Brain%20Database/Obsidian/AI%20Engineer%20-%20Ng%C3%A2n%20h%C3%A0ng%20(Job).md).

## Objective

**Bối cảnh:** App hiện tại là nền tảng học tiếng Anh (Node/Express, 16k LOC, 17 module + React). Toàn bộ "trí tuệ" (RAG, intent, agent, embedding, web search, LLM orchestration) đang nằm rải trong `backend/services/*` và `backend/src/modules/chat/*`, viết bằng JS.

**Mục tiêu:** Tách lõi AI thành **một microservice Python (FastAPI)** chạy **song song lâu dài** với Node. Node giữ nghiệp vụ (auth, wallet/VNPay, vocabulary/listening/reading/..., lưu hội thoại, usage, frontend) và làm **gateway** gọi sang Python qua HTTP/SSE. Mục tiêu thực dụng: **xây năng lực + portfolio đúng JD AI Engineer**, đồng thời **học sâu** bằng cách tự implement các thành phần RAG/agent cốt lõi.

**Người dùng:** (1) end-user của chatbot (không đổi UX); (2) chính bạn — học và có sản phẩm minh chứng cho phỏng vấn.

**Service Python sở hữu:**
- Intent classification (3 trụ cột `KNOWLEDGE/LIVE_SEARCH/USER_PROGRESS` + guard `GREETING/OFF_TOPIC`) — config-driven, có cache.
- RAG pipeline: chunking → embedding → retrieve (pgvector) → rerank → fuse context → generate, có citation.
- Agent orchestration bằng **LangGraph**: router → các sub-agent (knowledge/live/progress), có web-search fallback.
- LLM orchestration (OpenAI-compatible + Ollama cho on-prem) với streaming token (SSE).
- Web search service.

**Node giữ lại (không động):** auth, wallet/payment, 16 module nghiệp vụ, persistence hội thoại + usage (Postgres), frontend. Node proxy `/chat` + `/chat/stream` sang Python (giữ auth ở Node).

**Không làm trong đợt này:** viết lại auth/wallet/learning sang Python; đổi frontend; fine-tune model; K8s/GPU thực tế (chỉ chuẩn bị Docker + tài liệu, xem Boundaries).

### Dung hòa "framework" vs "học sâu"
| Thành phần | Dùng framework | Tự viết (học sâu) |
|---|---|---|
| API server, SSE, validation | FastAPI + Pydantic | — |
| Agent graph (router, state, fallback) | LangGraph (khung) | **Logic từng node** (điều kiện route, fuse, fallback) |
| RAG index/query engine | LlamaIndex (khung) | **Chunking, retrieval scoring, rerank, citation** dưới dạng custom component |
| Embedding & vector store | LlamaIndex adapter | Hiểu & cấu hình pgvector trực tiếp; tự viết SQL truy vấn vector |
| LLM client | openai SDK / Ollama | Wrapper streaming + retry + JSON-mode parse |

## Tech Stack

- **Python 3.12**, **FastAPI**, **Uvicorn**; **Pydantic v2** cho schema.
- **LangGraph** (agent orchestration), **LlamaIndex** (RAG khung).
- LLM: **openai** SDK (OpenAI-compatible: OpenRouter/local), **Ollama** (on-prem) — chọn qua config.
- Embeddings: **OpenAI `text-embedding-3-small` (1536 chiều)** — ĐÃ xác định từ code Node ([embeddingVector.js](backend/services/embeddingVector.js)). Python dùng đúng model này → **tương thích vector đã index, KHÔNG re-index**.
- Vector DB: **PostgreSQL + pgvector** (cột `vector` thật, truy vấn native `embedding <=> $1::vector`, xem [vectorDatabase.js](backend/services/vectorDatabase.js)); tái dùng nguyên bảng `knowledge_chunks`. Giữ pgvector cả đợt; Qdrant để sau (không trong scope).
- LLM on-prem: **Ollama** dựng trong `docker-compose` ngay đợt này (minh chứng "LLM on-premise" theo JD).
- Cache/queue: **Redis** (ioredis phía Node đã có; Python dùng `redis-py`), tái dùng infra.
- Quản lý deps: **uv** (nhanh, hiện đại) + `pyproject.toml`.
- Lint/format: **ruff** + **black**; type: **mypy** (mức cơ bản).
- Test: **pytest** + **pytest-asyncio**; eval RAG: bộ harness riêng (xem Testing).
- Đóng gói: **Dockerfile** + thêm service `ai-service` vào `docker-compose.yml` hiện có.

## Commands

```bash
# trong ai-service/
uv sync                          # cài deps theo pyproject.toml
uv run uvicorn app.main:app --reload --port 8000   # dev server
uv run pytest                    # unit + integration
uv run pytest -m eval            # chạy RAG eval harness
uv run ruff check . --fix        # lint
uv run black .                   # format
uv run mypy app                  # type check

# toàn hệ thống
docker compose up ai-service     # chạy service Python trong stack
docker compose up                # cả Node + Python + Postgres + Redis + Kafka
```

## Project Structure

```
ai-service/                       → (MỚI) microservice Python, sibling của backend/ & frontend/
  pyproject.toml                  → deps + tool config (ruff/black/mypy/pytest)
  Dockerfile
  app/
    main.py                       → FastAPI app, routes /chat, /chat/stream, /health
    config.py                     → Settings (Pydantic BaseSettings, đọc .env)
    schemas.py                    → Pydantic request/response (mirror chat.schemas.js)
    intent/
      registry.py                 → INTENT_REGISTRY (config nguồn sự thật)
      classifier.py               → phân loại LLM, sinh prompt từ registry, cache Redis
    rag/
      chunking.py                 → (tự viết) chiến lược chunk
      retrieval.py                → (tự viết) truy vấn pgvector + scoring
      rerank.py                   → (tự viết) rerank context
      pipeline.py                 → ghép retrieve→rerank→fuse→generate (citation)
    agents/
      graph.py                    → LangGraph: router + sub-agents + fallback
      nodes.py                    → (tự viết) logic từng node
    services/
      llm.py                      → LLM client (OpenAI-compat + Ollama), streaming, retry
      embeddings.py               → embedding client
      web_search.py               → web search
      db.py                       → pool Postgres (asyncpg), truy vấn vector
      cache.py                    → redis-py helpers (intent cache)
    clients/
      node_api.py                 → gọi ngược Node cho USER_PROGRESS (business data)
  tests/
    unit/                         → test thuần (chunking, registry, parse JSON...)
    integration/                  → test gọi LLM/DB thật (đánh dấu, chạy thủ công)
    eval/                         → RAG eval harness (bảng câu hỏi + ground truth)
backend/                          → (SỬA nhẹ) thêm proxy chat → ai-service; gỡ dần lõi AI JS
docker/                           → (SỬA) thêm ai-service vào compose
docs/PYTHON_AI_SERVICE.md         → (MỚI) kiến trúc + runbook + ghi chú học tập
```

## Code Style

Ưu tiên rõ ràng, type hint đầy đủ, async I/O, tách thuần (pure) khỏi side-effect để test dễ. Ví dụ một node tự viết trong agent graph:

```python
# app/agents/nodes.py
from app.rag.pipeline import RagPipeline
from app.schemas import ChatState

async def knowledge_node(state: ChatState, rag: RagPipeline) -> ChatState:
    """Trụ cột KNOWLEDGE: RAG nội bộ, fallback web nếu rỗng.

    Tự viết logic quyết định (điểm retrieval thấp -> web), không để framework
    tự lo, để nắm rõ luồng và dễ giải thích khi phỏng vấn.
    """
    chunks = await rag.retrieve(state.search_query, top_k=state.top_k)
    if not chunks:
        return state.copy(update={"next": "web_fallback"})
    reranked = rag.rerank(state.message, chunks)        # hàm thuần, test được
    context = rag.fuse(reranked)
    answer = await rag.generate(state.message, context, stream=state.on_token)
    return state.copy(update={"answer": answer, "citations": rag.cite(reranked)})
```

- Tên: snake_case (hàm/biến), PascalCase (class), UPPER_SNAKE (hằng/registry).
- Mọi hàm gọi LLM/DB là `async`; hàm tính toán thuần để `def` thường + unit test.
- Fail-safe: lỗi phân loại/parse → `KNOWLEDGE` (giữ triết lý an toàn hiện có).
- Comment tiếng Việt cho ý đồ thiết kế; docstring nêu "vì sao", không mô tả cái hiển nhiên.

## Testing Strategy

- **Unit (pytest):** thành phần thuần — `chunking`, `registry`, parse JSON intent, rerank scoring, fuse. Không gọi mạng. Mục tiêu phủ logic tự viết ≥ 80%.
- **Integration (đánh dấu `-m integration`):** classifier gọi LLM thật, retrieval gọi pgvector thật. Chạy thủ công, không vào CI mặc định.
- **RAG eval harness (`-m eval`):** bảng `{câu hỏi, nhãn intent kỳ vọng, đoạn ground-truth}`; đo: accuracy intent (≥90%), retrieval hit@k, faithfulness (LLM-judge), độ trễ. So sánh service Python vs hành vi Node hiện tại để chứng minh không hồi quy.
- **Contract test:** schema request/response Python ↔ Node proxy khớp (Pydantic ↔ zod), tránh vỡ tích hợp.

## Boundaries

- **Always:**
  - Giữ Node chạy được suốt quá trình (hybrid) — mỗi bước có thể bật/tắt proxy sang Python qua feature flag.
  - Tự viết các thành phần RAG/agent cốt lõi (chunking/retrieval/rerank/node logic) thay vì gọi black-box — đúng mục tiêu học sâu.
  - Tái dùng schema DB hiện có (`knowledge_chunks`...) — không tạo bảng trùng lặp.
  - `ruff` + `black` + `pytest` xanh trước khi commit.
  - Ghi "nhật ký học tập" vào `docs/PYTHON_AI_SERVICE.md` (quyết định + vì sao) để dùng khi phỏng vấn.
- **Ask first:**
  - Đổi schema DB hoặc cách tính/ lưu embedding (ảnh hưởng vector đã index).
  - Cho frontend gọi thẳng Python (thay vì qua Node gateway).
  - Thêm hạ tầng mới (Qdrant, Airflow, vLLM) — làm khi tới phase tương ứng, hỏi trước.
  - Gỡ code AI JS cũ khỏi Node (chỉ gỡ sau khi bản Python đã thay thế & verify).
- **Never:**
  - Commit secrets / `.env`.
  - Phá luồng đăng nhập/thanh toán đang chạy.
  - Đổi embedding model khiến vector cũ không tương thích mà không re-index.
  - Xóa test để cho "xanh".

## Success Criteria

1. `ai-service` chạy được: `POST /chat` và `GET /chat/stream` (SSE) trả lời đúng cho cả 5 nhãn intent, có streaming token.
2. RAG pipeline tự viết (chunking/retrieval/rerank/fuse/citation) hoạt động trên `knowledge_chunks` hiện có; eval harness đạt: intent ≥90%, faithfulness không kém bản Node.
3. Agent graph LangGraph định tuyến 3 trụ cột + guard + web fallback; USER_PROGRESS gọi ngược Node API lấy dữ liệu học tập.
4. Node proxy chat sang Python sau **feature flag**; tắt flag → quay lại luồng Node cũ (an toàn rollback).
5. `docker compose up` chạy cả Node + Python + Postgres + Redis; có `Dockerfile` cho `ai-service`.
6. `docs/PYTHON_AI_SERVICE.md` mô tả kiến trúc, cách chạy, và nhật ký học tập (đủ để tự tin trình bày khi phỏng vấn).
7. App vẫn hoạt động đầy đủ trong suốt quá trình (không downtime nghiệp vụ).

## Đã chốt (toàn bộ Open Questions)

1. **Embedding:** `text-embedding-3-small` (1536 chiều), pgvector native → **không re-index**, Python dùng đúng model + query thẳng `knowledge_chunks`.
2. **Repo layout:** `ai-service/` trong **cùng repo** (monorepo).
3. **USER_PROGRESS:** Python **gọi ngược Node API** (business logic giữ 1 nơi).
4. **Vector DB:** **giữ pgvector** cả đợt; Qdrant ngoài scope.
5. **On-prem LLM:** **dựng Ollama** trong `docker-compose` đợt này.
6. **SPEC.md cũ (intent Node):** **BỎ** — dồn lõi intent sang Python. `tasks/plan.md` + `tasks/todo.md` cũ ngừng áp dụng.

→ Không còn câu hỏi mở. Sẵn sàng sang Phase 2 (Plan) sau khi bạn duyệt spec.
