"""Внутренний HTTP API ML-сервиса для Java-бэкенда.

Сервис не публичный: доступ по заголовку X-Internal-Token (RADAR_ML_INTERNAL_TOKEN).
Права пользователя на компанию проверяет бэкенд до вызова; ML дополнительно не выходит за пределы
company_id запроса — инструменты агента получают его из контекста, а не из ответа модели.
Ошибки — Problem Details (application/problem+json), как в публичном API.
"""

from __future__ import annotations

import json
import logging
import queue
import threading
import time
from collections.abc import Iterator
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import Field

from radar_ml import __version__
from radar_ml.agent.ask import AskAgent
from radar_ml.bank.service import get_bank
from radar_ml.data.dataset import get_dataset
from radar_ml.facts.extract import SourceText, document_text, extract_facts
from radar_ml.llm.gateway import LLMUnavailable, get_gateway
from radar_ml.llm.prompts import load_prompt
from radar_ml.news.service import get_news
from radar_ml.news.sources import UnsafeURL, fetch_article
from radar_ml.pipeline import (
    build_feed,
    candidates_for,
    generate_insight,
    get_job,
    profile_for,
    reference_now,
    submit_job,
)
from radar_ml.schemas import CompanyContext, Position, Schema
from radar_ml.settings import get_settings
from radar_ml.store import get_store

log = logging.getLogger("radar_ml")


# ----------------------------------------------------------------------------- startup


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    s = get_settings()
    logging.basicConfig(level=s.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    get_dataset()
    news = get_news()
    if s.load_snapshot_on_start and not news.events:
        n = news.load_snapshot(s.snapshot_path, use_llm=False)
        log.info("news snapshot loaded: %s articles, %s events", n, len(news.events))

    def ingest_materials() -> None:
        # Разбор PDF с извлечением позиций моделью может идти минуты — API не ждёт его, /readyz показывает прогресс.
        try:
            loaded = get_bank().ingest_dir(use_llm=True)
            log.info("bank materials ingested: %s", len(loaded))
        except Exception:  # noqa: BLE001
            log.exception("bank materials ingestion failed")

    threading.Thread(target=ingest_materials, daemon=True, name="bank-ingest").start()
    stop = threading.Event()
    if s.collect_interval_min > 0:

        def loop() -> None:
            while not stop.wait(s.collect_interval_min * 60):
                try:
                    log.info("scheduled collect: %s", news.collect())
                except Exception:  # noqa: BLE001
                    log.exception("scheduled collect failed")

        threading.Thread(target=loop, daemon=True, name="news-collector").start()
    yield
    stop.set()


app = FastAPI(
    title="Radar ML",
    version=__version__,
    description="ML-сервис «Радара»: профиль компании, новости, аналитика банка, отбор событий и агент интерпретации",
    lifespan=lifespan,
)


def problem(status: int, type_: str, title: str, detail: str | None = None) -> JSONResponse:
    body = {"type": f"/problems/{type_}", "title": title, "status": status}
    if detail:
        body["detail"] = detail
    return JSONResponse(body, status_code=status, media_type="application/problem+json")


@app.exception_handler(HTTPException)
async def http_exc(_: Request, exc: HTTPException) -> JSONResponse:
    d = exc.detail if isinstance(exc.detail, dict) else {"type": "error", "title": str(exc.detail)}
    return problem(exc.status_code, d.get("type", "error"), d.get("title", "Ошибка"), d.get("detail"))


@app.exception_handler(RequestValidationError)
async def validation_exc(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [
        {
            "field": ".".join(str(x) for x in e.get("loc", [])[1:]),
            "title": e.get("type", "invalid"),
            "description": e.get("msg", ""),
        }
        for e in exc.errors()
    ]
    resp = problem(422, "validation-failed", "Ошибка валидации", errors[0]["description"] if errors else None)
    body = json.loads(resp.body)
    body["errors"] = errors
    return JSONResponse(body, status_code=422, media_type="application/problem+json")


@app.exception_handler(LLMUnavailable)
async def llm_exc(_: Request, exc: LLMUnavailable) -> JSONResponse:
    return problem(503, "ai-unavailable", "Сервис анализа недоступен", str(exc)[:300])


def auth(x_internal_token: str | None = Header(default=None)) -> None:
    expected = get_settings().internal_token.get_secret_value()
    if expected and x_internal_token != expected:
        raise HTTPException(401, {"type": "unauthorized", "title": "Нужен внутренний токен сервиса"})


def not_found(what: str) -> HTTPException:
    return HTTPException(404, {"type": "not-found", "title": f"{what} не найден"})


# ----------------------------------------------------------------------------- models


class ContextBody(Schema):
    context: CompanyContext | None = None
    position: Position | None = None
    limit: int = Field(default=12, ge=1, le=50)
    generate: bool = True


class GenerateBody(Schema):
    company_id: str
    event_id: str
    context: CompanyContext | None = None
    force: bool = False


class AskBody(Schema):
    company_id: str
    context: CompanyContext | None = None
    insight: dict[str, Any]
    question: str = Field(min_length=1, max_length=500)
    role: Position | None = None


class IngestBody(Schema):
    url: str | None = None
    title: str | None = Field(default=None, max_length=500)
    text: str | None = Field(default=None, max_length=50_000)
    publisher: str | None = None
    published_at: datetime | None = None


class LinkIn(Schema):
    url: str
    label: str | None = None
    text: str | None = Field(default=None, description="Текст страницы, если бэкенд уже загрузил её сам")


class FactsBody(Schema):
    company_id: str
    text: str | None = Field(default=None, max_length=5000)
    links: list[LinkIn] = Field(default=[], max_length=5)
    existing: list[str] = Field(
        default=[], description="Формулировки фактов компании в любом статусе — для защиты от дублей"
    )


def _ctx(company_id: str, ctx: CompanyContext | None) -> CompanyContext:
    if ctx is None:
        return CompanyContext(company_id=company_id)
    if ctx.company_id != company_id:
        raise HTTPException(
            400, {"type": "bad-request", "title": "companyId контекста не совпадает с запросом"}
        )
    return ctx


# ----------------------------------------------------------------------------- health


@app.get("/healthz", tags=["service"])
def healthz() -> dict[str, Any]:
    return {"status": "ok", "version": __version__}


@app.get("/readyz", tags=["service"], dependencies=[Depends(auth)])
def readyz() -> dict[str, Any]:
    ds = get_dataset()
    gw = get_gateway()
    return {
        "dataset": ds.loaded,
        "events": len(get_news().events),
        "bankMaterials": len(get_bank().materials),
        "llmMode": gw.mode,
        "llmAvailable": gw.available("insight_draft"),
        "referenceTime": reference_now().isoformat(),
    }


@app.get("/v1/meta", tags=["service"], dependencies=[Depends(auth)])
def meta() -> dict[str, Any]:
    gw = get_gateway()
    prompts = {}
    for name in (
        "news_extract",
        "bank_positions",
        "bank_vision",
        "insight_plan",
        "insight_draft",
        "insight_critic",
        "ask_answer",
        "facts_extract",
    ):
        prompts[name] = load_prompt(name).version
    return {
        "version": __version__,
        "prompts": prompts,
        "models": {k: v["id"] for k, v in gw.models.items()},
        "tasks": {k: v["models"] for k, v in gw.tasks.items()},
    }


@app.get("/v1/usage", tags=["service"], dependencies=[Depends(auth)])
def usage() -> dict[str, Any]:
    return get_gateway().usage_today()


@app.get("/v1/quality", tags=["service"], dependencies=[Depends(auth)])
def quality(days: int = Query(default=7, ge=1, le=90)) -> dict[str, Any]:
    """Метрики AI-компонента: самопроверка, адаптация, откаты на правила, стоимость, время, вызовы инструментов."""
    from radar_ml.eval.quality import ai_quality

    return ai_quality(days)


# ----------------------------------------------------------------------------- companies


@app.get("/v1/dataset/quality", tags=["companies"], dependencies=[Depends(auth)])
def dataset_quality() -> dict[str, Any]:
    return get_dataset().quality


@app.get("/v1/companies/search", tags=["companies"], dependencies=[Depends(auth)])
def companies_search(
    q: str = "",
    min_revenue: float | None = Query(default=None, alias="minRevenue"),
    limit: int = Query(default=20, le=100),
) -> dict[str, Any]:
    items = get_dataset().search(q, limit=limit, min_revenue=min_revenue)
    return {
        "items": [
            {
                "id": c.id,
                "okved": c.okved_code,
                "industry": c.okved_name,
                "region": c.region,
                "revenue": c.revenue,
            }
            for c in items
        ]
    }


@app.post("/v1/companies/{company_id}/profile", tags=["companies"], dependencies=[Depends(auth)])
def company_profile(company_id: str, body: ContextBody | None = None) -> dict[str, Any]:
    ctx = _ctx(company_id, body.context if body else None)
    bp = profile_for(company_id, ctx)
    return {"profile": bp.profile.dump(), "signals": {k: v.dump() for k, v in bp.signals.items.items()}}


@app.post("/v1/companies/{company_id}/candidates", tags=["feed"], dependencies=[Depends(auth)])
def company_candidates(company_id: str, body: ContextBody | None = None) -> dict[str, Any]:
    body = body or ContextBody()
    ctx = _ctx(company_id, body.context)
    _, cands = candidates_for(company_id, ctx, body.position, limit=body.limit)
    news = get_news()
    out = []
    for c in cands:
        ev = news.get(c.event_id)
        out.append(
            {
                **c.dump(),
                "event": {
                    "title": ev.title,
                    "stage": ev.stage,
                    "occurredAt": ev.occurred_at.isoformat() if ev and ev.occurred_at else None,
                }
                if ev
                else None,
            }
        )
    return {"items": out}


@app.post("/v1/companies/{company_id}/feed", tags=["feed"], dependencies=[Depends(auth)])
def company_feed(company_id: str, body: ContextBody | None = None) -> dict[str, Any]:
    """Синхронная сборка ленты. С генерацией выводов может идти минуты — для бэкенда удобнее /feed/jobs."""
    body = body or ContextBody()
    return build_feed(company_id, _ctx(company_id, body.context), body.position, body.limit, body.generate)


@app.post(
    "/v1/companies/{company_id}/feed/jobs", tags=["feed"], status_code=202, dependencies=[Depends(auth)]
)
def company_feed_job(company_id: str, body: ContextBody | None = None) -> dict[str, Any]:
    body = body or ContextBody()
    return submit_job(
        "feed",
        build_feed,
        company_id,
        _ctx(company_id, body.context),
        body.position,
        body.limit,
        body.generate,
    )


@app.get("/v1/jobs/{job_id}", tags=["feed"], dependencies=[Depends(auth)])
def job_status(job_id: str) -> dict[str, Any]:
    j = get_job(job_id)
    if not j:
        raise not_found("Задание")
    return j


# ----------------------------------------------------------------------------- insights


@app.post("/v1/insights/generate", tags=["insights"], dependencies=[Depends(auth)])
def insight_generate(body: GenerateBody) -> dict[str, Any]:
    if not get_news().get(body.event_id):
        raise not_found("Событие")
    ctx = _ctx(body.company_id, body.context)
    return generate_insight(body.company_id, body.event_id, ctx, force=body.force).dump()


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/v1/insights/generate/stream", tags=["insights"], dependencies=[Depends(auth)])
def insight_generate_stream(body: GenerateBody) -> StreamingResponse:
    """Шаги агента потоком (step), затем insight или error — для экрана «агент готовит вывод»."""
    if not get_news().get(body.event_id):
        raise not_found("Событие")
    ctx = _ctx(body.company_id, body.context)
    q: queue.Queue[tuple[str, dict[str, Any]] | None] = queue.Queue()

    def work() -> None:
        try:
            content = generate_insight(
                body.company_id,
                body.event_id,
                ctx,
                force=body.force,
                on_step=lambda st: q.put(("step", st.dump())),
            )
            q.put(("insight", content.dump()))
        except Exception as e:  # noqa: BLE001
            log.exception("stream generate failed")
            q.put(
                (
                    "error",
                    {
                        "type": "/problems/insight-failed",
                        "title": "Не удалось подготовить вывод",
                        "detail": str(e)[:200],
                    },
                )
            )
        q.put(None)

    threading.Thread(target=work, daemon=True).start()

    def gen() -> Iterator[str]:
        while True:
            try:
                item = q.get(timeout=15)
            except queue.Empty:
                yield ": keep-alive\n\n"
                continue
            if item is None:
                return
            yield _sse(*item)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-store"})


@app.post("/v1/insights/ask", tags=["insights"], dependencies=[Depends(auth)])
def insight_ask(body: AskBody) -> StreamingResponse:
    """Совпадает с публичным AskStream: step*, затем answer или error."""
    ctx = _ctx(body.company_id, body.context)
    if body.insight.get("companyId") and body.insight["companyId"] != body.company_id:
        raise HTTPException(400, {"type": "bad-request", "title": "Вывод относится к другой компании"})
    bp = profile_for(body.company_id, ctx)
    timeout = get_settings().ask_timeout_s

    def gen() -> Iterator[str]:
        t0 = time.monotonic()
        try:
            for chunk in AskAgent().stream(bp, body.insight, body.question, body.role):
                yield chunk
                if time.monotonic() - t0 > timeout:
                    yield _sse(
                        "error",
                        {
                            "type": "/problems/answer-timeout",
                            "title": "Ответ не подготовлен вовремя",
                            "detail": "Попробуйте задать вопрос ещё раз.",
                        },
                    )
                    return
        except LLMUnavailable:
            yield _sse(
                "error",
                {
                    "type": "/problems/ai-unavailable",
                    "title": "Сервис анализа недоступен",
                    "detail": "Не удалось подготовить ответ. Попробуйте позже.",
                },
            )
        except Exception:  # noqa: BLE001
            log.exception("ask failed")
            yield _sse("error", {"type": "/problems/answer-failed", "title": "Не удалось подготовить ответ"})

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-store"})


# ----------------------------------------------------------------------------- news


@app.post("/v1/news/ingest", tags=["news"], dependencies=[Depends(auth)])
def news_ingest(body: IngestBody) -> dict[str, Any]:
    """Свежая новость по ссылке или текстом — для проверки на ранее не показанных новостях."""
    news = get_news()
    try:
        if body.url and not body.text:
            ev, change = news.ingest_url(body.url)
        elif body.text:
            ev, change = news.ingest_text(
                body.title or body.text[:120],
                body.text,
                url=body.url,
                publisher=body.publisher,
                published_at=body.published_at,
            )
        else:
            raise HTTPException(422, {"type": "validation-failed", "title": "Нужна ссылка или текст новости"})
    except UnsafeURL as e:
        raise HTTPException(
            422, {"type": "unsafe-url", "title": "Ссылка не принята", "detail": str(e)}
        ) from e
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            502,
            {"type": "source-unavailable", "title": "Не удалось загрузить новость", "detail": str(e)[:200]},
        ) from e
    return {"change": change, "event": ev.dump()}


@app.post("/v1/news/collect", tags=["news"], dependencies=[Depends(auth)])
def news_collect(sources: list[str] | None = None) -> dict[str, Any]:
    return get_news().collect(sources)


@app.get("/v1/events", tags=["news"], dependencies=[Depends(auth)])
def events_list(limit: int = Query(default=50, le=500), all: bool = False) -> dict[str, Any]:  # noqa: A002
    evs = get_news().list(relevant_only=not all)[:limit]
    return {"items": [e.dump() for e in evs]}


@app.get("/v1/events/{event_id}", tags=["news"], dependencies=[Depends(auth)])
def event_get(event_id: str) -> dict[str, Any]:
    ev = get_news().get(event_id)
    if not ev:
        raise not_found("Событие")
    return ev.dump()


# ----------------------------------------------------------------------------- facts


@app.post("/v1/facts/extract", tags=["facts"], dependencies=[Depends(auth)])
def facts_extract(body: FactsBody) -> dict[str, Any]:
    sources: list[SourceText] = []
    incomplete: list[dict[str, str]] = []
    if body.text and body.text.strip():
        sources.append(SourceText(kind="text", label="Описание компании", text=body.text.strip()))
    for ln in body.links:
        label = ln.label or urlparse(ln.url).hostname or ln.url
        if ln.text:
            sources.append(SourceText(kind="link", label=label, text=ln.text))
            continue
        try:
            art = fetch_article(ln.url)
            sources.append(SourceText(kind="link", label=label, text=f"{art.title}. {art.text}"))
        except Exception:  # noqa: BLE001 — недоступная ссылка не ошибка запроса
            incomplete.append({"kind": "link", "label": label})
    if not sources:
        if incomplete:
            return {"facts": [], "incompleteSources": incomplete, "unknownFields": [], "method": "none"}
        raise HTTPException(
            422, {"type": "validation-failed", "title": "Опишите компанию или добавьте ссылку"}
        )
    res = extract_facts(sources, body.existing, company_hint=body.company_id)
    res["incompleteSources"] = res.get("incompleteSources", []) + incomplete
    return res


@app.post("/v1/facts/extract-documents", tags=["facts"], dependencies=[Depends(auth)])
async def facts_extract_documents(
    company_id: str = Form(alias="companyId"),
    existing: str = Form(default="[]", description="JSON-массив формулировок существующих фактов"),
    files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    if not 1 <= len(files) <= 5:
        raise HTTPException(422, {"type": "validation-failed", "title": "Нужно от 1 до 5 файлов"})
    sources = []
    for f in files:
        data = await f.read()
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(
                413, {"type": "content-too-large", "title": f"Файл «{f.filename}» больше 10 МБ"}
            )
        try:
            sources.append(document_text(f.filename or "Документ", data))
        except ValueError as e:
            raise HTTPException(
                422, {"type": "validation-failed", "title": f"Файл «{f.filename}»: {e}"}
            ) from e
    try:
        known = json.loads(existing or "[]")
        if not isinstance(known, list):
            raise ValueError
    except ValueError as e:
        raise HTTPException(
            422, {"type": "validation-failed", "title": "existing — JSON-массив строк"}
        ) from e
    return extract_facts(sources, [str(x) for x in known], company_hint=company_id)


# ----------------------------------------------------------------------------- bank


@app.get("/v1/bank/materials", tags=["bank"], dependencies=[Depends(auth)])
def bank_materials() -> dict[str, Any]:
    return {"items": get_bank().list_materials(reference_now())}


@app.post("/v1/bank/materials", tags=["bank"], dependencies=[Depends(auth)])
async def bank_upload(file: UploadFile = File(...)) -> dict[str, Any]:
    data = await file.read()
    if not data.startswith(b"%PDF"):
        raise HTTPException(422, {"type": "validation-failed", "title": "Нужен PDF"})
    s = get_settings()
    s.materials_dir.mkdir(parents=True, exist_ok=True)
    name = (file.filename or "material.pdf").replace("/", "_").replace("\\", "_")
    path = s.materials_dir / name
    path.write_bytes(data)
    m = get_bank().ingest_pdf(path, force=True)
    return m.dump()


@app.post("/v1/bank/materials/{material_id}/outdated", tags=["bank"], dependencies=[Depends(auth)])
def bank_mark_outdated(material_id: str, outdated: bool = True) -> dict[str, Any]:
    m = get_bank().mark_outdated(material_id, outdated)
    if not m:
        raise not_found("Материал")
    return m.dump()


@app.get("/v1/bank/search", tags=["bank"], dependencies=[Depends(auth)])
def bank_search(q: str, k: int = Query(default=5, le=20)) -> dict[str, Any]:
    return {"items": get_bank().search(q, k=k, now=reference_now())}


# ----------------------------------------------------------------------------- traces


@app.get("/v1/traces/{trace_id}", tags=["traces"], dependencies=[Depends(auth)])
def trace_get(trace_id: str) -> dict[str, Any]:
    t = get_store().get_json("traces", "id", trace_id)
    if not t:
        raise not_found("Трасса")
    return t
