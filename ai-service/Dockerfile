# ai-service: FastAPI chạy bằng uv.
FROM python:3.12-slim AS base

# uv copy thẳng từ image chính thức (nhanh, không cần curl)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Node + npx: cho các MCP server chạy qua `npx ...` (sequential-thinking, tavily-mcp...).
# Server Python (uvx) không cần Node; chỉ cài để mở khoá nhóm npx.
RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Cài deps trước (tận dụng cache layer): chỉ copy file khóa + project metadata
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-install-project --no-dev || uv sync --no-install-project --no-dev

# Copy mã nguồn
COPY app ./app

EXPOSE 8000
CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
