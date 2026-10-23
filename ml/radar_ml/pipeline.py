"""Сценарии верхнего уровня: профиль -> кандидаты -> выводы для ленты компании.

Содержимое вывода общее для всех участников компании (так требует API), поэтому вывод готовится
без учёта должности; должность влияет на порядок ленты и на ответы на вопросы.
Готовые выводы кэшируются: повторная сборка ленты не тратит лимит LLM, пока не изменились событие,
подтверждённые сведения компании или версии промптов.
"""

from __future__ import annotations

import json
import logging
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import Any

from radar_ml.agent.runner import InsightAgent, insight_key
from radar_ml.data.dataset import get_dataset
from radar_ml.llm.gateway import get_gateway
from radar_ml.llm.prompts import load_prompt
from radar_ml.matching.scorer import rank_candidates, score_event
from radar_ml.news.service import get_news
from radar_ml.nlp.text import content_hash
from radar_ml.profile.builder import BuiltProfile, build_profile
from radar_ml.schemas import Candidate, CompanyContext, Event, InsightContent
from radar_ml.settings import get_settings
from radar_ml.store import get_store

log = logging.getLogger(__name__)

PROMPTS = ("insight_plan", "insight_draft", "insight_critic")


def reference_now() -> datetime:
    s = get_settings()
    if s.reference_time:
        t = datetime.fromisoformat(s.reference_time)
        return t if t.tzinfo else t.replace(tzinfo=UTC)
    return datetime.now(UTC)


def source_trust() -> dict[str, float]:
    return {sid: src.trust for sid, src in get_news().sources.items()}


def profile_for(company_id: str, ctx: CompanyContext | None = None) -> BuiltProfile:
    return build_profile(company_id, ctx or CompanyContext(company_id=company_id), get_dataset())


def _facts_hash(ctx: CompanyContext | None) -> str:
    if not ctx:
        return "-"
    conf = sorted((f.id, f.statement) for f in ctx.facts if f.status == "confirmed")
    return content_hash(json.dumps(conf, ensure_ascii=False), ctx.description or "")


def _input_hash(ev: Event, ctx: CompanyContext | None) -> str:
    gw = get_gateway()
    pv = ",".join(load_prompt(p).version for p in PROMPTS)
    return content_hash(str(ev.version), _facts_hash(ctx), pv, gw.mode, str(gw.available("insight_draft")))


def candidates_for(
    company_id: str,
    ctx: CompanyContext | None = None,
    position: str | None = None,
    limit: int = 30,
    window_days: int = 120,
) -> tuple[BuiltProfile, list[Candidate]]:
    bp = profile_for(company_id, ctx)
    now = reference_now()
    events = get_news().list(since=now - timedelta(days=window_days))
    events = [e for e in events if (e.occurred_at or e.created_at) <= now + timedelta(hours=1)]
    return bp, rank_candidates(
        bp, events, position=position, now=now, limit=limit, source_trust=source_trust()
    )


def cached_insight(company_id: str, event_id: str) -> dict[str, Any] | None:
    rows = get_store().query(
        "SELECT input_hash, data FROM insights WHERE key = ?", (insight_key(company_id, event_id),)
    )
    if not rows:
        return None
    return {"inputHash": rows[0]["input_hash"], "data": json.loads(rows[0]["data"])}


def generate_insight(
    company_id: str,
    event_id: str,
    ctx: CompanyContext | None = None,
    force: bool = False,
    bp: BuiltProfile | None = None,
    candidate: Candidate | None = None,
    on_step: Any = None,
) -> InsightContent:
    ev = get_news().get(event_id)
    if ev is None:
        raise KeyError(f"event {event_id} not found")
    bp = bp or profile_for(company_id, ctx)
    ih = _input_hash(ev, ctx)
    prev = cached_insight(company_id, event_id)
    if prev and prev["inputHash"] == ih and not force:
        return InsightContent.model_validate(prev["data"])
    now = reference_now()
    if candidate is None:
        candidate = score_event(bp, ev, now=now, source_trust=source_trust())
    content = InsightAgent().run(bp, ev, candidate, position=None, now=now, on_step=on_step)
    if prev:
        old = prev["data"]
        if old.get("eventVersion") != ev.version:
            content.revision_note = "Учтено обновление события"
        elif old.get("title") != content.title or old.get("consequence") != content.consequence:
            content.revision_note = "Учтены новые сведения о компании"
    get_store().put(
        "insights",
        {
            "key": content.insight_key,
            "company_id": company_id,
            "event_id": event_id,
            "event_version": ev.version,
            "position": "",
            "input_hash": ih,
            "created_at": datetime.now(UTC).isoformat(),
            "data": content.dump(),
        },
    )
    return content


def build_feed(
    company_id: str,
    ctx: CompanyContext | None = None,
    position: str | None = None,
    limit: int | None = None,
    generate: bool = True,
) -> dict[str, Any]:
    s = get_settings()
    limit = limit or s.feed_max_insights
    bp, cands = candidates_for(company_id, ctx, position, limit=max(limit * 2, 20))
    insights: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []
    if generate:
        for c in cands[:limit]:
            try:
                insights.append(generate_insight(company_id, c.event_id, ctx, bp=bp, candidate=c).dump())
            except Exception as e:  # noqa: BLE001 — сбой одного вывода не ломает ленту
                log.exception("insight failed for %s/%s", company_id, c.event_id)
                errors.append({"eventId": c.event_id, "error": str(e)[:300]})
    profile = bp.profile
    ready = profile.origin == "dataset" or len(profile.facts) >= 2
    return {
        "companyId": company_id,
        "analysisStatus": "ready" if ready else "needs_context",
        "generatedAt": datetime.now(UTC).isoformat(),
        "insights": insights,
        "candidates": [c.dump() for c in cands],
        "errors": errors,
        "llm": get_gateway().usage_today()["spentRub"],
    }


# ------------------------------------------------------------------- jobs

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="radar-ml-job")
_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()


def submit_job(kind: str, fn: Any, *args: Any, **kw: Any) -> dict[str, Any]:
    jid = str(uuid.uuid4())
    job = {
        "id": jid,
        "kind": kind,
        "status": "QUEUED",
        "createdAt": datetime.now(UTC).isoformat(),
        "result": None,
        "error": None,
    }
    with _jobs_lock:
        _jobs[jid] = job

    def run() -> None:
        job["status"] = "PROCESSING"
        try:
            job["result"] = fn(*args, **kw)
            job["status"] = "DONE"
        except Exception as e:  # noqa: BLE001
            log.exception("job %s failed", jid)
            job["status"], job["error"] = "FAILED", str(e)[:500]
        job["finishedAt"] = datetime.now(UTC).isoformat()

    _executor.submit(run)
    return {k: v for k, v in job.items() if k != "result"}


def get_job(jid: str) -> dict[str, Any] | None:
    return _jobs.get(jid)
