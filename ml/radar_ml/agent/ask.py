"""Агент уточняющих вопросов по выводу. Шаги отдаются потоком по мере выполнения (SSE).

Порядок: разбор вопроса -> нужные инструменты (аналитика банка, профиль компании, связанные события)
-> ответ модели со ссылками -> проверка ссылок и чисел -> ответ. Вопрос не по теме или о другой
компании получает вежливый отказ без источников.
"""

from __future__ import annotations

import re
import time
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

from radar_ml.agent.context import AgentContext, Tracer
from radar_ml.agent.runner import ROLE_NAMES, _indicators_for
from radar_ml.agent.tools import run_tool
from radar_ml.domain import get_domain
from radar_ml.llm.gateway import LLMUnavailable, get_gateway
from radar_ml.llm.prompts import load_prompt
from radar_ml.news.service import get_news
from radar_ml.nlp.text import normalize, numbers_in, short_id, tokens, truncate
from radar_ml.profile.builder import BuiltProfile
from radar_ml.schemas import (
    AnswerResponse,
    CitationOut,
    Event,
    EventClaim,
    EventEntities,
    NewsSource,
    TraceStep,
)
from radar_ml.settings import get_settings
from radar_ml.store import get_store

OFF_TOPIC = re.compile(
    r"(анекдот|рецепт|погод[аы] (в|на)|гороскоп|стих|песн|фильм|сериал|футбол|игр[уа]|как дела|кто ты|"
    r"(игнорир|забудь)\w* .{0,30}(инструкц|правил)|system prompt|системн\w* промпт)",
    re.I,
)
OTHER_COMPANY = re.compile(r"\bU_[A-Z]*\d+\b", re.I)
BANK_WORDS = re.compile(
    r"(банк\w* (ожида|дума|счита|прогноз)|прогноз|ожида|ставк|курс|инфляц|оценк\w* банк)", re.I
)
CLIENT_WORDS = re.compile(
    r"(наш|нас\b|мы\b|компани|кредит|лизинг|поставщ|покупател|контрагент|групп|выручк|маржа)", re.I
)
NEWS_WORDS = re.compile(r"(когда|раньше|прошл|предыдущ|истори|источник|новост)", re.I)


def _event_from_insight(insight: dict[str, Any]) -> Event:
    ev_id = insight.get("eventId")
    if ev_id:
        ev = get_news().get(ev_id)
        if ev:
            return ev
    e = insight.get("event", {})
    now = datetime.now(UTC)
    sources = []
    for s in insight.get("sources", []):
        try:
            sources.append(NewsSource.model_validate(s))
        except Exception:  # noqa: BLE001
            continue
    occurred = e.get("occurredAt")
    return Event(
        id=ev_id or short_id("ev", e.get("title", "")),
        title=e.get("title", insight.get("title", "")),
        summary=insight.get("whyItMatters", ""),
        topic=insight.get("topic", "demand"),
        stage=e.get("stage", "occurred"),
        occurred_at=datetime.fromisoformat(occurred.replace("Z", "+00:00")) if occurred else None,
        place=e.get("place"),
        entities=EventEntities(),
        claims=[EventClaim(text=b) for b in insight.get("basis", [])],
        sources=sources,
        created_at=now,
        updated_at=now,
    )


def _sse(event: str, data: dict[str, Any]) -> str:
    import json

    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _citations(ctx: AgentContext, ref_ids: list[str]) -> list[CitationOut]:
    out: list[CitationOut] = []
    for rid in dict.fromkeys(ref_ids):
        r = ctx.refs.get(rid)
        if not r:
            continue
        if r.kind == "source":
            s = r.meta.get("source")
            out.append(
                CitationOut(
                    kind="news",
                    label=truncate(r.label, 160),
                    url=s.url if s and s.url.startswith("http") else None,
                )
            )
        elif r.kind == "event":
            srcs = r.meta.get("sources") or []
            url = srcs[0].get("url") if srcs else None
            out.append(
                CitationOut(
                    kind="news",
                    label=truncate(r.label, 160),
                    url=url if url and url.startswith("http") else None,
                )
            )
        elif r.kind == "bank_view":
            v = r.meta["view"]
            page = f", с. {v.material.page}" if v.material.page else ""
            out.append(
                CitationOut(
                    kind="bank", label=f"{v.material.title}, {v.material.published_at:%d.%m.%Y}{page}"
                )
            )
        elif r.kind == "bank":
            out.append(CitationOut(kind="bank", label=truncate(r.label, 160)))
        elif r.kind == "client":
            out.append(CitationOut(kind="client", label=truncate(r.text, 160)))
    return out[:6]


def _fallback_answer(ctx: AgentContext, insight: dict[str, Any], question: str) -> tuple[str, list[str]]:
    """Без модели: собираем ответ из позиции банка, вывода и признаков компании — без новых утверждений."""
    q = normalize(question)
    parts: list[str] = []
    refs: list[str] = []
    bv = ctx.refs_of("bank_view")
    if BANK_WORDS.search(q) and bv:
        v = bv[0].meta["view"]
        parts.append(f"По оценке банка: {v.summary.rstrip('.')}.")
        refs.append(bv[0].id)
    elif BANK_WORDS.search(q):
        frag = ctx.refs_of("bank")
        if frag:
            parts.append(f"В аналитике банка по теме: «{truncate(frag[0].text, 300)}».")
            refs.append(frag[0].id)
        else:
            parts.append("Прямой оценки банка по этому вопросу в материалах нет.")
    parts.append(f"Для компании вывод такой: {insight.get('consequence', '').rstrip('.')}.")
    client = ctx.refs_of("client")
    if client:
        refs.append(client[0].id)
    checks = insight.get("checks") or []
    if checks:
        parts.append(f"Что стоит проверить: {checks[0].rstrip('.')}.")
    parts.append(
        "Языковая модель сейчас недоступна, поэтому ответ собран из материалов вывода без новых оценок."
    )
    return " ".join(parts), refs


class AskAgent:
    def __init__(self) -> None:
        self.s = get_settings()

    def stream(
        self, bp: BuiltProfile, insight: dict[str, Any], question: str, position: str | None = None
    ) -> Iterator[str]:
        """SSE: step* затем answer или error. Шаги — настоящие, без внутренних промптов."""
        t_start = time.monotonic()
        question = question.strip()
        ev = _event_from_insight(insight)
        tracer = Tracer("ask", bp.profile.company_id, ev.id, get_store())
        tracer.add("plan", "question", input={"question": question, "position": position})
        steps: list[TraceStep] = []
        ctx = AgentContext(
            company=bp,
            event=ev,
            candidate=None,
            position=position,
            now=datetime.now(UTC),
            on_step=steps.append,
        )
        domain = get_domain()
        q = normalize(question)

        # Отказ: не по теме или о другой компании
        others = {m.upper() for m in OTHER_COMPANY.findall(question)} - {bp.profile.company_id.upper()}
        if OFF_TOPIC.search(q) or others:
            msg = (
                "Сервис отвечает только на вопросы по этому выводу и бизнесу вашей компании."
                if not others
                else "Данные других компаний недоступны: сервис отвечает только по вашей компании."
            )
            yield _sse(
                "step", TraceStep(kind="plan", title="Разбираю вопрос: он не относится к выводу").dump()
            )
            yield _sse("answer", AnswerResponse(question=question, answer=msg, citations=[]).dump())
            tracer.add("conclusion", "refused", output={"reason": "other_company" if others else "off_topic"})
            tracer.finish()
            return

        sent = 0

        def drain() -> Iterator[str]:
            nonlocal sent
            while sent < len(steps):
                yield _sse("step", steps[sent].dump())
                sent += 1

        # Аналитика банка нужна почти всегда: позиция банка — часть ценности ответа.
        need_client = bool(CLIENT_WORDS.search(q))
        need_news = bool(NEWS_WORDS.search(q))
        want = (
            ["аналитика банка"]
            + (["данные компании"] if need_client else [])
            + (["предыстория"] if need_news else [])
        )
        ctx.step("plan", f"Разбираю вопрос: нужны {', '.join(want)}")
        yield from drain()

        run_tool(ctx, tracer, "event_details", {})
        run_tool(ctx, tracer, "company_profile", {})
        yield from drain()
        topic_factors = [f for f, fac in domain.factors.items() if fac.topic == insight.get("topic")]
        q_factors = (
            list(domain.find_factors(q))
            or [f for f in ev.entities.factors[:2] if f in domain.factors]
            or topic_factors[:1]
        )
        inds = _indicators_for(q_factors[:2])
        if inds:
            run_tool(ctx, tracer, "bank_position", {"indicators": inds})
            yield from drain()
        run_tool(
            ctx, tracer, "bank_search", {"query": truncate(f"{question} {insight.get('title', '')}", 190)}
        )
        yield from drain()
        if need_client and bp.profile.counterparties:
            run_tool(ctx, tracer, "counterparties", {})
            yield from drain()
        if need_client and bp.profile.facts:
            run_tool(ctx, tracer, "company_facts", {})
            yield from drain()
        if need_news:
            run_tool(ctx, tracer, "news_search", {"query": truncate(question, 190)})
            yield from drain()

        gw = get_gateway()
        answer, refs, generated = "", [], "rules"
        if gw.available("ask_answer") and time.monotonic() - t_start < self.s.ask_timeout_s - 20:
            prompt = load_prompt("ask_answer")
            grounding = numbers_in(
                ctx.grounding_text() + " " + " ".join(str(v) for v in insight.values() if isinstance(v, str))
            )

            def validate(d: dict[str, Any]) -> list[str]:
                probs = [f"ссылки {r} нет в контексте" for r in d.get("citations", []) if r not in ctx.refs]
                extra = {
                    n
                    for n in numbers_in(d.get("answer", "")) - grounding
                    if not (n.isdigit() and 2020 <= int(n) <= 2035) and n not in {"1", "2", "3", "4"}
                }
                if extra:
                    probs.append(f"в ответе числа {sorted(extra)} отсутствуют в контексте")
                return probs

            context = {
                "insight": {
                    k: insight.get(k)
                    for k in (
                        "title",
                        "kind",
                        "whyItMatters",
                        "consequence",
                        "basis",
                        "unknowns",
                        "checks",
                        "impactPath",
                    )
                },
                "event": ctx.notes.get("event_details"),
                "company": ctx.notes.get("company_profile", {}).get("signals"),
                "facts": ctx.notes.get("company_facts", {}).get("facts"),
                "counterparties": ctx.notes.get("counterparties"),
                "bankView": ctx.notes.get("bank_position")
                if ctx.notes.get("bank_position", {}).get("ref")
                else None,
                "bankFragments": ctx.notes.get("bank_search", {}).get("fragments", []),
                "relatedEvents": ctx.notes.get("news_search", {}).get("events", []),
            }
            try:
                res = gw.complete_json(
                    "ask_answer",
                    prompt.render(
                        context=context,
                        question=question,
                        role=ROLE_NAMES.get(position or "other", "руководитель"),
                        role_focus=domain.role_focus.get(position or "other", ""),
                    ),
                    prompt_version=prompt.version,
                    validate=validate,
                    use_cache=False,
                )
                tracer.add(
                    "llm",
                    "ask_answer",
                    output=res.data,
                    ms=res.ms,
                    model=res.model,
                    prompt_version=res.prompt_version,
                    tokens_in=res.tokens_in,
                    tokens_out=res.tokens_out,
                    cost_rub=res.cost_rub,
                )
                data = res.data or {}
                if data.get("offTopic"):
                    answer, refs = (
                        str(data.get("answer") or "Сервис отвечает только на вопросы по этому выводу."),
                        [],
                    )
                else:
                    answer, refs, generated = (
                        str(data.get("answer", "")).strip(),
                        list(data.get("citations", [])),
                        "agent",
                    )
            except LLMUnavailable as e:
                tracer.add("error", "ask_answer", output={"error": str(e)[:300]})
        if not answer:
            answer, refs = _fallback_answer(ctx, insight, question)
        ctx.step(
            "check",
            "Сверяю ответ с источниками",
            None if generated == "agent" else "ответ собран из материалов вывода",
        )
        yield from drain()
        resp = AnswerResponse(question=question, answer=answer, citations=_citations(ctx, refs))
        tracer.add(
            "conclusion", "answer", output={"generatedBy": generated, "citations": len(resp.citations)}
        )
        tracer.finish("ok" if generated == "agent" else "degraded")
        yield _sse("answer", resp.dump())


def overlap(a: str, b: str) -> float:
    ta, tb = set(tokens(a)), set(tokens(b))
    return len(ta & tb) / len(ta) if ta else 0.0
