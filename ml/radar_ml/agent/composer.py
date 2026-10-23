"""Черновик вывода по правилам — когда модель недоступна (нет ключа, исчерпан лимит, сбой).

Шаблоны опираются только на контекст агента: факты события, признаки компании и позицию банка.
Вариант шаблона выбирается по фактору, направлению события и роли компании (импортёр/экспортёр,
покупатель/продавец товара). Такой вывод беднее, чем у модели, но честный: не выдумывает чисел
и помечается generated_by=rules.
"""

from __future__ import annotations

from radar_ml.agent.context import AgentContext
from radar_ml.agent.draft import DraftBasis, DraftStep, InsightDraft, normalize_title
from radar_ml.domain import get_domain
from radar_ml.matching.scorer import SELLERS
from radar_ml.nlp.text import truncate
from radar_ml.profile.builder import PRODUCT_LABELS

COMMODITY = {
    "oil",
    "fuel",
    "metals",
    "grain",
    "coal",
    "gold",
    "gas",
    "fertilizers",
    "construction_materials",
    "electricity",
}
DEMAND = {"consumer_demand", "real_estate", "auto_market", "business_activity", "state_spending"}
REGULATION = {
    "taxes",
    "excise_alcohol",
    "customs_trade",
    "sanctions",
    "pharma_regulation",
    "it_regulation",
    "payments_infra",
}
LOGISTICS = {"rail_logistics", "sea_logistics", "road_logistics"}
CURRENCY_NAME = {"fx_cny": "юанях", "fx_usd": "долларах", "fx_eur": "евро"}

Template = dict[str, object]


def _family(fid: str) -> str:
    if fid in ("key_rate", "credit_conditions", "bond_market"):
        return "rate"
    if fid.startswith("fx_"):
        return "fx"
    if fid in COMMODITY:
        return "commodity"
    if fid in DEMAND:
        return "demand"
    if fid in REGULATION:
        return "regulation"
    if fid in LOGISTICS:
        return "logistics"
    if fid == "inflation":
        return "inflation"
    if fid == "labor_market":
        return "labor"
    return "generic"


def _library(label: str, fid: str, products: str) -> dict[tuple[str, str, str], Template]:
    low = label.lower()
    cur = CURRENCY_NAME.get(fid, "валюте")
    return {
        ("rate", "risk", "any"): {
            "effect": "кредиты не подешевеют",
            "mechanism": f"стоимость долга по продуктам ({products or 'кредиты'}) зависит от ключевой ставки",
            "consequence": "Деньги остаются дорогими: процентные расходы по кредитам и лизингу в ближайшие месяцы не снизятся, "
            "а рефинансирование под более низкую ставку и новые заёмные инвестиции разумно отложить или пересчитать",
            "market": "Стоимость заёмных денег",
            "unknowns": ["Доля долга с плавающей ставкой и сроки ближайших погашений"],
            "checks": [
                "Пересчитать бюджет процентных расходов на ближайшие два квартала при текущей ставке",
                "Сравнить стоимость фиксации ставки с ожидаемой экономией от её снижения",
                "Проверить ковенанты по кредитам на соотношение долга и EBITDA",
            ],
            "questions": [
                "Когда банк ждёт снижения ставки?",
                "Стоит ли фиксировать ставку сейчас?",
                "Как это скажется на рефинансировании?",
            ],
        },
        ("rate", "opportunity", "any"): {
            "effect": "окно для пересмотра долга и депозитов",
            "mechanism": "решение по ставке меняет доходность свободных средств и стоимость кредитов компании",
            "consequence": "Изменение ставки открывает окно: можно пересмотреть условия по долгу или зафиксировать доходность "
            "свободных средств, пока ставки по депозитам высокие",
            "market": "Ставки по кредитам и депозитам",
            "unknowns": ["Объём свободных средств и график платежей по долгу"],
            "checks": [
                "Сравнить текущие ставки по долгу с рыночными",
                "Оценить объём свободной ликвидности для размещения",
            ],
            "questions": [
                "Что выгоднее: погасить долг или разместить средства?",
                "Когда банк ждёт изменения ставки?",
            ],
        },
        ("fx", "risk", "importer"): {
            "effect": f"расчёты в {cur} дорожают",
            "mechanism": f"компания ведёт внешнюю торговлю, часть закупок может оплачиваться в {cur}",
            "consequence": f"Закупки и платежи в {cur} в пересчёте на рубли подорожают; если цены продажи не пересматриваются "
            "так же быстро, маржа сократится, а бюджет закупок придётся пересчитать",
            "market": "Курс рубля к валюте расчётов",
            "unknowns": ["Доля закупок в валюте и сроки ближайших валютных платежей"],
            "checks": [
                "Собрать график валютных платежей на ближайшие полгода",
                "Сравнить стоимость форварда с бюджетным курсом",
            ],
            "questions": ["Как банк оценивает курс на конец года?", "Имеет ли смысл хеджировать платежи?"],
        },
        ("fx", "opportunity", "importer"): {
            "effect": f"импорт с расчётами в {cur} дешевеет",
            "mechanism": f"компания ведёт внешнюю торговлю, часть закупок может оплачиваться в {cur}",
            "consequence": f"Платежи в {cur} в пересчёте на рубли подешевеют: можно зафиксировать курс под ближайшие закупки "
            "и пересмотреть бюджет импорта, не рассчитывая, что укрепление рубля сохранится надолго",
            "market": "Курс рубля к валюте расчётов",
            "unknowns": ["Сроки ближайших валютных платежей и их объём"],
            "checks": [
                "Сверить график валютных платежей с текущим курсом",
                "Оценить, какую часть ближайших закупок стоит оплатить или захеджировать сейчас",
            ],
            "questions": [
                "Надолго ли укрепился рубль по оценке банка?",
                "Стоит ли зафиксировать курс сейчас?",
            ],
        },
        ("fx", "opportunity", "exporter"): {
            "effect": "валютная выручка растёт в рублях",
            "mechanism": "компания ведёт внешнюю торговлю и может получать выручку в валюте",
            "consequence": "Валютная выручка в пересчёте на рубли вырастет: можно улучшить маржу экспортных контрактов "
            "или зафиксировать выгодный курс на часть будущей выручки",
            "market": "Курс рубля",
            "unknowns": ["Доля выручки в валюте и сроки поступлений"],
            "checks": [
                "Оценить долю выручки в валюте на ближайший квартал",
                "Рассмотреть фиксацию курса на часть поступлений",
            ],
            "questions": [
                "Как банк оценивает курс на конец года?",
                "Стоит ли продавать валютную выручку сейчас?",
            ],
        },
        ("fx", "risk", "exporter"): {
            "effect": "валютная выручка дешевеет в рублях",
            "mechanism": "компания ведёт внешнюю торговлю и может получать выручку в валюте",
            "consequence": "Укрепление рубля снижает рублёвую стоимость валютной выручки: при затратах в рублях маржа экспортных "
            "контрактов сократится, если не пересмотреть цены или не зафиксировать курс",
            "market": "Курс рубля",
            "unknowns": ["Доля выручки в валюте и её сроки"],
            "checks": [
                "Пересчитать маржу экспортных контрактов при текущем курсе",
                "Рассмотреть фиксацию курса на часть будущей выручки",
            ],
            "questions": ["Надолго ли укрепился рубль по оценке банка?", "Как защитить экспортную маржу?"],
        },
        ("commodity", "risk", "buyer"): {
            "effect": f"дорожает: {low}",
            "mechanism": f"для отрасли компании «{low}» — заметная статья затрат",
            "consequence": f"Рост цен («{low}») увеличит себестоимость; если его не удастся переложить в цены продажи "
            "или зафиксировать в договорах с поставщиками, маржа снизится",
            "market": label,
            "unknowns": [f"Доля статьи «{low}» в себестоимости компании"],
            "checks": [
                "Пересчитать себестоимость при сохранении текущих цен на сырьё",
                "Проверить в договорах с поставщиками условия фиксации цены",
            ],
            "questions": ["Как банк оценивает цены на сырьё?", "Как защитить маржу?"],
        },
        ("commodity", "opportunity", "buyer"): {
            "effect": f"дешевеет: {low}",
            "mechanism": f"для отрасли компании «{low}» — заметная статья затрат",
            "consequence": f"Снижение цен или спроса («{low}») может удешевить закупки: стоит пересмотреть цены в договорах "
            "с поставщиками и сроки закупок, пока рынок на стороне покупателя",
            "market": label,
            "unknowns": [f"Доля статьи «{low}» в себестоимости и условия действующих договоров"],
            "checks": [
                "Запросить у поставщиков обновлённые цены",
                "Оценить экономию при закупке на текущих условиях",
            ],
            "questions": ["Надолго ли сохранится снижение цен?", "Стоит ли закупаться впрок?"],
        },
        ("commodity", "opportunity", "seller"): {
            "effect": f"растут цены: {low}",
            "mechanism": f"компания торгует продукцией, цена которой зависит от фактора «{low}»",
            "consequence": f"Рост цен («{low}») может поддержать выручку и маржу компании, если объёмы продаж сохранятся; "
            "вырастет и потребность в оборотных средствах",
            "market": label,
            "unknowns": ["Какая часть продаж идёт по фиксированным ценам"],
            "checks": [
                "Сверить цены в действующих контрактах с рыночными",
                "Оценить потребность в оборотных средствах при росте цен",
            ],
            "questions": ["Надолго ли сохранится рост цен?", "Как это отразится на оборотном капитале?"],
        },
        ("commodity", "risk", "seller"): {
            "effect": f"дешевеет продукция: {low}",
            "mechanism": f"выручка компании зависит от цен («{low}»)",
            "consequence": f"Снижение цен («{low}») давит на выручку и маржу: запасы, закупленные по прежним ценам, придётся "
            "продавать дешевле, а разница между ценой закупки и продажи может сузиться",
            "market": label,
            "unknowns": ["Объём запасов, закупленных по прежним ценам"],
            "checks": [
                "Оценить переоценку запасов по текущим ценам",
                "Сократить сроки между закупкой и продажей партий",
            ],
            "questions": ["Надолго ли снизились цены?", "Как ограничить потери на запасах?"],
        },
        ("demand", "risk", "any"): {
            "effect": "спрос может замедлиться",
            "mechanism": f"выручка компании зависит от фактора «{low}»",
            "consequence": "Покупатели могут сократить или отложить закупки: возможны давление на объёмы продаж, "
            "рост запасов и удлинение отсрочек платежа",
            "market": label,
            "unknowns": ["Динамика заказов ключевых покупателей в текущем квартале"],
            "checks": [
                "Сверить план продаж на квартал с динамикой заказов",
                "Проверить дебиторскую задолженность ключевых покупателей",
            ],
            "questions": ["Какие сегменты спроса пострадают сильнее?", "Как банк оценивает динамику спроса?"],
        },
        ("demand", "opportunity", "any"): {
            "effect": "спрос может вырасти",
            "mechanism": f"выручка компании зависит от фактора «{low}»",
            "consequence": "Рост спроса даёт возможность нарастить продажи; понадобятся оборотные средства на запасы и отсрочки покупателям",
            "market": label,
            "unknowns": ["Хватит ли мощностей и оборотных средств на рост объёмов"],
            "checks": [
                "Оценить потребность в оборотном капитале при росте продаж",
                "Проверить запасы и сроки поставок",
            ],
            "questions": ["Насколько устойчив рост спроса?", "Как профинансировать рост запасов?"],
        },
        ("regulation", "risk", "any"): {
            "effect": "меняются правила для бизнеса",
            "mechanism": f"деятельность компании затрагивает «{low}»",
            "consequence": "Новые требования могут увеличить издержки или потребовать изменить процессы, договоры и расчёты; "
            "важно заранее понять сроки и затронутые операции",
            "market": label,
            "unknowns": ["С какой даты начнут действовать изменения и какие операции они затронут"],
            "checks": [
                "Оценить, какие процессы и договоры затронут изменения",
                "Заложить дополнительные издержки в бюджет следующего года",
            ],
            "questions": [
                "С какого момента это начнёт действовать?",
                "Что нужно изменить в расчётах с контрагентами?",
            ],
        },
        ("regulation", "opportunity", "any"): {
            "effect": "правила для бизнеса смягчаются",
            "mechanism": f"деятельность компании затрагивает «{low}»",
            "consequence": "Смягчение требований может снизить издержки или открыть новые возможности в расчётах и поставках",
            "market": label,
            "unknowns": ["Какие условия нужно выполнить, чтобы воспользоваться изменениями"],
            "checks": ["Проверить, подпадает ли компания под новые условия", "Оценить экономию от изменений"],
            "questions": ["Какие условия нужно выполнить?", "Когда изменения вступят в силу?"],
        },
        ("logistics", "risk", "any"): {
            "effect": "поставки могут задержаться",
            "mechanism": f"цепочка поставок компании зависит от фактора «{low}»",
            "consequence": "Сроки и стоимость доставки могут вырасти: возможны задержки поставок и дополнительные расходы на логистику",
            "market": label,
            "unknowns": ["Через какие маршруты и пункты идут поставки компании"],
            "checks": [
                "Проверить альтернативные маршруты и перевозчиков",
                "Заложить запас по срокам в договорах поставки",
            ],
            "questions": ["Какие маршруты затронуты?", "Как сократить риск задержек?"],
        },
        ("inflation", "risk", "any"): {
            "effect": "издержки продолжат расти",
            "mechanism": "затраты компании и цены поставщиков зависят от общей инфляции",
            "consequence": "Инфляция поддерживает рост издержек и удерживает ставки высокими: стоит заложить индексацию закупочных цен "
            "и не рассчитывать на быстрое удешевление кредитов",
            "market": "Цены и ставки",
            "unknowns": ["Какая часть затрат индексируется вслед за инфляцией"],
            "checks": [
                "Обновить бюджет затрат с учётом индексации цен поставщиков",
                "Проверить, заложен ли рост издержек в цены продажи",
            ],
            "questions": ["Как банк оценивает инфляцию до конца года?", "Что это значит для ставок?"],
        },
        ("labor", "risk", "any"): {
            "effect": "дорожает персонал",
            "mechanism": "у компании большой штат и/или зарплатный проект",
            "consequence": "Напряжённый рынок труда поддерживает рост зарплат: фонд оплаты труда может вырасти быстрее выручки",
            "market": "Рынок труда",
            "unknowns": ["Доля фонда оплаты труда в затратах"],
            "checks": [
                "Обновить прогноз фонда оплаты труда",
                "Оценить возможности автоматизации на участках с дефицитом кадров",
            ],
            "questions": ["Как банк оценивает рынок труда?", "Сколько может вырасти фонд оплаты труда?"],
        },
    }


def _generic(label: str) -> Template:
    low = label.lower()
    return {
        "effect": "что это значит для компании",
        "mechanism": f"событие затрагивает фактор «{low}», к которому чувствителен бизнес компании",
        "consequence": f"Событие может изменить условия работы компании через фактор «{low}»; масштаб эффекта зависит от доли "
        "затронутых операций",
        "market": label,
        "unknowns": ["Какая доля операций компании затронута событием"],
        "checks": ["Оценить, какие операции компании затронет событие"],
        "questions": ["Что это значит для нашей компании?"],
    }


def pick_template(
    fid: str,
    kind: str,
    label: str,
    products: str,
    sector_id: str | None,
    trade_role: str,
    direction: str | None,
) -> Template:
    fam = _family(fid)
    lib = _library(label, fid, products)
    role = "any"
    if fam == "fx":
        role = "exporter" if trade_role == "exporter" else "importer"
    elif fam == "commodity":
        role = "seller" if (sector_id or "") in SELLERS.get(fid, set()) else "buyer"
    for key in ((fam, kind, role), (fam, kind, "any"), (fam, "risk", role), (fam, "risk", "any")):
        if key in lib:
            return lib[key]
    return _generic(label)


def compose(ctx: AgentContext) -> InsightDraft:
    domain = get_domain()
    ev = ctx.event
    cand = ctx.candidate
    top = next((ln for ln in (cand.links if cand else []) if ln.factor), None)
    fid = top.factor if top else (ev.entities.factors[0] if ev.entities.factors else "business_activity")
    factor = domain.factors.get(fid) or domain.factors["business_activity"]
    kind = (cand.kind_prior if cand else None) or "risk"
    prof = ctx.company.profile
    products = ", ".join(PRODUCT_LABELS[p] for p in prof.products if p != "settlement")
    sector = domain.sector_by_id(prof.sector_id)
    tpl = pick_template(
        fid, kind, factor.label, products, prof.sector_id, sector.trade_role, ev.directions.get(fid)
    )

    # Признаки компании, на которых строится вывод
    wanted: list[str] = list(ctx.company.factor_signals.get(fid, []))
    for ln in cand.links[1:3] if cand else []:
        if ln.factor:
            wanted += ctx.company.factor_signals.get(ln.factor, [])
        if ln.fact_id:
            wanted.append(f"fact:{ln.fact_id}")
    client = ctx.refs_of("client")
    by_key = {r.meta.get("key"): r for r in client}

    def priority(key: str) -> int:
        # Сначала сведения пользователей и продукты — они точнее всего описывают компанию; группа — в конце.
        order = (
            "fact:",
            "products",
            "foreign_trade",
            "cp:",
            "okved",
            "region",
            "position",
            "revenue",
            "employees",
            "group",
        )
        return next((i for i, p in enumerate(order) if key.startswith(p)), len(order))

    ordered = sorted(dict.fromkeys(wanted), key=priority)
    sig_refs = [by_key[k].id for k in ordered if k in by_key][:4]
    for r in client:
        if len(sig_refs) >= 2:
            break
        if r.id not in sig_refs:
            sig_refs.append(r.id)
    mech = str(tpl["mechanism"])
    why = f"{mech[:1].upper()}{mech[1:]}"
    extra = []
    for r in sig_refs[:3]:
        sig = ctx.refs[r].meta["signal"]
        if sig.value.lower() not in why.lower():
            extra.append(f"{sig.label[:1].lower()}{sig.label[1:]} — {truncate(sig.value, 90)}")
    if extra:
        why += ". Признаки компании: " + "; ".join(extra[:2])

    source_refs = [r.id for r in ctx.refs_of("source")]
    basis = []
    for c in ev.claims:
        if c.type == "fact" and len(basis) < 2:
            basis.append(DraftBasis(text=truncate(c.text, 300), refs=source_refs[:1]))
    if not basis:
        basis.append(DraftBasis(text=truncate(ev.title, 300), refs=source_refs[:1]))
    fact_refs = [r for r in client if r.meta.get("key", "").startswith("fact:") and r.id in sig_refs]
    if fact_refs:
        basis.append(
            DraftBasis(text=truncate(fact_refs[0].meta["signal"].value, 300), refs=[fact_refs[0].id])
        )

    path = [DraftStep(label=truncate(ev.title, 60), role="event")]
    if ev.place:
        path.append(DraftStep(label=truncate(ev.place, 60), role="place"))
    path.append(DraftStep(label=str(tpl["market"]), role="market"))
    if cand and any(ln.kind == "counterparty" for ln in cand.links):
        cp = next(ln for ln in cand.links if ln.kind == "counterparty")
        path.append(DraftStep(label=truncate(cp.label, 60), role="counterparty"))
    path.append(
        DraftStep(
            label=f"Клиент {prof.company_id}" if prof.origin == "dataset" else (prof.name or "Компания"),
            role="company",
        )
    )

    consequence = str(tpl["consequence"])
    cons_refs = list(sig_refs[:2])
    use_bank = ctx.bank_view is not None and not ctx.bank_view.material.outdated
    if use_bank:
        consequence += ". Прогноз банка по теме приведён в блоке позиции банка — по нему стоит сверить бюджет"
        cons_refs += [r.id for r in ctx.refs_of("bank_view")][:1]

    unknowns = list(tpl["unknowns"]) + [q for q in prof.data_quality if "ФТС" in q or "покупатели" in q][:1]
    effect = str(tpl["effect"])
    title = normalize_title(f"{effect[:1].upper()}{effect[1:]}: {ev.title}")
    return InsightDraft(
        kind=kind,  # type: ignore[arg-type]
        title=title,
        why_it_matters=why,
        why_refs=sig_refs[:3],
        impact_path=path[:6],
        consequence=consequence,
        consequence_refs=cons_refs,
        basis=basis,
        unknowns=unknowns[:3],
        checks=list(tpl["checks"])[:3],  # type: ignore[call-overload]
        signals=sig_refs[:5],
        use_bank_view=use_bank,
        suggested_questions=list(tpl["questions"])[:4],  # type: ignore[call-overload]
    )
