"""Агент персонализированного вывода: план -> инструменты -> черновик -> самопроверка -> адаптация -> вывод.

Цикл:
1. План. Модель выбирает инструменты под событие; план проверяется: только разрешённые инструменты,
   параметры по схеме, обязательные шаги (событие, профиль, позиция банка) добавляются, если модель их забыла.
2. Инструменты. Результаты складываются в общий контекст со ссылками S*/C*/B*/BV/E*.
3. Черновик. Модель для рассуждений (GLM) пишет вывод по схеме со ссылками на контекст.
4. Самопроверка. Детерминированные проверки: схема, цепочка, ссылки, числа только из источников,
   позиция банка влияет на вывод, не пересказ, стадия события. Затем LLM-критик на противоречия.
5. Адаптация. Если не хватает данных — агент дозапрашивает (другой поиск по аналитике, контрагенты,
   сведения компании) и переписывает проблемные части. Число итераций ограничено.
6. Если модель недоступна или черновик так и не прошёл проверку — вывод по правилам с пометкой.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from radar_ml.agent.composer import compose
from radar_ml.agent.context import AgentContext, Tracer
from radar_ml.agent.draft import InsightDraft, Issue, blocking, check_draft, normalize_title
from radar_ml.agent.tools import TOOLS, run_tool, tool_catalog
from radar_ml.bank.service import INDICATORS
from radar_ml.domain import get_domain
from radar_ml.llm.gateway import LLMUnavailable, get_gateway
from radar_ml.llm.prompts import load_prompt
from radar_ml.nlp.text import content_hash, truncate
from radar_ml.profile.builder import BuiltProfile
from radar_ml.schemas import (
    BankOffer,
    Candidate,
    Event,
    ImpactStep,
    InsightContent,
    InsightEvent,
    NewsSource,
    TraceStep,
)
from radar_ml.settings import get_settings
from radar_ml.store import get_store

log = logging.getLogger(__name__)

ROLE_NAMES = {
    "owner": "собственник",
    "ceo": "генеральный директор",
    "cfo": "финансовый директор",
    "accountant": "главный бухгалтер",
    "treasurer": "руководитель казначейства",
    "other": "руководитель",
}


def insight_key(company_id: str, event_id: str) -> str:
    return content_hash("insight", company_id, event_id)


def _indicators_for(factors: list[str]) -> list[str]:
    domain = get_domain()
    out: list[str] = []
    for f in factors:
        fac = domain.factors.get(f)
        if fac:
            out += [i for i in fac.indicators if i in INDICATORS]
    return list(dict.fromkeys(out))[:4]


def rule_plan(ctx: AgentContext) -> list[dict[str, Any]]:
    """План по правилам: всегда событие и профиль; позиция банка и поиск по аналитике по факторам связи."""
    domain = get_domain()
    links = ctx.candidate.links if ctx.candidate else []
    factors = [ln.factor for ln in links if ln.factor] or ctx.event.entities.factors[:2]
    steps: list[dict[str, Any]] = [
        {"tool": "event_details", "args": {}, "why": "факты события и источники"},
        {
            "tool": "company_profile",
            "args": {},
            "why": "признаки компании, через которые событие её задевает",
        },
    ]
    inds = _indicators_for(factors[:2])
    if inds:
        steps.append({"tool": "bank_position", "args": {"indicators": inds}, "why": "прогноз банка по теме"})
    if factors:
        steps.append(
            {
                "tool": "bank_search",
                "args": {"query": domain.factors[factors[0]].bank_query},
                "why": "аналитика банка",
            }
        )
    if any(ln.kind == "counterparty" for ln in links) or any(
        k.startswith("cp:") for k in ctx.company.signals.items
    ):
        steps.append({"tool": "counterparties", "args": {}, "why": "ключевые поставщики и покупатели"})
    if ctx.company.profile.facts:
        steps.append({"tool": "company_facts", "args": {}, "why": "подтверждённые сведения компании"})
    if factors:
        steps.append(
            {
                "tool": "news_search",
                "args": {"query": f"{domain.factors[factors[0]].label} {ctx.event.title}"},
                "why": "предыстория",
            }
        )
    return steps


def _plan_goal(ctx: AgentContext) -> str:
    domain = get_domain()
    links = ctx.candidate.links if ctx.candidate else []
    f = next((ln.factor for ln in links if ln.factor), None)
    if f:
        return f"Событие касается фактора «{domain.factors[f].label.lower()}» — нужны признаки компании и оценка банка"
    return "Нужны факты события, признаки компании и аналитика банка"


def llm_plan(ctx: AgentContext, tracer: Tracer) -> tuple[str, list[dict[str, Any]]] | None:
    gw = get_gateway()
    if not gw.available("insight_plan"):
        return None
    prompt = load_prompt("insight_plan")
    domain = get_domain()
    ev = ctx.event

    def validate(data: dict[str, Any]) -> list[str]:
        probs = []
        for st in data.get("steps", []):
            t = TOOLS.get(st.get("tool", ""))
            if not t:
                probs.append(f"инструмента {st.get('tool')} нет")
                continue
            try:
                t.args.model_validate(st.get("args") or {})
            except Exception as e:  # noqa: BLE001
                probs.append(f"{st.get('tool')}: неверные параметры {str(e)[:120]}")
        return probs

    try:
        res = gw.complete_json(
            "insight_plan",
            prompt.render(
                tools=tool_catalog(),
                indicators={k: v[0] for k, v in INDICATORS.items()},
                event={
                    "title": ev.title,
                    "stage": ev.stage,
                    "date": (ev.occurred_at or ev.created_at).date().isoformat(),
                    "summary": truncate(ev.summary, 500),
                    "factors": [domain.factors[f].label for f in ev.entities.factors if f in domain.factors],
                },
                reasons=ctx.candidate.reasons if ctx.candidate else [],
                sector=ctx.company.profile.sector or "неизвестна",
                facts_count=len(ctx.company.profile.facts),
                role=ROLE_NAMES.get(ctx.position or "other", "руководитель"),
            ),
            prompt_version=prompt.version,
            validate=validate,
        )
    except LLMUnavailable as e:
        tracer.add("error", "insight_plan", output={"error": str(e)[:300]})
        return None
    tracer.add(
        "llm",
        "insight_plan",
        output=res.data,
        ms=res.ms,
        model=res.model,
        prompt_version=res.prompt_version,
        tokens_in=res.tokens_in,
        tokens_out=res.tokens_out,
        cost_rub=res.cost_rub,
    )
    return str(res.data.get("goal") or _plan_goal(ctx)), list(res.data.get("steps", []))


def merge_plans(llm_steps: list[dict[str, Any]], base: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Обязательные шаги правил + шаги модели без повторов. Порядок: событие, профиль, затем как решила модель."""
    required = {"event_details", "company_profile", "bank_position"}
    out = [s for s in base if s["tool"] in ("event_details", "company_profile")]
    seen = {(s["tool"], str(s.get("args"))) for s in out}
    for s in llm_steps:
        k = (s.get("tool"), str(s.get("args") or {}))
        if (
            s.get("tool") in TOOLS
            and k not in seen
            and s.get("tool") not in ("event_details", "company_profile")
        ):
            out.append({"tool": s["tool"], "args": s.get("args") or {}, "why": s.get("why", "")})
            seen.add(k)
    have = {s["tool"] for s in out}
    for s in base:
        if s["tool"] in required and s["tool"] not in have:
            out.append(s)
    return out


def _llm_context(ctx: AgentContext) -> dict[str, Any]:
    n = ctx.notes
    prof = n.get("company_profile", {})
    return {
        "event": n.get("event_details"),
        "company": {
            "label": _company_label(ctx),
            "sector": prof.get("sector"),
            "scale": prof.get("scale"),
            "signals": prof.get("signals", []) + n.get("company_facts", {}).get("facts", []),
            "sensitivityFactors": prof.get("sensitivityFactors"),
            "whySelected": prof.get("matchReasons"),
            "dataQuality": prof.get("dataQuality"),
            "description": prof.get("description"),
        },
        "counterparties": n.get("counterparties"),
        "bankView": n.get("bank_position") if n.get("bank_position", {}).get("ref") else None,
        "bankFragments": n.get("bank_search", {}).get("fragments", []),
        "relatedEvents": n.get("news_search", {}).get("events", []),
        "readerRole": ROLE_NAMES.get(ctx.position or "other"),
    }


def _company_label(ctx: AgentContext) -> str:
    p = ctx.company.profile
    return f"Клиент {p.company_id}" if p.origin == "dataset" else (p.name or "Компания")


def _llm_draft(
    ctx: AgentContext, tracer: Tracer, previous: InsightDraft | None = None, issues: list[str] | None = None
) -> InsightDraft:
    gw = get_gateway()
    task = "insight_revise" if previous else "insight_draft"
    prompt = load_prompt("insight_draft")
    domain = get_domain()
    msgs = prompt.render(
        context=_llm_context(ctx),
        kind_prior=ctx.candidate.kind_prior if ctx.candidate else None,
        company_label=_company_label(ctx),
        role=ROLE_NAMES.get(ctx.position or "other", "руководитель"),
        role_focus=domain.role_focus.get(ctx.position or "other", ""),
        previous=previous.dump() if previous else None,
        issues=issues or [],
    )
    res = gw.complete_json(task, msgs, schema=InsightDraft, prompt_version=prompt.version)
    tracer.add(
        "llm",
        task,
        output=res.data,
        ms=res.ms,
        model=res.model,
        prompt_version=res.prompt_version,
        tokens_in=res.tokens_in,
        tokens_out=res.tokens_out,
        cost_rub=res.cost_rub,
    )
    return InsightDraft.model_validate(res.data)


def _critic(ctx: AgentContext, tracer: Tracer, d: InsightDraft) -> list[str]:
    gw = get_gateway()
    if not gw.available("insight_critic"):
        return []
    prompt = load_prompt("insight_critic")
    try:
        res = gw.complete_json(
            "insight_critic",
            prompt.render(context=_llm_context(ctx), draft=d.dump()),
            prompt_version=prompt.version,
        )
    except LLMUnavailable:
        return []
    tracer.add(
        "llm",
        "insight_critic",
        output=res.data,
        ms=res.ms,
        model=res.model,
        prompt_version=res.prompt_version,
        tokens_in=res.tokens_in,
        tokens_out=res.tokens_out,
        cost_rub=res.cost_rub,
    )
    data = res.data if isinstance(res.data, dict) else {}
    if data.get("ok", True):
        return []
    return [str(i) for i in data.get("issues", [])][:4]


def _adapt(ctx: AgentContext, tracer: Tracer, issues: list[Issue]) -> list[str]:
    """Дозапрос данных перед переписыванием: другой поиск по аналитике, контрагенты, сведения компании."""
    done = []
    domain = get_domain()
    actions = {i.action for i in issues if i.action}
    if "bank_search" in actions:
        factors = [
            ln.factor for ln in (ctx.candidate.links if ctx.candidate else []) if ln.factor
        ] or ctx.event.entities.factors
        for f in factors[:2]:
            q = f"{domain.factors[f].label} прогноз банка {ctx.event.title}"
            if ("bank_search", q) in ctx.notes.get("_queries", set()):
                continue
            ctx.notes.setdefault("_queries", set()).add(("bank_search", q))
            run_tool(ctx, tracer, "bank_search", {"query": truncate(q, 190)})
            inds = _indicators_for([f])
            if inds:
                run_tool(ctx, tracer, "bank_position", {"indicators": inds})
            done.append("повторный поиск в аналитике банка")
            break
    if "counterparties" in actions and "counterparties" not in ctx.tools_called:
        run_tool(ctx, tracer, "counterparties", {})
        done.append("контрагенты")
    if "company_facts" in actions and "company_facts" not in ctx.tools_called and ctx.company.profile.facts:
        run_tool(ctx, tracer, "company_facts", {})
        done.append("сведения компании")
    return done


def _auto_fix(d: InsightDraft, ctx: AgentContext) -> InsightDraft:
    d = d.model_copy(deep=True)
    d.title = normalize_title(d.title)
    client = [r.id for r in ctx.refs_of("client")]
    d.signals = [s for s in dict.fromkeys(d.signals) if s in client][:5] or client[:2]
    path = list(d.impact_path)
    if not path or path[-1].role != "company":
        from radar_ml.agent.draft import DraftStep

        path.append(DraftStep(label=_company_label(ctx), role="company"))
    if len(path) > 6:
        path = path[:5] + path[-1:]
    if len(path) < 2:
        from radar_ml.agent.draft import DraftStep

        path.insert(0, DraftStep(label=truncate(ctx.event.title, 60), role="event"))
    d.impact_path = path
    d.suggested_questions = d.suggested_questions[:4]
    d.unknowns = d.unknowns[:4]
    d.checks = d.checks[:4]
    return d


def choose_offer(ctx: AgentContext, d: InsightDraft) -> BankOffer | None:
    domain = get_domain()
    prof = ctx.company.profile
    factors = [ln.factor for ln in (ctx.candidate.links if ctx.candidate else []) if ln.factor][:3]
    products = set(prof.products)
    for o in domain.offers:
        w = o["when"]
        if w.get("kind") and w["kind"] != d.kind:
            continue
        if w.get("factors") and not set(w["factors"]) & set(factors):
            continue
        if w.get("requires_products_any") and not products & set(w["requires_products_any"]):
            continue
        if w.get("excludes_products") and products & set(w["excludes_products"]):
            continue
        if w.get("requires_foreign_trade") and not prof.foreign_trade_countries:
            continue
        return BankOffer(title=o["title"], description=o["description"], url=o["url"])
    return None


def _source_list(ev: Event) -> list[NewsSource]:
    out = []
    for s in ev.sources[:5]:
        url = s.url or f"urn:radar:text:{s.id}"
        out.append(s.model_copy(update={"url": url}))
    return out


def finalize(ctx: AgentContext, d: InsightDraft, generated_by: str, tracer: Tracer) -> InsightContent:
    ev = ctx.event
    cand = ctx.candidate
    signals = []
    for r in d.signals:
        sig = ctx.client_signal(r)
        if sig is not None:
            signals.append(sig)
    if not signals:
        prof_sig = list(ctx.company.signals.items.values())[:1]
        signals = prof_sig
    use_bank = d.use_bank_view and ctx.bank_view is not None
    kind_word = "Риск" if d.kind == "risk" else "Возможность"
    ctx.step("conclusion", truncate(f"{kind_word}: {d.consequence}", 160))
    basis = [b.text for b in d.basis][:5]
    tracer.record.features_used = [ctx.refs[r].label for r in d.signals if r in ctx.refs]
    tracer.record.sources_used = [s.url or s.id for s in ev.sources[:5]] + (
        [f"{ctx.bank_view.material.id}#p{ctx.bank_view.material.page}"] if use_bank and ctx.bank_view else []
    )
    return InsightContent(
        insight_key=insight_key(ctx.company.profile.company_id, ev.id),
        event_id=ev.id,
        event_version=ev.version,
        company_id=ctx.company.profile.company_id,
        kind=d.kind,
        urgency=cand.urgency if cand else "important",
        relevance=cand.relevance if cand else "direct",
        topic=cand.topic if cand else ev.topic,
        title=normalize_title(d.title),
        why_it_matters=d.why_it_matters.strip(),
        event=InsightEvent(
            title=truncate(ev.title, 200), stage=ev.stage, occurred_at=ev.occurred_at, place=ev.place
        ),
        impact_path=[ImpactStep(label=s.label, role=s.role) for s in d.impact_path],
        consequence=d.consequence.strip(),
        basis=basis,
        unknowns=d.unknowns,
        checks=d.checks,
        sources=_source_list(ev),
        bank_view=ctx.bank_view if use_bank else None,
        signals=signals[:5],
        trace=list(ctx.user_steps),
        offer=choose_offer(ctx, d),
        suggested_questions=d.suggested_questions,
        score=cand.score if cand else 0.0,
        trace_id=tracer.record.id,
        generated_by=generated_by,  # type: ignore[arg-type]
    )


class InsightAgent:
    def __init__(self) -> None:
        self.s = get_settings()

    def run(
        self,
        bp: BuiltProfile,
        event: Event,
        candidate: Candidate | None,
        position: str | None = None,
        now: datetime | None = None,
        on_step: Any = None,
    ) -> InsightContent:
        now = now or datetime.now(UTC)
        tracer = Tracer("insight", bp.profile.company_id, event.id, get_store())
        ctx = AgentContext(
            company=bp, event=event, candidate=candidate, position=position, now=now, on_step=on_step
        )
        tracer.add("plan", "candidate", output=candidate.dump() if candidate else {})
        gw = get_gateway()
        status = "ok"

        # 1. План
        base = rule_plan(ctx)
        planned = llm_plan(ctx, tracer)
        if planned:
            goal, steps = planned
            plan = merge_plans(steps, base)
        else:
            goal, plan = _plan_goal(ctx), base
        tracer.add(
            "plan", "plan", output={"goal": goal, "steps": plan, "source": "llm" if planned else "rules"}
        )
        ctx.step("plan", truncate(goal, 160))

        # 2. Инструменты
        for st in plan[: self.s.agent_max_tool_calls]:
            run_tool(ctx, tracer, st["tool"], st.get("args") or {})

        # 3. Черновик
        generated_by = "agent"
        draft: InsightDraft
        use_llm = gw.available("insight_draft")
        if use_llm:
            try:
                draft = _llm_draft(ctx, tracer)
            except LLMUnavailable as e:
                tracer.add("error", "insight_draft", output={"error": str(e)[:300]})
                draft, generated_by, use_llm, status = compose(ctx), "rules", False, "degraded"
        else:
            draft, generated_by, status = compose(ctx), "rules", "degraded"

        # 4–5. Самопроверка и адаптация
        critic_done = False
        for attempt in range(self.s.agent_max_revisions + 1):
            issues = check_draft(draft, ctx)
            block = blocking(issues)
            tracer.add("check", f"check#{attempt + 1}", output={"issues": [i.__dict__ for i in issues]})
            tracer.record.checks.append(
                {
                    "attempt": attempt + 1,
                    "blocking": [i.code for i in block],
                    "warnings": [i.code for i in issues if i.severity == "warn"],
                }
            )
            if (
                not block
                and use_llm
                and not critic_done
                and tracer.tokens < self.s.agent_max_tokens_per_insight
            ):
                critic_done = True
                crit = _critic(ctx, tracer, draft)
                if crit:
                    block = [Issue("critic", c) for c in crit]
            if not block:
                ctx.step(
                    "check",
                    "Проверил: ссылки на источники, числа, позиция банка и связь с компанией",
                    f"предупреждений: {len(issues)}" if issues else None,
                )
                break
            if attempt == self.s.agent_max_revisions:
                break
            adapted = _adapt(ctx, tracer, block)
            if adapted:
                tracer.add("revise", "adapt", output={"actions": adapted, "issues": [i.code for i in block]})
            if not use_llm and not adapted:
                break  # правила без новых данных дадут тот же черновик
            ctx.step(
                "check",
                truncate(f"Нашёл проблемы: {'; '.join(i.message for i in block[:2])}", 160),
                f"дозапросил: {', '.join(adapted)}" if adapted else "переписываю вывод",
            )
            if use_llm and tracer.tokens < self.s.agent_max_tokens_per_insight:
                try:
                    draft = _llm_draft(ctx, tracer, previous=draft, issues=[i.message for i in block])
                    continue
                except LLMUnavailable as e:
                    tracer.add("error", "insight_revise", output={"error": str(e)[:300]})
            draft, generated_by, use_llm, status = compose(ctx), "rules", False, "degraded"

        final_issues = blocking(check_draft(_auto_fix(draft, ctx), ctx))
        if final_issues and generated_by == "agent":
            tracer.add("check", "fallback", output={"issues": [i.__dict__ for i in final_issues]})
            ctx.step("check", "Черновик модели не прошёл проверку — собран вывод по правилам")
            draft, generated_by, status = compose(ctx), "rules", "degraded"
        draft = _auto_fix(draft, ctx)
        content = finalize(ctx, draft, generated_by, tracer)
        tracer.add(
            "conclusion",
            "insight",
            output={"kind": content.kind, "title": content.title, "generatedBy": generated_by},
        )
        tracer.finish(status)
        return content


def user_trace(steps: list[TraceStep]) -> list[dict[str, Any]]:
    return [s.dump() for s in steps]
