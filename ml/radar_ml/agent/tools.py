"""Инструменты агента. Все только читают данные и работают в границах одной компании.

Безопасность:
- реестр закрытый: агент вызывает только зарегистрированные инструменты, параметры проверяются схемой;
- company_id инструменты берут из контекста, а не из ответа модели — модель не может запросить чужую компанию;
- инструменты ничего не меняют: «действие» в выводе — только рекомендация пользователю;
- каждый вызов пишется в журнал tool_calls и в трассу.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from radar_ml.agent.context import AgentContext, Tracer
from radar_ml.bank.service import INDICATORS, get_bank
from radar_ml.domain import get_domain
from radar_ml.news.service import get_news
from radar_ml.nlp.text import truncate
from radar_ml.profile.builder import FACT_CATEGORY_LABELS, fmt_money
from radar_ml.store import get_store


class ToolError(Exception):
    pass


@dataclass
class Tool:
    name: str
    description: str
    args: type[BaseModel]
    fn: Callable[[AgentContext, Any], dict[str, Any]]
    user_title: str


class _NoArgs(BaseModel):
    pass


class _BankSearchArgs(BaseModel):
    query: str = Field(min_length=2, max_length=200)


class _BankPositionArgs(BaseModel):
    indicators: list[str] = Field(min_length=1, max_length=4)


class _NewsSearchArgs(BaseModel):
    query: str = Field(min_length=2, max_length=200)


class _FactsArgs(BaseModel):
    category: str | None = None


class _CounterpartyArgs(BaseModel):
    direction: str | None = Field(default=None, pattern="^(incoming|outgoing)$")


# ------------------------------------------------------------------------------------ tools


def t_event_details(ctx: AgentContext, _: _NoArgs) -> dict[str, Any]:
    ev = ctx.event
    out_sources = []
    for s in ev.sources[:5]:
        r = ctx.add_ref("S", "source", f"{s.publisher}: {s.title}", s.title, source=s)
        out_sources.append(
            {
                "ref": r.id,
                "publisher": s.publisher,
                "title": s.title,
                "publishedAt": s.published_at.isoformat(),
            }
        )
    claims = [{"text": c.text, "type": c.type} for c in ev.claims[:6]]
    return {
        "title": ev.title,
        "summary": ev.summary,
        "stage": ev.stage,
        "occurredAt": ev.occurred_at.isoformat() if ev.occurred_at else None,
        "place": ev.place,
        "factors": [get_domain().factors[f].label for f in ev.entities.factors if f in get_domain().factors],
        "directions": ev.directions,
        "numbers": [{"value": n.value, "what": truncate(n.what, 120)} for n in ev.entities.numbers[:6]],
        "claims": claims,
        "sources": out_sources,
        "official": ev.official,
    }


def _signal_ref(ctx: AgentContext, key: str) -> dict[str, Any] | None:
    sig = ctx.company.signals.items.get(key)
    if not sig:
        return None
    r = ctx.add_ref("C", "client", sig.label, f"{sig.label}: {sig.value}", signal=sig, key=key)
    return {"ref": r.id, "label": sig.label, "value": sig.value, "origin": sig.origin}


def t_company_profile(ctx: AgentContext, _: _NoArgs) -> dict[str, Any]:
    p = ctx.company.profile
    keys: list[str] = []
    # Сначала признаки, через которые событие связано с компанией, затем общие.
    if ctx.candidate:
        for ln in ctx.candidate.links:
            if ln.factor:
                keys += ctx.company.factor_signals.get(ln.factor, [])
            if ln.fact_id:
                keys.append(f"fact:{ln.fact_id}")
            if ln.kind == "counterparty":
                keys += [k for k in ctx.company.signals.items if k.startswith("cp:")]
            if ln.kind == "region":
                keys.append("region")
    keys += ["okved", "products", "foreign_trade", "position", "revenue", "region", "group"]
    seen: list[dict[str, Any]] = []
    for k in dict.fromkeys(keys):
        s = _signal_ref(ctx, k)
        if s:
            seen.append(s)
        if len(seen) >= 9:
            break
    factors = [
        {"factor": f.label, "weight": f.weight, "why": [f"{o.label}: {o.value}" for o in f.origins[:2]]}
        for f in p.factors[:8]
    ]
    return {
        "companyId": p.company_id,
        "sector": p.sector,
        "scale": p.scale,
        "revenue": fmt_money(p.revenue) if p.revenue else None,
        "region": p.region,
        "relationship": p.relationship,
        "signals": seen,
        "sensitivityFactors": factors,
        "matchReasons": ctx.candidate.reasons if ctx.candidate else [],
        "dataQuality": p.data_quality,
        "description": truncate(p.description or "", 600) or None,
    }


def t_company_facts(ctx: AgentContext, args: _FactsArgs) -> dict[str, Any]:
    facts = [
        f
        for f in ctx.company.profile.facts
        if f.status == "confirmed" and (not args.category or f.category == args.category)
    ]
    out = []
    for f in facts[:8]:
        s = _signal_ref(ctx, f"fact:{f.id}")
        if s:
            out.append({**s, "category": FACT_CATEGORY_LABELS.get(f.category, f.category)})
    return {"facts": out, "note": None if out else "подтверждённых сведений от пользователей нет"}


def t_counterparties(ctx: AgentContext, args: _CounterpartyArgs) -> dict[str, Any]:
    p = ctx.company.profile
    out = []
    for cp in p.counterparties:
        if args.direction and cp.direction != args.direction:
            continue
        key = f"cp:{cp.id}"
        s = _signal_ref(ctx, key)
        out.append(
            {
                "id": cp.id,
                "direction": cp.direction,
                "sector": cp.sector,
                "sharePct": cp.share_pct,
                "amount": fmt_money(cp.amount),
                "ref": s["ref"] if s else None,
            }
        )
    return {
        "counterparties": out,
        "exposureBySector": p.counterparty_sectors,
        "note": "контрагенты из обезличенных платежей; названий компаний нет",
    }


def t_bank_search(ctx: AgentContext, args: _BankSearchArgs) -> dict[str, Any]:
    hits = get_bank().search(args.query, k=4, now=ctx.now)
    out = []
    for h in hits:
        r = ctx.add_ref("B", "bank", f"{h['title']}, с. {h['page']}", truncate(h["text"], 900), hit=h)
        out.append(
            {
                "ref": r.id,
                "material": h["title"],
                "publishedAt": h["publishedAt"][:10],
                "page": h["page"],
                "outdated": h["outdated"],
                "text": truncate(h["text"], 700),
            }
        )
    return {"fragments": out, "note": None if out else "в аналитике банка ничего не найдено"}


def t_bank_position(ctx: AgentContext, args: _BankPositionArgs) -> dict[str, Any]:
    inds = [i for i in args.indicators if i in INDICATORS]
    if not inds:
        raise ToolError("неизвестные показатели")
    view, considered = get_bank().bank_view(inds, query=ctx.event.title, now=ctx.now)
    if not view:
        return {"bankView": None, "considered": considered, "note": "позиции банка по этим показателям нет"}
    if ctx.bank_view is None or (ctx.bank_view.material.outdated and not view.material.outdated):
        ctx.bank_view = view
    r = ctx.add_ref("BV", "bank_view", view.material.title, view.summary, view=view)
    sup = None
    if view.supersedes:
        sup = {
            "summary": view.supersedes.summary,
            "material": view.supersedes.material.title,
            "publishedAt": view.supersedes.material.published_at.date().isoformat(),
        }
    return {
        "ref": r.id,
        "summary": view.summary,
        "material": view.material.title,
        "publishedAt": view.material.published_at.date().isoformat(),
        "page": view.material.page,
        "outdated": view.material.outdated,
        "supersedes": sup,
        "considered": len(considered),
    }


def t_news_search(ctx: AgentContext, args: _NewsSearchArgs) -> dict[str, Any]:
    hits = get_news().search(args.query, k=4, exclude=ctx.event.id, before=ctx.event.occurred_at or ctx.now)
    out = []
    for ev, score in hits:
        r = ctx.add_ref(
            "E",
            "event",
            ev.title,
            f"{ev.title}. {truncate(ev.summary, 300)}",
            event_id=ev.id,
            sources=[s.model_dump() for s in ev.sources[:2]],
        )
        out.append(
            {
                "ref": r.id,
                "title": ev.title,
                "date": (ev.occurred_at or ev.created_at).date().isoformat(),
                "stage": ev.stage,
                "summary": truncate(ev.summary, 300),
                "score": round(score, 2),
            }
        )
    return {"events": out}


TOOLS: dict[str, Tool] = {
    t.name: t
    for t in [
        Tool(
            "event_details",
            "Факты события, числа, утверждения и источники (S*)",
            _NoArgs,
            t_event_details,
            "Событие и источники",
        ),
        Tool(
            "company_profile",
            "Признаки компании из данных банка и сведений пользователей (C*), факторы чувствительности",
            _NoArgs,
            t_company_profile,
            "Профиль клиента",
        ),
        Tool(
            "company_facts",
            "Подтверждённые сведения пользователей о компании (C*)",
            _FactsArgs,
            t_company_facts,
            "Сведения о компании",
        ),
        Tool(
            "counterparties",
            "Ключевые контрагенты по платежам и их отрасли",
            _CounterpartyArgs,
            t_counterparties,
            "Контрагенты",
        ),
        Tool(
            "bank_search",
            "Поиск по аналитическим материалам Альфа-Банка (B*)",
            _BankSearchArgs,
            t_bank_search,
            "Аналитика банка",
        ),
        Tool(
            "bank_position",
            "Позиция банка по показателям (BV): прогноз из свежего материала и пересмотр",
            _BankPositionArgs,
            t_bank_position,
            "Позиция банка",
        ),
        Tool(
            "news_search",
            "Связанные события из ленты (E*) — предыстория и контекст",
            _NewsSearchArgs,
            t_news_search,
            "Связанные события",
        ),
    ]
}


def tool_catalog() -> list[dict[str, Any]]:
    return [
        {
            "name": t.name,
            "description": t.description,
            "args": t.args.model_json_schema().get("properties", {}),
        }
        for t in TOOLS.values()
    ]


def _user_detail(name: str, out: dict[str, Any]) -> str | None:
    if name == "company_profile":
        vals = [s["value"] for s in out.get("signals", [])[:3]]
        return truncate("; ".join(vals), 140) if vals else None
    if name == "bank_search":
        n = len(out.get("fragments", []))
        return f"найдено фрагментов: {n}" if n else "ничего не найдено"
    if name == "bank_position":
        if out.get("bankView", 1) is None:
            return "позиции банка по теме нет"
        return truncate(f"{out.get('material')}, {out.get('publishedAt')}", 140)
    if name == "news_search":
        n = len(out.get("events", []))
        return f"связанных событий: {n}" if n else "связанных событий нет"
    if name == "counterparties":
        return f"контрагентов: {len(out.get('counterparties', []))}"
    if name == "company_facts":
        return f"подтверждённых сведений: {len(out.get('facts', []))}"
    if name == "event_details":
        return f"источников: {len(out.get('sources', []))}"
    return None


def run_tool(
    ctx: AgentContext, tracer: Tracer, name: str, raw_args: dict[str, Any] | None = None
) -> dict[str, Any]:
    tool = TOOLS.get(name)
    if tool is None:
        tracer.add("error", f"tool:{name}", {"args": raw_args}, {"error": "инструмент не разрешён"})
        raise ToolError(f"инструмент {name} не разрешён")
    t0 = time.monotonic()
    ok = True
    try:
        args = tool.args.model_validate(raw_args or {})
        out = tool.fn(ctx, args)
    except (ValidationError, ToolError) as e:
        ok = False
        out = {"error": str(e)[:300]}
    ms = int((time.monotonic() - t0) * 1000)
    tracer.add("tool", name, {"args": raw_args or {}}, out, ms=ms)
    get_store().log_tool_call(tracer.record.id, ctx.company.profile.company_id, name, raw_args or {}, ok, ms)
    ctx.tools_called.append(name)
    ctx.notes[name] = out
    if ok:
        ctx.step("tool", tool.user_title, _user_detail(name, out))
    return out
