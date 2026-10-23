"""Схемы обмена данными.

Две группы:
- формы публичного API (api/insights, api/facts) — ML отдаёт содержимое вывода ровно в том виде,
  в каком бэкенд вернёт его фронтенду; бэкенд добавляет только id, status, createdAt/updatedAt и revisions;
- внутренние схемы ML: события, профиль компании, кандидаты отбора, трасса.

JSON в camelCase, время в UTC (ISO 8601).
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Topic = Literal["financing", "currency", "costs", "demand", "regulation", "logistics"]
TOPICS: tuple[str, ...] = ("financing", "currency", "costs", "demand", "regulation", "logistics")
InsightKind = Literal["risk", "opportunity"]
Urgency = Literal["urgent", "important", "info"]
EventStage = Literal["occurred", "discussed", "decided", "resolved"]
Relevance = Literal["direct", "possible"]
ImpactRole = Literal["event", "place", "asset", "supply", "counterparty", "market", "company"]
TraceStepKind = Literal["plan", "tool", "check", "conclusion"]
Position = Literal["owner", "ceo", "cfo", "accountant", "treasurer", "other"]
FactCategory = Literal["supplier", "customer", "site", "region", "product", "logistics", "finance", "other"]
FactStatus = Literal["pending", "confirmed", "rejected"]
BankProduct = Literal["settlement", "loan", "leasing", "guarantee", "deposit", "payroll", "factoring"]
ClaimType = Literal["fact", "bank", "model", "assumption"]


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")

    def dump(self, **kw: Any) -> dict[str, Any]:
        return self.model_dump(by_alias=True, exclude_none=True, mode="json", **kw)


# --- Формы публичного API (insights) -------------------------------------------------------------


class NewsSource(Schema):
    id: str
    title: str
    publisher: str
    url: str
    published_at: datetime


class InsightEvent(Schema):
    title: str
    stage: EventStage
    occurred_at: datetime | None = None
    place: str | None = None


class ImpactStep(Schema):
    label: str
    role: ImpactRole


class BankMaterial(Schema):
    id: str
    title: str
    published_at: datetime
    outdated: bool = False


class BankMaterialCitation(BankMaterial):
    page: int | None = None


class SupersededBankView(Schema):
    summary: str
    material: BankMaterialCitation


class BankView(Schema):
    summary: str
    material: BankMaterialCitation
    supersedes: SupersededBankView | None = None


class BankDataSignal(Schema):
    origin: Literal["bank_data"] = "bank_data"
    label: str
    value: str


class FactSignal(Schema):
    origin: Literal["fact"] = "fact"
    fact_id: str
    label: str
    value: str


ClientSignal = Annotated[BankDataSignal | FactSignal, Field(discriminator="origin")]


class TraceStep(Schema):
    kind: TraceStepKind
    title: str
    detail: str | None = None


class BankOffer(Schema):
    title: str
    description: str
    url: str


class InsightContent(Schema):
    """Содержимое вывода = InsightResponse без полей, которые ведёт бэкенд (id, status, createdAt,
    updatedAt, revisions). Плюс служебные поля ML: insightKey, eventId, score, traceId."""

    insight_key: str = Field(
        description="Стабильный ключ компания+событие: по нему бэкенд обновляет вывод, а не создаёт дубль"
    )
    event_id: str
    event_version: int = 1
    company_id: str
    kind: InsightKind
    urgency: Urgency
    relevance: Relevance
    topic: Topic
    title: str
    why_it_matters: str
    event: InsightEvent
    impact_path: list[ImpactStep]
    consequence: str
    basis: list[str]
    unknowns: list[str] = []
    checks: list[str] = []
    sources: list[NewsSource]
    bank_view: BankView | None = None
    signals: list[ClientSignal]
    trace: list[TraceStep]
    offer: BankOffer | None = None
    suggested_questions: list[str] = []
    # служебное
    score: float = 0.0
    trace_id: str | None = None
    generated_by: Literal["agent", "rules"] = "agent"
    revision_note: str | None = Field(
        default=None, description="Что изменилось относительно прошлой версии вывода"
    )


class CitationOut(Schema):
    kind: Literal["news", "bank", "client"]
    label: str
    url: str | None = None


class AnswerResponse(Schema):
    question: str
    answer: str
    citations: list[CitationOut] = []


# --- Сведения пользователей о компании (api/facts) -----------------------------------------------


class FactSourceRef(Schema):
    kind: Literal["text", "document", "link"]
    label: str


class UserFact(Schema):
    """Факт профиля, который бэкенд передаёт в ML. В аналитике используются только confirmed."""

    id: str
    category: FactCategory = "other"
    statement: str
    status: FactStatus = "confirmed"


class ExtractedFact(Schema):
    category: FactCategory
    statement: str
    source: FactSourceRef
    evidence: str = Field(description="Дословный фрагмент источника, из которого взят факт")
    negated: bool = False


# --- Новости и события ---------------------------------------------------------------------------


class Article(Schema):
    id: str
    url: str
    title: str
    text: str = ""
    publisher: str
    source_id: str
    published_at: datetime
    fetched_at: datetime
    content_hash: str
    lang: str = "ru"
    synthetic: bool = False


class ExtractedNumber(Schema):
    value: str
    unit: str | None = None
    what: str
    quote: str | None = None


class EventEntities(Schema):
    factors: list[str] = []
    sectors: list[str] = []
    okved_prefixes: list[str] = []
    regions: list[str] = []
    countries: list[str] = []
    currencies: list[str] = []
    commodities: list[str] = []
    organizations: list[str] = []
    numbers: list[ExtractedNumber] = []


class EventClaim(Schema):
    text: str
    type: Literal["fact", "forecast", "assumption", "quote"] = "fact"
    source_id: str | None = None


class Event(Schema):
    id: str
    version: int = 1
    title: str
    summary: str
    topic: Topic
    stage: EventStage
    occurred_at: datetime | None = None
    place: str | None = None
    entities: EventEntities = EventEntities()
    directions: dict[str, str] = Field(
        default_factory=dict, description="Фактор → направление: up/down/hold/tighten/ease"
    )
    claims: list[EventClaim] = []
    article_ids: list[str] = []
    source_ids: list[str] = Field(
        default_factory=list, description="Идентификаторы источников из config/sources.yaml"
    )
    sources: list[NewsSource] = []
    official: bool = False
    business_relevant: bool = True
    importance: float = 0.5
    extraction: Literal["llm", "rules"] = "rules"
    created_at: datetime
    updated_at: datetime


# --- Профиль компании ----------------------------------------------------------------------------


class FactorOrigin(Schema):
    origin: Literal["sector", "product", "foreign_trade", "fact", "counterparty", "group", "region", "scale"]
    label: str
    value: str
    fact_id: str | None = None


class SensitivityFactor(Schema):
    id: str
    label: str
    topic: Topic
    weight: float
    origins: list[FactorOrigin] = []


class Okved(Schema):
    code: str
    name: str


class IndustryPosition(Schema):
    okved_class: str
    peers: int
    rank: int
    share_pct: float
    basis: str = "Оценка по клиентской базе банка в датасете кейса, не доля рынка"


class CounterpartyOut(Schema):
    id: str
    direction: Literal["incoming", "outgoing"]
    amount: int
    payments: int
    industry: str | None = None
    sector: str | None = None
    share_pct: float | None = None


class GroupInfo(Schema):
    id: str
    companies: int
    total_revenue: int
    sectors: list[str] = []


class CompanyProfile(Schema):
    company_id: str
    origin: Literal["dataset", "user"]
    name: str | None = None
    okved: Okved | None = None
    sector_id: str | None = None
    sector: str | None = None
    region: str | None = None
    city: str | None = None
    revenue: int | None = None
    scale: str | None = None
    employees: str | None = None
    age_years: str | None = None
    stage: str | None = None
    ownership: str | None = None
    relationship: Literal["client", "prospect", "closed"] | None = None
    products: list[BankProduct] = []
    foreign_trade_countries: list[str] = []
    currencies: list[str] = []
    industry_position: IndustryPosition | None = None
    group: GroupInfo | None = None
    counterparties: list[CounterpartyOut] = []
    counterparty_sectors: dict[str, float] = {}
    linked_companies: list[str] = []
    facts: list[UserFact] = []
    factors: list[SensitivityFactor] = []
    data_quality: list[str] = []
    description: str | None = None


class CompanyContext(Schema):
    """Что бэкенд знает о компании помимо датасета: описание и сведения пользователей."""

    company_id: str
    name: str | None = None
    description: str | None = None
    facts: list[UserFact] = []


# --- Отбор ---------------------------------------------------------------------------------------


class MatchLink(Schema):
    kind: Literal[
        "factor", "sector", "region", "country", "currency", "counterparty", "group", "fact", "product"
    ]
    factor: str | None = None
    label: str
    value: str
    weight: float
    direct: bool = True
    fact_id: str | None = None


class Candidate(Schema):
    company_id: str
    event_id: str
    event_version: int = 1
    score: float
    relevance: Relevance
    urgency: Urgency
    topic: Topic
    kind_prior: InsightKind | None = None
    links: list[MatchLink]
    components: dict[str, float]
    reasons: list[str]


# --- Трасса --------------------------------------------------------------------------------------


class TraceEntry(Schema):
    at: datetime
    kind: Literal["plan", "tool", "llm", "check", "revise", "conclusion", "error"]
    name: str
    input: dict[str, Any] = {}
    output: dict[str, Any] = {}
    duration_ms: int = 0
    model: str | None = None
    prompt_version: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    cost_rub: float = 0.0


class TraceRecord(Schema):
    id: str
    kind: Literal["insight", "ask", "facts", "news"]
    company_id: str | None = None
    event_id: str | None = None
    started_at: datetime
    finished_at: datetime | None = None
    status: Literal["ok", "failed", "degraded"] = "ok"
    entries: list[TraceEntry] = []
    features_used: list[str] = []
    sources_used: list[str] = []
    checks: list[dict[str, Any]] = []
