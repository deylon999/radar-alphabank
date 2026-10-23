import json
import re

import pytest

from radar_ml.schemas import CompanyContext, UserFact

FACTS = CompanyContext(
    company_id="U_T1",
    facts=[
        UserFact(
            id="11111111-1111-4111-8111-111111111111",
            category="finance",
            statement="Основной кредит — с плавающей ставкой: ключевая ставка плюс 2,5 п. п.",
        ),
    ],
)


def _rate_event(news):
    return next(e for e in news.list() if "ключев" in e.title.lower())


def _refs(messages, prefix):
    return sorted(
        set(
            re.findall(
                rf'"ref": "({prefix}\d*)"',
                messages[-1]["content"] if isinstance(messages[-1]["content"], str) else "",
            )
        )
    )


def _all_refs(messages, prefix):
    text = " ".join(m["content"] for m in messages if isinstance(m.get("content"), str))
    return sorted(set(re.findall(rf'"ref": "({prefix}\d*)"', text)))


def _draft(messages, *, bad=False):
    c = _all_refs(messages, "C")
    s = _all_refs(messages, "S")
    bv = _all_refs(messages, "BV")
    d = {
        "kind": "risk",
        "title": "Ставка 14% сохраняется: долг компании с плавающей ставкой не подешевеет",
        "whyItMatters": "У компании кредиты и лизинг, основной кредит привязан к ключевой ставке",
        "whyRefs": c[:2],
        "impactPath": [
            {"label": "Ключевая ставка 14%", "role": "event"},
            {"label": "Плавающая ставка по кредиту", "role": "market"},
            {"label": "Клиент U_T1", "role": "company"},
        ],
        "consequence": "Процентные расходы по плавающему кредиту в ближайшие месяцы останутся высокими; банк ждёт сохранения ставки до конца года",
        "consequenceRefs": c[:1] + bv[:1],
        "basis": [
            {
                "text": "Банк России 23 октября сохранил ключевую ставку на уровне 14,00% годовых",
                "refs": s[:1],
            }
        ],
        "unknowns": ["Доля долга с плавающей ставкой"],
        "checks": ["Пересчитать бюджет процентных расходов на 4 квартал"],
        "signals": c[:3],
        "useBankView": bool(bv),
        "suggestedQuestions": ["Когда банк ждёт снижения ставки?"],
    }
    if bad:
        d["consequence"] = (
            "Процентные расходы вырастут на 37% уже в ноябре"  # число, которого нет в источниках
        )
        d["useBankView"] = False
        d["whyRefs"] = c[:1]
    return json.dumps(d, ensure_ascii=False)


def test_rules_fallback_produces_valid_insight(news, bank, gw):
    from radar_ml.pipeline import generate_insight

    ev = _rate_event(news)
    ins = generate_insight("U_T1", ev.id, FACTS)
    assert ins.generated_by == "rules"
    assert ins.kind == "risk" and ins.relevance == "direct"
    assert ins.impact_path[-1].role == "company" and 2 <= len(ins.impact_path) <= 6
    assert 1 <= len(ins.signals) <= 5
    assert ins.bank_view is not None and ins.bank_view.material.page == 1
    assert ins.sources and ins.sources[0].url.startswith("https://")
    kinds = [s.kind for s in ins.trace]
    assert kinds[0] == "plan" and "tool" in kinds and "check" in kinds and kinds[-1] == "conclusion"
    assert ins.offer is not None and ins.offer.title == "Процентный своп"
    assert len(ins.title) <= 90


def test_agent_llm_path_self_check_and_revision(news, bank, gw):
    from radar_ml.pipeline import generate_insight
    from radar_ml.store import get_store

    calls = {"draft": 0, "revise": 0, "critic": 0, "plan": 0}

    def plan(task, msgs):
        calls["plan"] += 1
        return json.dumps(
            {
                "goal": "Решение по ставке: нужны кредиты клиента и прогноз банка",
                "steps": [
                    {"tool": "bank_position", "args": {"indicators": ["key_rate"]}, "why": "прогноз"},
                    {"tool": "company_facts", "args": {}, "why": "условия кредита"},
                    {"tool": "delete_everything", "args": {}, "why": "не должно выполниться"},
                ],
            }
        )

    def draft(task, msgs):
        calls["draft"] += 1
        return _draft(msgs, bad=True)

    def revise(task, msgs):
        calls["revise"] += 1
        assert "37" in msgs[-1]["content"] or any(
            "37" in m.get("content", "") for m in msgs if isinstance(m.get("content"), str)
        )
        return _draft(msgs)

    def critic(task, msgs):
        calls["critic"] += 1
        return json.dumps({"ok": True, "issues": []})

    # Первый план содержит запрещённый инструмент — шлюз просит исправить, второй ответ уже чистый.
    plan_answers = iter(
        [
            plan,
            lambda t, m: json.dumps(
                {
                    "goal": "Решение по ставке",
                    "steps": [
                        {"tool": "bank_position", "args": {"indicators": ["key_rate"]}, "why": "прогноз"},
                        {"tool": "company_facts", "args": {}, "why": "условия кредита"},
                    ],
                }
            ),
        ]
    )
    gw.register_stub("insight_plan", lambda t, m: next(plan_answers)(t, m))
    gw.register_stub("insight_draft", draft)
    gw.register_stub("insight_revise", revise)
    gw.register_stub("insight_critic", critic)

    ev = _rate_event(news)
    ins = generate_insight("U_T1", ev.id, FACTS)
    assert ins.generated_by == "agent"
    assert calls["revise"] == 1 and calls["critic"] == 1
    assert ins.bank_view is not None
    assert "37" not in ins.consequence
    assert any(s.kind == "check" and "проблем" in s.title.lower() for s in ins.trace)
    trace = get_store().get_json("traces", "id", ins.trace_id)
    names = [e["name"] for e in trace["entries"]]
    assert "insight_plan" in names and "insight_draft" in names and "insight_revise" in names
    assert "delete_everything" not in json.dumps(trace["entries"])
    # Вызовы инструментов журналируются
    rows = get_store().query("SELECT tool FROM tool_calls WHERE trace_id = ?", (ins.trace_id,))
    assert {r["tool"] for r in rows} >= {"event_details", "company_profile", "bank_position"}


def test_invalid_model_output_falls_back_to_rules(news, bank, gw):
    from radar_ml.pipeline import generate_insight

    gw.register_stub("insight_draft", lambda t, m: "не JSON")
    ev = _rate_event(news)
    ins = generate_insight("U_T1", ev.id, FACTS)
    assert ins.generated_by == "rules"


def test_insight_cache_and_revision_note(news, bank, gw):
    from radar_ml.pipeline import generate_insight

    ev = _rate_event(news)
    a = generate_insight("U_T1", ev.id, FACTS)
    b = generate_insight("U_T1", ev.id, FACTS)
    assert a.trace_id == b.trace_id  # из кэша, без повторной работы агента
    ctx2 = CompanyContext(
        company_id="U_T1",
        facts=FACTS.facts
        + [
            UserFact(
                id="22222222-2222-4222-8222-222222222222",
                category="supplier",
                statement="Битум закупаем в Китае за юани",
            )
        ],
    )
    c = generate_insight("U_T1", ev.id, ctx2)
    assert c.trace_id != a.trace_id
    assert c.insight_key == a.insight_key


def test_tool_registry_is_closed(news, env):
    from datetime import UTC, datetime

    from radar_ml.agent.context import AgentContext, Tracer
    from radar_ml.agent.tools import ToolError, run_tool
    from radar_ml.data.dataset import get_dataset
    from radar_ml.profile.builder import build_profile

    bp = build_profile("U_T1", None, get_dataset())
    ctx = AgentContext(
        company=bp, event=_rate_event(news), candidate=None, position=None, now=datetime.now(UTC)
    )
    tr = Tracer("insight", "U_T1", None)
    with pytest.raises(ToolError):
        run_tool(ctx, tr, "send_payment", {"amount": 1})
    out = run_tool(ctx, tr, "bank_search", {"query": "x"})
    assert "error" in out  # параметры не прошли схему
    prof = run_tool(ctx, tr, "company_profile", {"companyId": "U_T2"})
    assert prof["companyId"] == "U_T1"  # компания берётся из контекста, а не из аргументов модели
