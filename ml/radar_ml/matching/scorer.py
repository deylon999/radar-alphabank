"""Первый этап отбора: быстрая оценка значимости события для компании без вызова LLM.

Значимость = noisy-OR весов связей «событие — признак компании» × стадия × свежесть × доверие к источнику.
Каждая связь именована (фактор, отрасль, регион, страна, контрагент, группа, сведения пользователя),
поэтому оценку можно объяснить: какие признаки совпали и с каким весом. Это балл приоритета,
а не вероятность убытка.

Связь прямая (вкладка «Главное»), если событие задевает саму компанию: её отрасль, продукты, ВЭД,
регион или подтверждённые сведения. Только через контрагентов или группу — возможная («Под наблюдением»).
"""

from __future__ import annotations

import math
from datetime import UTC, datetime

from radar_ml.domain import Domain, get_domain
from radar_ml.nlp.geo import EU_MEMBERS, find_countries, find_regions, region_display
from radar_ml.nlp.text import normalize
from radar_ml.profile.builder import BuiltProfile
from radar_ml.schemas import Candidate, Event, MatchLink
from radar_ml.settings import get_settings

DIRECT_ORIGINS = {"sector", "product", "foreign_trade", "fact", "scale", "region"}
DIRECT_MIN_FINAL = 0.3  # ниже — событие слишком старое или слабое для вкладки «Главное»
STAGE_FACTOR = {"decided": 1.0, "occurred": 1.0, "resolved": 0.8, "discussed": 0.75}
EVENT_FACTOR_STRENGTH = (1.0, 0.85, 0.7, 0.6)

# Кто продаёт товар фактора: для них рост цены — возможность, для остальных — рост издержек.
SELLERS = {
    "oil": {"oil_gas"},
    "fuel": {"wholesale_fuel", "oil_gas"},
    "metals": {"metallurgy", "metal_mining", "wholesale_metals"},
    "grain": {"agriculture", "wholesale_agri"},
    "coal": {"coal_mining"},
    "gold": {"metal_mining"},
    "gas": {"oil_gas", "energy"},
    "fertilizers": {"chemicals", "wholesale_chemicals"},
    "construction_materials": {"building_materials", "wholesale_building"},
    "electricity": {"energy"},
}
DEMAND_FACTORS = {"consumer_demand", "real_estate", "auto_market", "business_activity", "state_spending"}
# Общие факторы есть почти у всех. Если событие про конкретный рынок (зерно, топливо, алкоголь),
# которого у компании нет, совпадение только по общему фактору («пошлины», «налоги») ослабляем.
GENERIC_FACTORS = {
    "customs_trade",
    "taxes",
    "state_spending",
    "business_activity",
    "inflation",
    "credit_conditions",
    "payments_infra",
    "sanctions",
    "labor_market",
}
BORROWER_PRODUCTS = {"loan", "leasing", "factoring"}


def _age_days(ev: Event, now: datetime) -> float:
    t = ev.occurred_at or ev.created_at
    return max(0.0, (now - t).total_seconds() / 86400)


def kind_prior(bp: BuiltProfile, ev: Event, top_factor: str | None, domain: Domain) -> str | None:
    if not top_factor:
        return None
    d = ev.directions.get(top_factor)
    prof = bp.profile
    products = set(prof.products)
    sector = domain.sector_by_id(prof.sector_id)
    if top_factor in ("key_rate", "credit_conditions"):
        borrower = bool(products & BORROWER_PRODUCTS) or any(
            o.origin == "fact" for f in prof.factors if f.id == "key_rate" for o in f.origins
        )
        if d in ("hold", "up"):
            return "risk" if borrower or "deposit" not in products else "opportunity"
        if d == "down":
            return "opportunity"
        return "risk" if borrower else None
    if top_factor.startswith("fx_"):
        role = sector.trade_role
        if d == "rub_weaker":
            return "opportunity" if role == "exporter" else "risk"
        if d == "rub_stronger":
            return "risk" if role == "exporter" else "opportunity"
        return "risk"
    if top_factor in SELLERS:
        seller = (prof.sector_id or "") in SELLERS[top_factor]
        if d == "up":
            return "opportunity" if seller else "risk"
        if d == "down":
            return "risk" if seller else "opportunity"
        return None
    if top_factor in DEMAND_FACTORS:
        if d == "up":
            return "opportunity"
        if d == "down":
            return "risk"
        return None
    if top_factor in ("rail_logistics", "sea_logistics", "road_logistics"):
        return "risk"
    if d == "tighten":
        return "risk"
    if d == "ease":
        return "opportunity"
    if top_factor in ("inflation", "labor_market", "sanctions", "taxes", "customs_trade"):
        return "risk"
    return None


def score_event(
    bp: BuiltProfile,
    ev: Event,
    now: datetime | None = None,
    domain: Domain | None = None,
    source_trust: dict[str, float] | None = None,
) -> Candidate | None:
    s = get_settings()
    domain = domain or get_domain()
    now = now or datetime.now(UTC)
    if not ev.business_relevant:
        return None
    prof = bp.profile
    fw = bp.factor_weights
    links: list[MatchLink] = []

    # 1. Факторы чувствительности
    ev_specific = [f for f in ev.entities.factors[:2] if f not in GENERIC_FACTORS]
    foreign_market = bool(ev_specific) and not any(fw.get(f) for f in ev_specific)
    for i, fid in enumerate(ev.entities.factors[:6]):
        wc = fw.get(fid)
        if not wc:
            continue
        se = EVENT_FACTOR_STRENGTH[min(i, len(EVENT_FACTOR_STRENGTH) - 1)]
        if foreign_market and fid in GENERIC_FACTORS:
            se *= 0.5
        f = next(x for x in prof.factors if x.id == fid)
        direct = any(o.origin in DIRECT_ORIGINS for o in f.origins)
        fact_origin = next((o for o in f.origins if o.origin == "fact"), None)
        why = "; ".join(dict.fromkeys(f"{o.label}: {o.value}" for o in f.origins[:3]))
        links.append(
            MatchLink(
                kind="factor",
                factor=fid,
                label=f.label,
                value=why,
                weight=round(wc * se, 3),
                direct=direct,
                fact_id=fact_origin.fact_id if fact_origin else None,
            )
        )

    # 2. Отрасль прямо названа в новости
    if prof.sector_id and prof.sector_id in ev.entities.sectors:
        links.append(MatchLink(kind="sector", label="Отрасль компании", value=prof.sector or "", weight=0.9))

    # 3. Регион
    company_regions = {prof.region} if prof.region else set()
    fact_regions: dict[str, str] = {}
    for f in prof.facts:
        for r in find_regions(normalize(f.statement)):
            fact_regions[r] = f.id
    ev_regions = set(ev.entities.regions)
    regional = 0 < len(ev_regions) <= 3
    if regional and company_regions & ev_regions:
        r = next(iter(company_regions & ev_regions))
        links.append(
            MatchLink(kind="region", label="Регион регистрации", value=region_display(r) or r, weight=0.6)
        )
    for r, fid in fact_regions.items():
        if r in ev_regions:
            links.append(
                MatchLink(
                    kind="fact",
                    label="Площадка или маршрут из сведений компании",
                    value=region_display(r) or r,
                    weight=0.85,
                    fact_id=fid,
                )
            )

    # 4. Страны ВЭД
    countries = set(prof.foreign_trade_countries)
    for f in prof.facts:
        countries |= {c for c in find_countries(normalize(f.statement)) if c != "Евросоюз"}
    ev_countries = set(ev.entities.countries)
    if "Евросоюз" in ev_countries:
        ev_countries |= EU_MEMBERS
    common = countries & ev_countries
    if common:
        links.append(
            MatchLink(
                kind="country", label="Страна внешней торговли", value=", ".join(sorted(common)), weight=0.7
            )
        )

    # 5. Контрагенты: событие в отрасли ключевого поставщика или покупателя
    for cp in prof.counterparties:
        if not cp.sector or (cp.share_pct or 0) < 10:
            continue
        cp_sector = next((sid for sid, sc in domain.sectors.items() if sc.name == cp.sector), None)
        if cp_sector and cp_sector in ev.entities.sectors and cp_sector != prof.sector_id:
            role = "покупатель" if cp.direction == "incoming" else "поставщик"
            links.append(
                MatchLink(
                    kind="counterparty",
                    label=f"Ключевой {role}",
                    value=f"{cp.id}: {cp.sector}, {cp.share_pct:.0f}% платежей",
                    weight=round(0.5 * min(1.0, (cp.share_pct or 0) / 30), 3),
                    direct=False,
                )
            )

    if not links:
        return None

    raw = 1.0
    for ln in links:
        raw *= 1 - min(ln.weight, 0.98)
    raw = 1 - raw

    has_direct = any(ln.direct and ln.weight >= 0.45 for ln in links)
    strong_specific = any(ln.kind in ("sector", "fact", "country", "region") for ln in links)
    region_mismatch = (
        regional and not (company_regions & ev_regions) and not any(r in ev_regions for r in fact_regions)
    )
    if region_mismatch and not strong_specific:
        # Событие в другом регионе: не делаем уверенную связь только по отрасли или стране.
        raw *= 0.7
        has_direct = False

    if raw < s.candidate_min_score:
        return None
    age = _age_days(ev, now)
    # Принятые решения (налоги, пошлины, ставки) действуют долго — устаревают вдвое медленнее новостей о ценах.
    tau = s.freshness_tau_days * (2.0 if ev.stage == "decided" else 1.0)
    fresh = max(0.25, math.exp(-age / tau))
    stage = STAGE_FACTOR.get(ev.stage, 0.9)
    trusts = [source_trust.get(sid, 0.8) for sid in ev.source_ids] if source_trust else []
    trust = 1.0 if ev.official else (max(trusts) if trusts else 0.85)
    trust_f = 0.85 + 0.15 * trust
    imp_f = 0.75 + 0.25 * ev.importance
    score = raw * stage * fresh * trust_f * imp_f

    # «Главное» — прямая связь, достаточная сила связи и не устаревшее событие.
    relevance = (
        "direct" if has_direct and raw >= s.direct_min_score and score >= DIRECT_MIN_FINAL else "possible"
    )
    if ev.stage == "discussed":
        # Обсуждение — ещё не изменение: по умолчанию «под наблюдением», без тревоги.
        relevance = "possible"

    top = max(links, key=lambda x: x.weight)
    top_factor = next((ln.factor for ln in sorted(links, key=lambda x: -x.weight) if ln.factor), None)
    # Связь только через регион или страну: вид вывода определяем по главному фактору самого события.
    kind_factor = top_factor or (ev.entities.factors[0] if ev.entities.factors else None)
    urgent = (
        relevance == "direct"
        and (ev.official or (ev.stage == "decided" and ev.importance >= 0.7))
        and ev.stage in ("decided", "occurred")
        and top.weight >= 0.8
        and age <= 3
        and raw >= 0.85
    )
    urgency = "urgent" if urgent else ("important" if relevance == "direct" else "info")
    reasons = [f"{ln.label}: {ln.value}" for ln in sorted(links, key=lambda x: -x.weight)[:4]]
    topic = domain.factors[top_factor].topic if top_factor else ev.topic
    return Candidate(
        company_id=prof.company_id,
        event_id=ev.id,
        event_version=ev.version,
        score=round(score, 4),
        relevance=relevance,  # type: ignore[arg-type]
        urgency=urgency,  # type: ignore[arg-type]
        topic=topic,  # type: ignore[arg-type]
        kind_prior=kind_prior(bp, ev, kind_factor, domain),  # type: ignore[arg-type]
        links=sorted(links, key=lambda x: -x.weight),
        components={
            "links": round(raw, 4),
            "stage": stage,
            "freshness": round(fresh, 4),
            "trust": round(trust_f, 4),
            "importance": round(imp_f, 4),
            "ageDays": round(age, 1),
        },
        reasons=reasons,
    )


def rank_candidates(
    bp: BuiltProfile,
    events: list[Event],
    position: str | None = None,
    now: datetime | None = None,
    limit: int = 30,
    max_per_topic: int = 4,
    source_trust: dict[str, float] | None = None,
) -> list[Candidate]:
    domain = get_domain()
    cands = [c for ev in events if (c := score_event(bp, ev, now, domain, source_trust))]
    urg = {"urgent": 0, "important": 1, "info": 2}

    def key(c: Candidate) -> tuple:
        return (urg[c.urgency], -c.score * domain.role_weight(position, c.topic), c.event_id)

    cands = _collapse_series(cands, {ev.id: ev for ev in events})
    cands.sort(key=key)
    out: list[Candidate] = []
    per_topic: dict[str, int] = {}
    rest: list[Candidate] = []
    for c in cands:
        if per_topic.get(c.topic, 0) >= max_per_topic:
            rest.append(c)
            continue
        per_topic[c.topic] = per_topic.get(c.topic, 0) + 1
        out.append(c)
    out += rest  # однотипные события не пропадают, а уходят ниже
    return out[:limit]


def _top_factor(c: Candidate) -> str | None:
    return next((ln.factor for ln in c.links if ln.factor), None)


def _collapse_series(cands: list[Candidate], events: dict[str, Event]) -> list[Candidate]:
    """Серии событий по одному фактору (решения ЦБ по ставке, ожидания перед ними):
    обсуждение, после которого уже принято решение, убираем; более старое решение того же рода
    уходит «под наблюдение» — оно остаётся предысторией для агента (news_search)."""
    by_factor: dict[str, list[Candidate]] = {}
    for c in cands:
        f = _top_factor(c)
        if f:
            by_factor.setdefault(f, []).append(c)
    drop: set[str] = set()
    demote: set[str] = set()
    for _f, group in by_factor.items():
        group.sort(
            key=lambda c: events[c.event_id].occurred_at or events[c.event_id].created_at, reverse=True
        )
        latest_decision = next((c for c in group if events[c.event_id].stage == "decided"), None)
        if not latest_decision:
            continue
        t_dec = events[latest_decision.event_id].occurred_at or events[latest_decision.event_id].created_at
        for c in group:
            if c is latest_decision:
                continue
            ev = events[c.event_id]
            t = ev.occurred_at or ev.created_at
            if ev.stage == "discussed" and t <= t_dec and (t_dec - t).days <= 30:
                drop.add(c.event_id)
            elif (
                ev.stage == "decided"
                and t < t_dec
                and ev.directions.get(_f) == events[latest_decision.event_id].directions.get(_f)
            ):
                demote.add(c.event_id)
    out = []
    for c in cands:
        if c.event_id in drop:
            continue
        if c.event_id in demote and c.relevance == "direct":
            c = c.model_copy(update={"relevance": "possible", "urgency": "info"})
        out.append(c)
    return out
