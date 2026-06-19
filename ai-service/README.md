# ai-service

Lõi AI (intent · RAG · agent) cho chatbot học tiếng Anh — **FastAPI**, chạy **hybrid** song song backend Node.
Spec: [`../PYTHON_AI_SERVICE_SPEC.md`](../PYTHON_AI_SERVICE_SPEC.md) · Kế hoạch: [`../tasks/plan.md`](../tasks/plan.md)

## Yêu cầu
- [uv](https://docs.astral.sh/uv/) (quản lý Python + deps). uv tự tải Python 3.12.
- Docker (chạy trong stack).

## Chạy local (dev)
```bash
uv sync                                              # cài deps + tạo .venv
cp .env.example .env                                 # điền giá trị thật
uv run uvicorn app.main:app --reload --port 8000     # dev server
curl localhost:8000/health                           # kiểm tra
```

## Chất lượng
```bash
uv run pytest            # test (mặc định bỏ qua -m integration / -m eval)
uv run ruff check .      # lint
uv run black .           # format
uv run mypy app          # type check
```

## Cấu trúc (dựng dần theo plan)
```
app/
  main.py        # FastAPI app + routes
  config.py      # Settings (Pydantic)
  intent/        # registry + classifier        (T7)
  rag/           # chunking/retrieval/rerank/pipeline (T4–T5)
  agents/        # LangGraph graph + nodes       (T8–T9)
  services/      # llm / embeddings / web_search / db / cache (T2–T9)
  clients/       # node_api (gọi ngược Node)     (T9)
tests/ unit | integration | eval
```
