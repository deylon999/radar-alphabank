"""Бизнес-контекст компании: признаки из датасета банка, сведения пользователей и факторы чувствительности.

Фактор чувствительности — внешняя величина или решение, через которое событие может повлиять на компанию
(ключевая ставка, курс юаня, цены на металл, госзаказ...). Вес фактора собирается из нескольких
происхождений по правилу noisy-OR: 1 - Π(1 - w). У каждого веса есть происхождение — признак компании,
на который вывод потом ссылается как на сигнал.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from radar_ml.data.dataset import Company, Dataset, okved_class
from radar_ml.domain import Domain, get_domain
from radar_ml.nlp.geo import find_countries, find_regions, region_display
from radar_ml.nlp.text import normalize
from radar_ml.schemas import (
    BankDataSignal,
    CompanyContext,
    CompanyProfile,
    CounterpartyOut,
    FactorOrigin,
    FactSignal,
    GroupInfo,
    IndustryPosition,
    Okved,
    SensitivityFactor,
    UserFact,
)

PRODUCT_LABELS = {
    "settlement": "расчётный счёт",
    "loan": "кредиты",
    "leasing": "лизинг",
    "guarantee": "банковские гарантии",
    "deposit": "депозиты",
    "payroll": "зарплатный проект",
    "factoring": "факторинг",
}
FACT_CATEGORY_LABELS = {
    "supplier": "Поставщики",
    "customer": "Покупатели",
    "site": "Площадки и склады",
    "region": "Регионы присутствия",
    "product": "Продукция",
    "logistics": "Логистика",
    "finance": "Финансы",
    "other": "Сведения о компании",
}

LARGE_BUSINESS_REVENUE = 15e9


def fmt_money(v: float | None) -> str:
    if v is None:
        return "нет данных"
    for div, unit in ((1e12, "трлн"), (1e9, "млрд"), (1e6, "млн"), (1e3, "тыс.")):
        if abs(v) >= div:
            x = v / div
            s = f"{x:.1f}".replace(".", ",") if x < 100 else f"{x:.0f}"
            s = s.replace(",0", "") if s.endswith(",0") else s
            return f"{s} {unit} ₽"
    return f"{v:.0f} ₽"


def plural(n: int, forms: tuple[str, str, str]) -> str:
    """plural(22, ("компания", "компании", "компаний")) -> "22 компании"."""
    n10, n100 = n % 10, n % 100
    if n10 == 1 and n100 != 11:
        f = forms[0]
    elif 2 <= n10 <= 4 and not 12 <= n100 <= 14:
        f = forms[1]
    else:
        f = forms[2]
    return f"{n} {f}"


def fmt_pct(x: float, digits: int = 1) -> str:
    s = f"{x:.{digits}f}".replace(".", ",")
    return s[:-2] if s.endswith(",0") else s


def scale_label(revenue: float | None) -> str | None:
    if revenue is None:
        return None
    if revenue >= LARGE_BUSINESS_REVENUE:
        return "крупный бизнес (выручка от 15 млрд ₽)"
    if revenue >= 2e9:
        return "крупная компания"
    if revenue >= 800e6:
        return "средняя компания"
    if revenue >= 120e6:
        return "малая компания"
    return "микропредприятие"


@dataclass
class SignalCatalog:
    """Признаки компании, на которые может сослаться вывод. key -> сигнал API."""

    items: dict[str, BankDataSignal | FactSignal] = field(default_factory=dict)

    def add_bank(self, key: str, label: str, value: str | None) -> None:
        if value:
            self.items[key] = BankDataSignal(label=label, value=value)

    def add_fact(self, fact: UserFact) -> str:
        key = f"fact:{fact.id}"
        self.items[key] = FactSignal(
            fact_id=fact.id, label=FACT_CATEGORY_LABELS.get(fact.category, "Сведения"), value=fact.statement
        )
        return key


class _FactorAcc:
    def __init__(self, domain: Domain):
        self.domain = domain
        self.w: dict[str, float] = {}
        self.origins: dict[str, list[tuple[FactorOrigin, str]]] = {}

    def add(self, fid: str, weight: float, origin: FactorOrigin, signal_key: str) -> None:
        if fid not in self.domain.factors or weight <= 0:
            return
        prev = self.w.get(fid, 0.0)
        self.w[fid] = 1 - (1 - prev) * (1 - min(weight, 1.0))
        self.origins.setdefault(fid, []).append((origin, signal_key))

    def build(self) -> tuple[list[SensitivityFactor], dict[str, list[str]]]:
        out = []
        sig_map: dict[str, list[str]] = {}
        for fid, w in sorted(self.w.items(), key=lambda x: -x[1]):
            f = self.domain.factors[fid]
            origins = [o for o, _ in self.origins[fid]]
            keys: list[str] = []
            for _, k in self.origins[fid]:
                if k not in keys:
                    keys.append(k)
            sig_map[fid] = keys
            out.append(
                SensitivityFactor(id=fid, label=f.label, topic=f.topic, weight=round(w, 3), origins=origins)
            )
        return out, sig_map


@dataclass
class BuiltProfile:
    profile: CompanyProfile
    signals: SignalCatalog
    factor_signals: dict[str, list[str]]
    text_index: str  # нормализованный текст признаков и фактов для поиска совпадений

    @property
    def factor_weights(self) -> dict[str, float]:
        return {f.id: f.weight for f in self.profile.factors}


def _counterparty_rows(ds: Dataset, domain: Domain, cid: str) -> list[CounterpartyOut]:
    rows = []
    for r in ds.counterparties(cid, limit=10):
        other = ds.get(r["id"])
        sector = domain.sector_for_okved(other.okved_code).name if other and other.okved_code else None
        rows.append(
            CounterpartyOut(
                id=r["id"],
                direction=r["direction"],
                amount=r["amount"],
                payments=r["payments"],
                industry=other.okved_name if other else None,
                sector=sector,
                share_pct=round(100 * r["share"], 1) if r.get("share") is not None else None,
            )
        )
    return rows


def build_profile(
    company_id: str,
    ctx: CompanyContext | None = None,
    ds: Dataset | None = None,
    domain: Domain | None = None,
) -> BuiltProfile:
    domain = domain or get_domain()
    ctx = ctx or CompanyContext(company_id=company_id)
    company: Company | None = ds.get(company_id) if ds and ds.loaded else None
    confirmed = [f for f in ctx.facts if f.status == "confirmed"]
    acc = _FactorAcc(domain)
    sig = SignalCatalog()
    quality: list[str] = []
    text_parts: list[str] = [ctx.description or ""] + [f.statement for f in confirmed]

    prof = CompanyProfile(
        company_id=company_id,
        origin="dataset" if company else "user",
        name=ctx.name,
        description=ctx.description,
        facts=confirmed,
    )

    sector = domain.default_sector
    if company:
        sector = domain.sector_for_okved(company.okved_code)
        prof.okved = (
            Okved(code=company.okved_code or "", name=company.okved_name or "")
            if company.okved_code
            else None
        )
        prof.sector_id, prof.sector = sector.id, sector.name
        prof.region = company.region
        prof.city = company.city
        prof.revenue = int(company.revenue) if company.revenue is not None else None
        prof.scale = scale_label(company.revenue)
        prof.employees = company.employees
        prof.age_years = company.age_years
        prof.stage = company.stage
        prof.ownership = company.ownership.capitalize() if company.ownership else None
        prof.relationship = company.relationship  # type: ignore[assignment]
        prof.products = company.products  # type: ignore[assignment]
        prof.foreign_trade_countries = company.countries
        if company.ambiguous:
            quality.append("В данных банка несколько разных записей с этим ID; использована первая")
        if not company.stage:
            quality.append("Стадия развития бизнеса неизвестна")
        if not company.countries:
            quality.append("Данных ФТС о внешней торговле нет: это не доказывает отсутствие ВЭД")
        text_parts += [company.okved_name or "", company.region or "", company.city or ""]

        if prof.okved:
            sig.add_bank("okved", "Отрасль (ОКВЭД)", f"{prof.okved.code} {prof.okved.name}")
        sig.add_bank("region", "Регион регистрации", region_display(company.region))
        sig.add_bank("revenue", "Выручка", fmt_money(company.revenue))
        sig.add_bank("employees", "Численность по данным ФНС", company.employees)
        prods = [PRODUCT_LABELS[p] for p in company.products if p != "settlement"]
        sig.add_bank("products", "Продукты банка", ", ".join(prods) if prods else None)
        if company.countries:
            sig.add_bank("foreign_trade", "Внешняя торговля по данным ФТС", ", ".join(company.countries))

        pos = ds.industry_position(company) if ds else None
        if pos:
            k, peers, rank, share = pos
            prof.industry_position = IndustryPosition(
                okved_class=k, peers=peers, rank=rank, share_pct=round(share, 1)
            )
            sig.add_bank(
                "position",
                "Положение среди клиентов банка в отрасли",
                f"{rank}-е место по выручке из {peers} клиентов банка с ОКВЭД {k}, ≈{fmt_pct(share)}% их суммарной выручки (оценка по данным банка, не доля рынка)",
            )

        # Сектор
        for fid, w in sector.factors.items():
            acc.add(fid, w, FactorOrigin(origin="sector", label="Отрасль", value=sector.name), "okved")
        # Продукты банка
        for p in company.products:
            for fid, w in domain.products.get(p, {}).get("factors", {}).items():
                acc.add(
                    fid,
                    w,
                    FactorOrigin(origin="product", label="Продукт банка", value=PRODUCT_LABELS[p]),
                    "products",
                )
        # ВЭД
        if company.countries:
            currencies = []
            for c in company.countries:
                cf = domain.currency_factor(c)
                currencies.append(cf)
                acc.add(
                    cf,
                    0.9,
                    FactorOrigin(origin="foreign_trade", label="Страна ВЭД", value=c),
                    "foreign_trade",
                )
            prof.currencies = sorted({domain.factors[c].label for c in currencies})
            acc.add(
                "customs_trade",
                0.7,
                FactorOrigin(origin="foreign_trade", label="ВЭД", value=", ".join(company.countries)),
                "foreign_trade",
            )
            acc.add(
                "payments_infra",
                0.6,
                FactorOrigin(origin="foreign_trade", label="ВЭД", value=", ".join(company.countries)),
                "foreign_trade",
            )
            sens = [c for c in company.countries if c in domain.sanction_sensitive]
            acc.add(
                "sanctions",
                0.7 if sens else 0.35,
                FactorOrigin(
                    origin="foreign_trade", label="Страны ВЭД", value=", ".join(sens or company.countries)
                ),
                "foreign_trade",
            )
        # Масштаб: крупный работодатель чувствительнее к рынку труда
        if company.employees in {"Более 251", "101-250"}:
            acc.add(
                "labor_market",
                0.4,
                FactorOrigin(origin="scale", label="Численность", value=company.employees),
                "employees",
            )

        # Контрагенты по платежам
        cps = _counterparty_rows(ds, domain, company_id) if ds else []
        prof.counterparties = cps[:5]
        in_total, out_total = ds.flow_totals(company_id) if ds else (0.0, 0.0)
        exposure: dict[str, float] = {}
        for cp in cps:
            if not cp.sector or cp.share_pct is None:
                continue
            key = f"{'покупатели' if cp.direction == 'incoming' else 'поставщики'}: {cp.sector}"
            exposure[key] = round(exposure.get(key, 0.0) + cp.share_pct, 1)
        prof.counterparty_sectors = dict(sorted(exposure.items(), key=lambda x: -x[1])[:6])
        for cp in cps:
            if cp.share_pct is None or cp.share_pct < 10 or not cp.sector:
                continue
            other = ds.get(cp.id) if ds else None
            if not other:
                continue
            osector = domain.sector_for_okved(other.okved_code)
            role = "Ключевой покупатель" if cp.direction == "incoming" else "Ключевой поставщик"
            skey = f"cp:{cp.id}"
            sig.add_bank(
                skey,
                role,
                f"{cp.id}: {osector.name.lower()}, {fmt_pct(cp.share_pct, 0)}% {'входящих' if cp.direction == 'incoming' else 'исходящих'} платежей",
            )
            scale = min(1.0, cp.share_pct / 40.0) * 0.6
            for fid, w in sorted(osector.factors.items(), key=lambda x: -x[1])[:3]:
                acc.add(
                    fid,
                    w * scale,
                    FactorOrigin(origin="counterparty", label=role, value=f"{cp.id} ({osector.name})"),
                    skey,
                )
        if not cps:
            quality.append("Платежей с контрагентами в данных нет")
        elif in_total == 0:
            quality.append("Входящих платежей от компаний из датасета нет: покупатели неизвестны")

        # Группа компаний
        if company.group_id:
            members = ds.group_members.get(company.group_id, []) if ds else []
            if len(members) > 1:
                total = sum((ds.get(m).revenue or 0) for m in members if ds.get(m))
                msectors: dict[str, int] = {}
                for m in members:
                    if m == company_id:
                        continue
                    mc = ds.get(m)
                    if mc:
                        s = domain.sector_for_okved(mc.okved_code)
                        msectors[s.name] = msectors.get(s.name, 0) + 1
                top = [s for s, _ in sorted(msectors.items(), key=lambda x: -x[1])[:3]]
                prof.group = GroupInfo(
                    id=company.group_id, companies=len(members), total_revenue=int(total), sectors=top
                )
                sig.add_bank(
                    "group",
                    "Группа компаний",
                    f"{plural(len(members), ('компания', 'компании', 'компаний'))}; основные отрасли участников: {', '.join(top).lower()}",
                )
                # Группы из сотен компаний похожи на сегмент, а не на холдинг: их вклад уменьшаем.
                gw = 0.35 if len(members) <= 30 else 0.15
                for sname in top[:2]:
                    s = next((x for x in domain.sectors.values() if x.name == sname), None)
                    if not s or s.id == sector.id:
                        continue
                    for fid, w in sorted(s.factors.items(), key=lambda x: -x[1])[:2]:
                        acc.add(
                            fid,
                            w * gw,
                            FactorOrigin(origin="group", label="Группа компаний", value=sname),
                            "group",
                        )

        prof.linked_companies = ds.linked_companies(company_id) if ds else []
    else:
        quality.append("Компании нет в данных банка: профиль строится только по сведениям пользователей")

    # Сведения пользователей (только подтверждённые) — самый точный источник особенностей компании.
    for f in confirmed:
        key = sig.add_fact(f)
        low = normalize(f.statement)
        for fid in domain.find_factors(low):
            acc.add(
                fid,
                0.9,
                FactorOrigin(
                    origin="fact",
                    label=FACT_CATEGORY_LABELS.get(f.category, "Сведения"),
                    value=f.statement,
                    fact_id=f.id,
                ),
                key,
            )
        for c in find_countries(low):
            if c == "Евросоюз":
                continue
            cf = domain.currency_factor(c)
            acc.add(
                cf, 0.8, FactorOrigin(origin="fact", label="Страна из сведений", value=c, fact_id=f.id), key
            )
            acc.add(
                "customs_trade",
                0.5,
                FactorOrigin(origin="fact", label="Страна из сведений", value=c, fact_id=f.id),
                key,
            )
        if f.category == "finance" and any(w in low for w in ("плавающ", "ключев")):
            acc.add(
                "key_rate",
                1.0,
                FactorOrigin(origin="fact", label="Финансы", value=f.statement, fact_id=f.id),
                key,
            )

    if not company:
        joined = normalize(" ".join(text_parts))
        regions = find_regions(joined)
        if regions:
            prof.region = regions[0]
        sector = infer_sector_from_text(joined, domain)
        if sector:
            prof.sector_id, prof.sector = sector.id, sector.name
            for fid, w in sector.factors.items():
                acc.add(
                    fid,
                    w * 0.8,
                    FactorOrigin(origin="sector", label="Отрасль по описанию", value=sector.name),
                    "description",
                )
            sig.add_bank("description", "Отрасль по описанию компании", sector.name)

    factors, fsig = acc.build()
    prof.factors = factors
    prof.data_quality = quality
    return BuiltProfile(
        profile=prof, signals=sig, factor_signals=fsig, text_index=normalize(" ".join(text_parts))
    )


_SECTOR_HINTS: dict[str, list[str]] = {
    "housing_construction": ["застройщик", "жилой комплекс", "жилищн", "девелопер"],
    "civil_engineering": ["дорог", "мост", "инфраструктур", "инженерн сет"],
    "wholesale_agri": ["зерн", "пшениц", "подсолнечн", "элеватор"],
    "wholesale_fuel": ["бензин", "дизел", "топлив", "азс", "нефтепродукт"],
    "wholesale_beverages": ["напитк", "пиво", "вино", "алкогол"],
    "wholesale_metals": ["металлопрокат", "арматур", "металл"],
    "metallurgy": ["сталеплав", "металлургическ", "прокатн стан"],
    "retail": ["магазин", "розниц", "торговая сеть"],
    "road_transport": ["грузоперевоз", "автопарк", "перевозим груз"],
    "logistics": ["склад", "логистик", "фулфилмент"],
    "it_media": ["программн", "разработк по", "ит-", "софт"],
    "agriculture": ["выращива", "посев", "урожай", "агрохолдинг", "ферм"],
    "food_production": ["производим продукт", "мясокомбинат", "молочн завод", "пищев производ"],
    "pharma": ["лекарств", "фармацевт"],
    "energy": ["электростанц", "генерац", "энергосбыт"],
    "machinery": ["станк", "оборудован", "машиностро"],
    "auto_trade": ["автосалон", "дилер", "автомобил"],
    "hospitality": ["ресторан", "гостиниц", "отель", "кафе"],
    "real_estate_ops": ["аренд", "коммерческ недвижим", "торгов центр"],
}


def infer_sector_from_text(text_lower: str, domain: Domain):
    best, best_n = None, 0
    for sid, hints in _SECTOR_HINTS.items():
        n = sum(1 for h in hints if all(part in text_lower for part in h.split()))
        if n > best_n and sid in domain.sectors:
            best, best_n = domain.sectors[sid], n
    return best


def okved_class_of(profile: CompanyProfile) -> str | None:
    return okved_class(profile.okved.code) if profile.okved else None
