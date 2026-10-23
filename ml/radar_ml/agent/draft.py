"""Черновик вывода, который готовит модель (или правила), и его детерминированная самопроверка."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from pydantic import Field

from radar_ml.agent.context import AgentContext
from radar_ml.nlp.text import normalize, numbers_in, percents_in, shingles, tokens
from radar_ml.schemas import ImpactRole, Schema


class DraftStep(Schema):
    label: str = Field(min_length=1, max_length=80)
    role: ImpactRole


class DraftBasis(Schema):
    text: str = Field(min_length=3, max_length=400)
    refs: list[str] = []


class InsightDraft(Schema):
    kind: Literal["risk", "opportunity"]
    title: str = Field(min_length=5, max_length=140)
    why_it_matters: str = Field(min_length=10, max_length=600)
    why_refs: list[str] = []
    impact_path: list[DraftStep]
    consequence: str = Field(min_length=10, max_length=700)
    consequence_refs: list[str] = []
    basis: list[DraftBasis] = []
    unknowns: list[str] = []
    checks: list[str] = []
    signals: list[str] = []
    use_bank_view: bool = False
    horizon: str | None = None
    suggested_questions: list[str] = []


@dataclass
class Issue:
    code: str
    message: str
    severity: Literal["block", "warn"] = "block"
    action: str | None = (
        None  # что агенту сделать до переписывания: bank_search, counterparties, company_facts
    )


PROBABILITY = re.compile(r"(вероятност\w*\s*\d+|\d+\s*%\s*(вероятност|шанс))", re.I)
DECIDED_WORDS = re.compile(r"\b(ввел\w*|приняли|принял\w*|утвердил\w*|вступил\w*)\b", re.I)
GENERIC = re.compile(r"^(следить|мониторить|отслеживать|быть готов|учитывать)\b", re.I)


def _harmless_number(n: str) -> bool:
    """Номера кварталов и годы горизонта не считаем выдуманными данными."""
    if n in {"1", "2", "3", "4"}:
        return True
    return n.isdigit() and 2020 <= int(n) <= 2035


def check_draft(d: InsightDraft, ctx: AgentContext) -> list[Issue]:
    issues: list[Issue] = []
    refs = ctx.refs
    client_refs = [r.id for r in ctx.refs_of("client")]
    source_refs = {r.id for r in ctx.refs_of("source")}
    grounding_text = ctx.grounding_text()
    grounding = numbers_in(grounding_text)
    grounding_pct = percents_in(grounding_text)

    # Заголовок
    if len(d.title) > 90:
        issues.append(Issue("title_long", f"Заголовок {len(d.title)} символов, нужно до 90"))

    # Цепочка влияния
    if not 2 <= len(d.impact_path) <= 6:
        issues.append(Issue("path_len", "Цепочка влияния должна содержать от 2 до 6 шагов"))
    elif d.impact_path[-1].role != "company":
        issues.append(Issue("path_end", "Последний шаг цепочки — сама компания с ролью company"))
    elif d.impact_path[0].role != "event":
        issues.append(Issue("path_start", "Первый шаг цепочки — событие с ролью event", severity="warn"))

    # Признаки компании
    bad = [s for s in d.signals if s not in refs or refs[s].kind != "client"]
    if bad:
        issues.append(
            Issue("signals_unknown", f"Ссылки {bad} не являются признаками компании (C*) из контекста")
        )
    good_signals = [s for s in d.signals if s in refs and refs[s].kind == "client"]
    if not good_signals:
        issues.append(
            Issue(
                "signals_empty",
                "Укажи от 1 до 5 признаков компании (C*), на которых построен вывод",
                action="company_facts",
            )
        )
    if len(good_signals) > 5:
        issues.append(Issue("signals_many", "Не больше 5 признаков компании"))
    why_client = [r for r in d.why_refs if r in client_refs]
    if len(client_refs) >= 2 and len(why_client) < 2:
        issues.append(
            Issue(
                "why_thin",
                "«Почему это важно» должно опираться минимум на два признака компании (C*)",
                action="counterparties" if "counterparties" not in ctx.tools_called else "company_facts",
            )
        )

    # Основания — только факты из источников
    if not d.basis:
        issues.append(
            Issue("basis_empty", "Нужен хотя бы один установленный факт из новости со ссылкой на S*")
        )
    for b in d.basis:
        if not any(
            r in source_refs or (r in refs and refs[r].kind in ("client", "bank", "bank_view"))
            for r in b.refs
        ):
            issues.append(Issue("basis_ref", f"Основание «{b.text[:60]}» без ссылки на источник"))
        extra = {n for n in numbers_in(b.text) - grounding if not _harmless_number(n)}
        if extra:
            issues.append(
                Issue(
                    "basis_numbers",
                    f"В основании «{b.text[:60]}» числа {sorted(extra)} отсутствуют в источниках",
                )
            )

    # Числа в выводах модели должны быть в контексте
    for field_name, text in (
        ("whyItMatters", d.why_it_matters),
        ("consequence", d.consequence),
        ("title", d.title),
    ):
        extra = {n for n in numbers_in(text) - grounding if not _harmless_number(n)}
        extra |= {f"{n}%" for n in percents_in(text) - grounding_pct}
        if extra:
            issues.append(
                Issue(
                    "numbers",
                    f"В {field_name} числа {sorted(extra)} отсутствуют в источниках, данных компании и аналитике банка",
                )
            )
        if PROBABILITY.search(text):
            issues.append(
                Issue(
                    "probability",
                    f"В {field_name} не указывай вероятность в процентах — её нечем подтвердить",
                )
            )

    # Позиция банка
    has_bank = ctx.bank_view is not None and not ctx.bank_view.material.outdated
    bank_refs = {r.id for r in ctx.refs_of("bank_view")} | {r.id for r in ctx.refs_of("bank")}
    if has_bank and not d.use_bank_view:
        issues.append(
            Issue(
                "bank_unused",
                "По теме есть позиция банка (BV): используй её (useBankView=true) и учти в последствиях",
            )
        )
    if d.use_bank_view and not ctx.bank_view:
        issues.append(
            Issue(
                "bank_missing",
                "Позиции банка по теме нет — useBankView должно быть false, не придумывай оценку банка",
                action="bank_search",
            )
        )
    if has_bank and d.use_bank_view and not (set(d.consequence_refs) | set(d.why_refs)) & bank_refs:
        issues.append(
            Issue(
                "bank_no_influence",
                "Аналитика банка должна влиять на вывод: сошлись на BV или B* в consequenceRefs",
            )
        )

    # Не пересказ: последствие должно отличаться от текста новости и опираться на компанию
    ev_sh = shingles(f"{ctx.event.title} {ctx.event.summary}")
    cons_sh = shingles(d.consequence)
    if cons_sh and len(cons_sh & ev_sh) / len(cons_sh) > 0.5:
        issues.append(
            Issue("retelling", "Последствие пересказывает новость: объясни, что это значит для компании")
        )
    if not (set(d.consequence_refs) | set(d.why_refs)) & set(client_refs):
        issues.append(
            Issue(
                "not_personal",
                "Вывод не связан с признаками компании: сошлись на C* в whyRefs или consequenceRefs",
            )
        )

    # Стадия
    if ctx.event.stage == "discussed" and (
        DECIDED_WORDS.search(d.title) or DECIDED_WORDS.search(d.consequence)
    ):
        issues.append(Issue("stage", "Событие только обсуждается: не описывай его как принятое решение"))

    # Что проверить — конкретно
    if not d.checks:
        issues.append(Issue("checks_empty", "Добавь 1–3 конкретных шага «что проверить» для этой компании"))
    elif all(GENERIC.search(c.strip()) for c in d.checks):
        issues.append(
            Issue(
                "checks_generic",
                "Шаги «что проверить» слишком общие: привяжи их к ситуации компании",
                severity="warn",
            )
        )

    if len(d.suggested_questions) > 4:
        issues.append(Issue("questions", "Не больше 4 подсказок для вопросов", severity="warn"))

    # Вид вывода против направления события
    prior = ctx.candidate.kind_prior if ctx.candidate else None
    if prior and d.kind != prior:
        issues.append(
            Issue(
                "kind_prior",
                f"Правила по направлению события дают «{prior}», а в выводе «{d.kind}». "
                "Проверь и при несогласии объясни в consequence",
                severity="warn",
            )
        )
    return issues


def blocking(issues: list[Issue]) -> list[Issue]:
    return [i for i in issues if i.severity == "block"]


def token_overlap(a: str, b: str) -> float:
    ta, tb = set(tokens(a)), set(tokens(b))
    return len(ta & tb) / len(ta) if ta else 0.0


def normalize_title(t: str) -> str:
    t = re.sub(r"\s+", " ", t).strip().rstrip(".")
    if len(t) <= 90:
        return t
    cut = t[:89]
    sp = cut.rfind(" ")
    return (cut[:sp] if sp > 50 else cut).rstrip(",:;— ") + "…"


__all__ = [
    "InsightDraft",
    "DraftStep",
    "DraftBasis",
    "Issue",
    "check_draft",
    "blocking",
    "normalize_title",
    "normalize",
]
