"""Извлечение ключевой информации из новости: тема, стадия, факторы, место, страны, числа, утверждения.

Два слоя:
1. Правила (всегда, бесплатно, детерминированно) — словари факторов, регионов, стран и шаблоны стадий.
2. LLM (Gemma 4 / Qwen) по схеме NewsExtraction — уточняет тему, стадию, утверждения и числа.
   Ответ модели проверяется: факторы только из справочника, цитаты и числа должны быть в тексте.
   Если LLM недоступна или ответ не прошёл проверку, остаётся результат правил.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from radar_ml.domain import Domain, get_domain
from radar_ml.llm.gateway import LLMUnavailable, get_gateway
from radar_ml.llm.prompts import load_prompt
from radar_ml.nlp.geo import REGIONS, find_countries, find_currencies, find_regions, region_display
from radar_ml.nlp.text import normalize, numbers_in, sentences, truncate
from radar_ml.schemas import EventClaim, EventEntities, ExtractedNumber, Topic

log = logging.getLogger(__name__)

TOPIC_PRIORITY = ["financing", "currency", "regulation", "costs", "demand", "logistics"]

STAGE_PATTERNS: dict[str, list[str]] = {
    "decided": [
        r"принял\w* решени",
        r"\bутвердил",
        r"\bподписал",
        r"\bодобрил",
        r"\bпостановил",
        r"\bввел\w*\b",
        r"сохранил\w*.{0,30}ставк",
        r"(повысил|снизил)\w*.{0,30}ставк",
        r"закон\w* принят",
        r"\bрешил\w*",
        r"\bустановил\w*\b(?!.{0,15}официальн)",
        r"вступ\w* в силу",
        r"\bобнулил",
        r"\bограничил\b",
        r"\bзапретил\b",
        r"\bразрешил\b",
        r"\bприостановил\w*",
        r"\bпринял\w* (закон|пакет|постановлени)",
        # Решение органа власти: «Правительство повысило утильсбор». Установка курса ЦБ — не решение.
        r"(правительств|минфин|минпромторг|минэнерго|минсельхоз|госдум|кабмин|\bцб\b|банк\w* росси|фнс|фтс)\w*.{0,40}"
        r"\b(повысил|снизил|увеличил|сократил|продлил|ввел|отменил|обнулил)\w*\b(?! (его|ее|её) до)",
    ],
    "discussed": [
        r"\bпредлож\w*",
        r"законопроект",
        r"\bобсужда\w*",
        r"\bрассматрива\w*",
        r"\bпланиру\w*",
        r"\bнамерен\w*",
        r"проект\w* (постановлени|приказ|закон)",
        r"в первом чтении",
        r"\bинициатив\w*",
        r"не исключ\w*",
        r"\bмо(жет|гут) (быть|ввести|повысить|снизить|поднять|вырасти|запретить|ограничить)",
        r"\bдопуска\w*",
        r"\bпрорабатыва\w*",
        r"\bизуча\w* возможност",
        r"\b(сохранит|снизит|повысит|примет|введет|отменит|ужесточит|смягчит)\b",
        r"какое решение",
        r"\bбудет ли\b",
    ],
    "resolved": [
        r"\bотменил\w*",
        r"\bзавершил\w*",
        r"\bвозобновил\w*",
        r"\bснял\w* (ограничени|запрет)",
        r"\bурегулир\w*",
        r"\bвосстановлен\w*",
        r"\bпродлил\w*",
    ],
}
FORECAST = re.compile(
    r"\b(ожида\w*|прогноз\w*|может|могут|вероятн\w*|планиру\w*|по оценк\w*|предполага\w*|не исключ\w*)", re.I
)
QUOTE = re.compile(r"\b(заявил\w*|сообщил\w*|по словам|отметил\w*|считает)", re.I)
NOISE = re.compile(
    r"(монет\w* банка россии|памятн\w* монет|футбол|хоккей|чемпионат|концерт|фестивал|сериал|кинопрем|"
    r"гороскоп|погода на|прогноз погоды|\bдтп\b|криминал)",
    re.I,
)
# Регулирование самих банков (капитал, нормативы, лицензии) касается банковского сектора, а не клиентов в целом.
BANK_SECTOR = re.compile(
    r"(банк\w* смогут|коэффициент\w* риска|норматив\w* (достаточност|банк)|капитал\w* банк|экономить капитал|"
    r"отозван\w* лицензи|кредитн\w* организаци\w* (обязан|должн)|надбавк\w* к коэффициент)"
)
NUMBER_CTX = re.compile(
    r"(\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,]\d+)?\s*(%|процент\w*|п\.\s?п\.|б\.\s?п\.|руб\w*|₽|долл\w*|\$|евро|юан\w*|млрд|млн|трлн|тыс\.?|тонн\w*|т\b)",
    re.I,
)

SECTOR_KEYWORDS: dict[str, list[str]] = {
    "housing_construction": [r"застройщик", r"девелопер", r"жилищн\w* строител"],
    "civil_engineering": [
        r"дорожн\w* строител",
        r"строительств\w* (дорог|мост|трасс)",
        r"инфраструктурн\w* строител",
    ],
    "metallurgy": [r"металлург", r"сталевар", r"сталелитей"],
    "coal_mining": [r"угольщик", r"угольн\w* компани", r"угледобы"],
    "oil_gas": [r"нефтяник", r"нефтегазов", r"нефтедобы"],
    "agriculture": [r"аграри", r"сельхозпроизводител", r"фермер"],
    "wholesale_agri": [r"экспорт\w* зерн", r"зернотрейдер", r"экспортер\w* (зерн|пшениц)"],
    "retail": [r"ритейл", r"торгов\w* сет", r"розничн\w* сет"],
    "auto_trade": [r"автодилер", r"дилерск"],
    "automotive": [r"автопроизводител", r"автозавод", r"автоваз"],
    "pharma": [r"фармкомпани", r"фармпроизвод"],
    "wholesale_pharma": [r"фармдистрибьют", r"дистрибьютор\w* лекарств"],
    "wholesale_fuel": [r"нефтетрейдер", r"независим\w* (азс|сет\w* азс)", r"оптов\w* (продаж|рын)\w* топлив"],
    "wholesale_beverages": [r"производител\w* (пива|алкогол|напитк)", r"дистрибьютор\w* алкогол", r"пивовар"],
    "road_transport": [r"перевозчик", r"автоперевозчик", r"логистическ\w* компани"],
    "it_media": [r"ит-компани", r"разработчик\w* (по|программн)"],
    "energy": [r"энергокомпани", r"генерирующ\w* компани"],
    "finance": [r"\bбанк\w* (сектор|систем)", r"кредитн\w* организаци"],
}
_SECTOR_RX = {sid: re.compile("|".join(pats)) for sid, pats in SECTOR_KEYWORDS.items()}


def detect_stage(title_l: str, lead_l: str) -> str:
    """Стадия по заголовку, затем по лиду (первые два предложения). Глагол решения в глубине текста
    (например, «изменения, вступившие в силу») не делает публикацию статистики принятым решением."""
    for scope in (title_l, lead_l):
        hits = {st: sum(1 for p in pats if re.search(p, scope)) for st, pats in STAGE_PATTERNS.items()}
        if any(hits.values()):
            # Если одновременно «решение принято» и «обсуждается», решение важнее в заголовке.
            if hits["decided"] and (scope is title_l or hits["decided"] >= hits["discussed"]):
                return "decided"
            if hits["resolved"] and hits["resolved"] >= hits["discussed"]:
                return "resolved"
            if hits["discussed"]:
                return "discussed"
            return "decided" if hits["decided"] else "resolved"
    return "occurred"


def extract_numbers(text: str, limit: int = 8) -> list[ExtractedNumber]:
    out: list[ExtractedNumber] = []
    for sent in sentences(text):
        for m in NUMBER_CTX.finditer(sent):
            what = truncate(sent, 160)
            out.append(ExtractedNumber(value=m.group(0).strip(), unit=m.group(2), what=what, quote=what))
            if len(out) >= limit:
                return out
    return out


def classify_claims(text: str, limit: int = 6) -> list[EventClaim]:
    claims = []
    for s in sentences(text)[:limit]:
        t: Literal["fact", "forecast", "assumption", "quote"] = "fact"
        if FORECAST.search(s):
            t = "forecast"
        elif QUOTE.search(s):
            t = "quote"
        claims.append(EventClaim(text=truncate(s, 300), type=t))
    return claims


class RuleExtraction(BaseModel):
    topic: Topic
    stage: str
    factors: dict[str, float]
    entities: EventEntities
    directions: dict[str, str]
    claims: list[EventClaim]
    place: str | None
    business_relevant: bool
    importance: float


def rule_extract(
    title: str, text: str, official: bool = False, domain: Domain | None = None
) -> RuleExtraction:
    domain = domain or get_domain()
    tl, bl = normalize(title), normalize(text)
    full = f"{tl} {bl}"
    title_f = domain.find_factors(tl)
    body_f = domain.find_factors(bl)
    bank_internal = bool(BANK_SECTOR.search(tl))
    if bank_internal:
        body_f = {}
    scores: dict[str, float] = {}
    for fid in set(title_f) | set(body_f):
        scores[fid] = 3.0 * title_f.get(fid, 0) + body_f.get(fid, 0)
    # Слабые одиночные упоминания в длинном тексте — шум: оставляем факторы из заголовка или повторяющиеся.
    long_text = len(bl) > 600
    factors = {f: s for f, s in scores.items() if title_f.get(f) or s >= (2 if long_text else 1)}
    if factors:
        mx = max(factors.values())
        factors = {f: round(s / mx, 3) for f, s in sorted(factors.items(), key=lambda x: -x[1])}

    topic_scores: dict[str, float] = {}
    for fid, s in factors.items():
        t = domain.factors[fid].topic
        topic_scores[t] = topic_scores.get(t, 0) + s
    topic = (
        max(TOPIC_PRIORITY, key=lambda t: (topic_scores.get(t, 0), -TOPIC_PRIORITY.index(t)))
        if topic_scores
        else "demand"
    )

    regions = find_regions(full)
    countries = [c for c in find_countries(full)]
    currencies = find_currencies(full)
    sectors = [sid for sid, rx in _SECTOR_RX.items() if rx.search(full)]
    if bank_internal and "finance" not in sectors:
        sectors.append("finance")
    stage = detect_stage(tl, normalize(" ".join(sentences(text)[:2])))
    directions = domain.find_directions(bl, list(factors), title_lower=tl)
    numbers = extract_numbers(f"{title}. {text}")
    noise = bool(NOISE.search(full))
    relevant = bool(factors or sectors) and not noise
    place = None
    if regions:
        place = (
            region_display(regions[0])
            if len(regions) == 1
            else ", ".join(region_display(r) or r for r in regions[:3])
        )
    elif countries:
        place = ", ".join(countries[:3])
    importance = (
        0.2
        + (0.25 if official else 0)
        + min(0.3, 0.1 * len(factors))
        + (0.15 if numbers else 0)
        + (0.1 if title_f else 0)
    )
    return RuleExtraction(
        topic=topic,  # type: ignore[arg-type]
        stage=stage,
        factors=factors,
        entities=EventEntities(
            factors=list(factors),
            sectors=sectors,
            regions=regions,
            countries=countries,
            currencies=currencies,
            numbers=numbers,
        ),
        directions=directions,
        claims=classify_claims(text or title),
        place=place,
        business_relevant=relevant,
        importance=round(min(importance, 1.0), 3),
    )


# --------------------------------------------------------------------------- LLM


class _LLMNumber(BaseModel):
    value: str
    unit: str | None = None
    what: str
    quote: str | None = None


class _LLMClaim(BaseModel):
    text: str
    type: Literal["fact", "forecast", "assumption", "quote"] = "fact"


class NewsExtraction(BaseModel):
    business_relevant: bool = True
    topic: Topic
    stage: Literal["occurred", "discussed", "decided", "resolved"]
    title: str = Field(max_length=160)
    summary: str = Field(max_length=700)
    factors: list[str] = []
    directions: dict[str, str] = {}
    regions: list[str] = []
    countries: list[str] = []
    sectors: list[str] = []
    numbers: list[_LLMNumber] = []
    claims: list[_LLMClaim] = []


def _validate_llm(text_norm: str, domain: Domain):
    def check(data: dict[str, Any]) -> list[str]:
        problems = []
        bad_f = [f for f in data.get("factors", []) if f not in domain.factors]
        if bad_f:
            problems.append(f"неизвестные факторы {bad_f}; используй только id из списка")
        for n in data.get("numbers", []):
            if not (numbers_in(n.get("value", "")) & numbers_in(text_norm)):
                problems.append(f"числа {n.get('value')} нет в тексте новости")
        for c in data.get("claims", []):
            if c.get("type") == "fact" and numbers_in(c.get("text", "")) - numbers_in(text_norm):
                problems.append(f"в утверждении «{c.get('text', '')[:80]}» есть числа, которых нет в тексте")
        return problems

    return check


def llm_extract(
    title: str, text: str, published_at: datetime, rules: RuleExtraction, domain: Domain | None = None
) -> NewsExtraction | None:
    domain = domain or get_domain()
    gw = get_gateway()
    if not gw.available("news_extract"):
        return None
    prompt = load_prompt("news_extract")
    factors_ref = {fid: f"{f.label} ({f.topic})" for fid, f in domain.factors.items()}
    msgs = prompt.render(
        title=title,
        text=truncate(text, 6000),
        published_at=published_at.date().isoformat(),
        factors=factors_ref,
        sectors={sid: s.name for sid, s in domain.sectors.items()},
        rule_hint={"factors": list(rules.factors), "stage": rules.stage, "topic": rules.topic},
    )
    try:
        res = gw.complete_json(
            "news_extract",
            msgs,
            schema=NewsExtraction,
            prompt_version=prompt.version,
            validate=_validate_llm(normalize(f"{title} {text}"), domain),
        )
    except LLMUnavailable as e:
        log.info("news_extract llm failed, using rules: %s", e)
        return None
    return NewsExtraction.model_validate(res.data)


def merge_extraction(
    rules: RuleExtraction, llm: NewsExtraction | None, domain: Domain | None = None
) -> tuple[RuleExtraction, str | None, str | None]:
    """Итог: правила + проверенный ответ LLM. Возвращает (извлечение, заголовок, краткое содержание)."""
    if llm is None:
        return rules, None, None
    domain = domain or get_domain()
    factors = dict(rules.factors)
    llm_f = [f for f in llm.factors if f in domain.factors]
    if llm_f:
        # LLM отбрасывает ложные срабатывания словаря, но фактор из заголовка оставляем всегда.
        keep = {f: s for f, s in factors.items() if f in llm_f or s >= 0.99}
        for f in llm_f:
            keep.setdefault(f, 0.7)
        factors = keep
    regions = [r for r in llm.regions if r in REGIONS] or rules.entities.regions
    ent = rules.entities.model_copy(
        update={
            "factors": list(factors),
            "regions": regions,
            "countries": sorted(set(rules.entities.countries) | set(llm.countries)),
            "sectors": sorted(set(rules.entities.sectors) | {s for s in llm.sectors if s in domain.sectors}),
            "numbers": [ExtractedNumber(**n.model_dump()) for n in llm.numbers] or rules.entities.numbers,
        }
    )
    merged = rules.model_copy(
        update={
            "topic": llm.topic,
            "stage": llm.stage,
            "factors": factors,
            "entities": ent,
            "directions": {**rules.directions, **{k: v for k, v in llm.directions.items() if k in factors}},
            "claims": [EventClaim(text=c.text, type=c.type) for c in llm.claims] or rules.claims,
            "business_relevant": llm.business_relevant and bool(factors or ent.sectors),
        }
    )
    return merged, llm.title, llm.summary
