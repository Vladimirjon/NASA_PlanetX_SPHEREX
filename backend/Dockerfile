FROM ghcr.io/astral-sh/uv:0.11.23 AS uv
FROM python:3.13-slim
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1 SKYSHIFT_CACHE_DIR=/tmp/skyshift-cache
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY src ./src
RUN uv sync --locked --no-dev && useradd --uid 1000 --create-home app
USER 1000
EXPOSE 7860
CMD ["/app/.venv/bin/uvicorn", "skyshift.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "7860"]
