FROM python:3.12-slim AS build

ENV UV_PROJECT_ENVIRONMENT=/opt/venv UV_LINK_MODE=copy UV_COMPILE_BYTECODE=1
RUN pip install --no-cache-dir uv==0.11.32
WORKDIR /app
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project
COPY radar_ml ./radar_ml
RUN uv sync --frozen --no-dev

FROM python:3.12-slim

RUN useradd --uid 10001 --create-home radar && mkdir -p /data/raw /data/materials /data/state && chown -R radar /data
COPY --from=build /opt/venv /opt/venv
WORKDIR /app
COPY --from=build /app/radar_ml ./radar_ml
COPY config ./config
COPY prompts ./prompts
COPY snapshots ./snapshots
COPY eval ./eval

ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    RADAR_ML_DATA_DIR=/data/raw \
    RADAR_ML_MATERIALS_DIR=/data/materials \
    RADAR_ML_STATE_DIR=/data/state \
    RADAR_ML_CONFIG_DIR=/app/config \
    RADAR_ML_PROMPTS_DIR=/app/prompts \
    RADAR_ML_SNAPSHOT_PATH=/app/snapshots/news.jsonl

USER radar
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/healthz')"
CMD ["uvicorn", "radar_ml.api.app:app", "--host", "0.0.0.0", "--port", "8090"]
