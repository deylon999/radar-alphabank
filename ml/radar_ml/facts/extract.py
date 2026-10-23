"""Извлечение сведений о компании из описания, страниц по ссылкам и документов.

Факт — утверждение о компании, которое пользователь потом подтверждает или отклоняет; в аналитике
используются только подтверждённые. Правила извлечения:
- только то, что сообщено о самой компании; ассортимент и склады поставщика с его сайта не переносятся на клиента;
- отрицания и условия сохраняются («склад не пострадал» не превращается в «склад пострадал»);
- у каждого факта есть дословное основание (evidence) из источника — иначе факт отбрасывается;
- факты, которые у компании уже есть в любом статусе (в том числе отклонённые), повторно не добавляются.
"""

from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass
from typing import Any, Literal

from pydantic import BaseModel, Field

from radar_ml.llm.gateway import LLMUnavailable, get_gateway
from radar_ml.llm.prompts import load_prompt
from radar_ml.nlp.text import normalize, sentences, tokens, truncate
from radar_ml.schemas import ExtractedFact, FactCategory, FactSourceRef

log = logging.getLogger(__name__)

MAX_DOC_CHARS = 40_000

CATEGORY_RULES: list[tuple[FactCategory, re.Pattern[str]]] = [
    (
        "supplier",
        re.compile(r"(закупа|поставщик|поставля\w* нам|импортир|покупаем у|сырь[её] (получаем|берём|берем))"),
    ),
    (
        "customer",
        re.compile(
            r"(продаём|продаем|покупател|клиент\w* (—|-|это|наш)|экспорт|отгружа|заказчик|госконтракт|выручк)"
        ),
    ),
    ("site", re.compile(r"(склад|завод|площадк|производств\w* (в|под)|цех|элеватор|офис|база в|терминал)")),
    ("logistics", re.compile(r"(доставк|перевоз|логистик|железн\w* дорог|порт|маршрут|фур|вагон|контейнер)")),
    (
        "finance",
        re.compile(
            r"(кредит|лизинг|ставк|облигац|долг|займ|депозит|валют|хедж|ковенант|проектн\w* финансир)"
        ),
    ),
    ("region", re.compile(r"(регион|област|кра[йя]\b|республик|работаем в|присутств)")),
    ("product", re.compile(r"(производим|выпускаем|продукци|ассортимент|товар|услуг)")),
]
NEGATION = re.compile(r"\b(не|нет|без|никогда|отказались)\b")
ABOUT_US = re.compile(r"\b(мы|наш\w*|компания|у нас|собственн\w*)\b")
# Утверждение о стороннем участнике: склады и ассортимент поставщика не переносятся на компанию.
THIRD_PARTY = re.compile(
    r"(поставщик|партн[её]р|контрагент|покупател)\w*\s+(\S+\s+){0,4}(имеет|располагает|владеет|открыл|работает)"
)


class _LLMFact(BaseModel):
    category: FactCategory
    statement: str = Field(min_length=5, max_length=1000)
    evidence: str = Field(min_length=5)
    negated: bool = False
    source_index: int = Field(default=0, alias="sourceIndex")

    model_config = {"populate_by_name": True}


class _LLMFacts(BaseModel):
    facts: list[_LLMFact] = []
    unknown_fields: list[str] = Field(default=[], alias="unknownFields")

    model_config = {"populate_by_name": True}


@dataclass
class SourceText:
    kind: Literal["text", "document", "link"]
    label: str
    text: str
    incomplete: bool = False


def document_text(filename: str, data: bytes) -> SourceText:
    """Текст из PDF, DOCX или TXT. Тип определяется по содержимому, а не только по расширению."""
    head = data[:8]
    text = ""
    incomplete = False
    if head.startswith(b"%PDF"):
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        pages = reader.pages
        if len(pages) > 40:
            incomplete = True
        text = "\n".join((p.extract_text() or "") for p in list(pages)[:40])
    elif head.startswith(b"PK"):
        import docx

        d = docx.Document(io.BytesIO(data))
        parts = [p.text for p in d.paragraphs]
        for t in d.tables:
            for row in t.rows:
                parts.append(" | ".join(c.text for c in row.cells))
        text = "\n".join(parts)
    else:
        for enc in ("utf-8", "cp1251"):
            try:
                text = data.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("не удалось прочитать файл: допустимы PDF, DOCX и TXT")
        if "\x00" in text:
            raise ValueError("не удалось прочитать файл: допустимы PDF, DOCX и TXT")
    if len(text) > MAX_DOC_CHARS:
        text, incomplete = text[:MAX_DOC_CHARS], True
    return SourceText(kind="document", label=filename, text=text, incomplete=incomplete)


def _similar(a: str, b: str) -> bool:
    ta, tb = set(tokens(a)), set(tokens(b))
    if not ta or not tb:
        return normalize(a) == normalize(b)
    return len(ta & tb) / len(ta | tb) >= 0.75


def _evidence_ok(evidence: str, text: str) -> bool:
    e, t = normalize(evidence), normalize(text)
    if e in t:
        return True
    te = set(tokens(e))
    return bool(te) and len(te & set(tokens(t))) / len(te) >= 0.85


def rule_facts(src: SourceText, limit: int = 12) -> list[ExtractedFact]:
    out = []
    for s in sentences(src.text):
        sl = normalize(s)
        if len(sl) < 20 or len(sl) > 600:
            continue
        # Ссылка на чужой сайт: берём только то, что говорится о «нас»/компании, а не всё подряд.
        if src.kind == "link" and not ABOUT_US.search(sl):
            continue
        third_party = bool(THIRD_PARTY.search(sl))
        if third_party and src.kind == "link":
            continue
        cat = next((c for c, rx in CATEGORY_RULES if rx.search(sl)), None)
        if third_party:
            cat = "supplier" if "поставщик" in sl else "customer" if "покупател" in sl else "other"
        if not cat:
            continue
        out.append(
            ExtractedFact(
                category=cat,
                statement=truncate(s, 1000),
                source=FactSourceRef(kind=src.kind, label=src.label),
                evidence=truncate(s, 600),
                negated=bool(NEGATION.search(sl)),
            )
        )
        if len(out) >= limit:
            break
    return out


def extract_facts(
    sources: list[SourceText], existing: list[str], company_hint: str | None = None
) -> dict[str, Any]:
    gw = get_gateway()
    facts: list[ExtractedFact] = []
    method = "rules"
    unknown: list[str] = []
    if gw.available("facts_extract"):
        prompt = load_prompt("facts_extract")
        payload = [
            {"index": i, "kind": s.kind, "label": s.label, "text": truncate(s.text, 9000)}
            for i, s in enumerate(sources)
        ]

        def validate(data: dict[str, Any]) -> list[str]:
            probs = []
            for f in data.get("facts", []):
                i = f.get("sourceIndex", 0)
                if not 0 <= i < len(sources):
                    probs.append(f"sourceIndex {i} вне списка источников")
                elif not _evidence_ok(f.get("evidence", ""), sources[i].text):
                    probs.append(f"основания «{f.get('evidence', '')[:60]}» нет в источнике {i}")
            return probs

        try:
            res = gw.complete_json(
                "facts_extract",
                prompt.render(sources=payload, company=company_hint or ""),
                schema=_LLMFacts,
                prompt_version=prompt.version,
                validate=validate,
            )
            data = _LLMFacts.model_validate(res.data)
            for f in data.facts:
                src = sources[f.source_index]
                facts.append(
                    ExtractedFact(
                        category=f.category,
                        statement=f.statement.strip(),
                        source=FactSourceRef(kind=src.kind, label=src.label),
                        evidence=f.evidence,
                        negated=f.negated,
                    )
                )
            unknown = data.unknown_fields
            method = "llm"
        except LLMUnavailable as e:
            log.info("facts_extract llm failed, rules fallback: %s", e)
    if method == "rules":
        for s in sources:
            facts += rule_facts(s)

    # Без повторов: ни между собой, ни с уже известными фактами (в любом статусе)
    out: list[ExtractedFact] = []
    for f in facts:
        if any(_similar(f.statement, e) for e in existing) or any(
            _similar(f.statement, o.statement) for o in out
        ):
            continue
        out.append(f)
    if not unknown:
        cats = {f.category for f in out}
        hints = {
            "supplier": "ключевые поставщики",
            "customer": "основные покупатели",
            "site": "площадки и склады",
            "finance": "условия кредитов (фиксированная или плавающая ставка)",
        }
        unknown = [v for k, v in hints.items() if k not in cats]
    return {
        "facts": [f.dump() for f in out],
        "incompleteSources": [{"kind": s.kind, "label": s.label} for s in sources if s.incomplete],
        "unknownFields": unknown,
        "method": method,
    }
