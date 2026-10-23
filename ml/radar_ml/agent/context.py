"""Общий контекст агента и трасса.

Каждый результат инструмента попадает в контекст под коротким идентификатором-ссылкой:
S* — новости-источники, C* — признаки компании, B* — фрагменты материалов банка,
BV — позиция банка, E* — связанные события. Модель ссылается на эти идентификаторы,
а проверка сверяет, что ссылки существуют и что числа в выводе есть в источниках.
"""

from __future__ import annotations

import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from radar_ml.profile.builder import BuiltProfile
from radar_ml.schemas import (
    BankDataSignal,
    BankView,
    Candidate,
    Event,
    FactSignal,
    TraceEntry,
    TraceRecord,
    TraceStep,
)
from radar_ml.store import Store


@dataclass
class Ref:
    id: str
    kind: str  # source | client | bank | bank_view | event
    label: str
    text: str
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentContext:
    company: BuiltProfile
    event: Event
    candidate: Candidate | None
    position: str | None
    now: datetime
    refs: dict[str, Ref] = field(default_factory=dict)
    bank_view: BankView | None = None
    tools_called: list[str] = field(default_factory=list)
    user_steps: list[TraceStep] = field(default_factory=list)
    notes: dict[str, Any] = field(default_factory=dict)
    on_step: Callable[[TraceStep], None] | None = None

    def step(self, kind: str, title: str, detail: str | None = None) -> TraceStep:
        """Шаг, который видит пользователь: настоящий шаг агента в момент выполнения."""
        st = TraceStep(kind=kind, title=title, detail=detail)  # type: ignore[arg-type]
        self.user_steps.append(st)
        if self.on_step:
            self.on_step(st)
        return st

    def add_ref(self, prefix: str, kind: str, label: str, text: str, **meta: Any) -> Ref:
        for r in self.refs.values():
            if r.kind == kind and r.label == label and r.text == text:
                return r
        n = sum(1 for k in self.refs if k.startswith(prefix) and k[len(prefix) :].isdigit()) + 1
        ref = Ref(f"{prefix}{n}", kind, label, text, meta)
        self.refs[ref.id] = ref
        return ref

    def refs_of(self, kind: str) -> list[Ref]:
        return [r for r in self.refs.values() if r.kind == kind]

    def client_signal(self, ref_id: str) -> BankDataSignal | FactSignal | None:
        r = self.refs.get(ref_id)
        if not r or r.kind != "client":
            return None
        return r.meta.get("signal")

    def grounding_text(self) -> str:
        """Весь текст, на который можно опереться: для проверки чисел в выводе."""
        parts = [self.event.title, self.event.summary]
        parts += [c.text for c in self.event.claims]
        parts += [n.value + " " + (n.what or "") for n in self.event.entities.numbers]
        parts += [r.text for r in self.refs.values()]
        if self.bank_view:
            parts.append(self.bank_view.summary)
        return " ".join(parts)


class Tracer:
    """Полная внутренняя трасса (для экспертов и администраторов) — без ключей и секретов."""

    def __init__(self, kind: str, company_id: str | None, event_id: str | None, store: Store | None = None):
        self.record = TraceRecord(
            id=str(uuid.uuid4()),
            kind=kind,
            company_id=company_id,
            event_id=event_id,
            started_at=datetime.now(UTC),  # type: ignore[arg-type]
        )
        self.store = store
        self._t = time.monotonic()

    def add(
        self,
        kind: str,
        name: str,
        input: dict[str, Any] | None = None,
        output: dict[str, Any] | None = None,
        ms: int = 0,
        **llm: Any,
    ) -> TraceEntry:
        e = TraceEntry(
            at=datetime.now(UTC),
            kind=kind,
            name=name,
            input=input or {},
            output=output or {},
            duration_ms=ms,  # type: ignore[arg-type]
            model=llm.get("model"),
            prompt_version=llm.get("prompt_version"),
            tokens_in=llm.get("tokens_in", 0),
            tokens_out=llm.get("tokens_out", 0),
            cost_rub=llm.get("cost_rub", 0.0),
        )
        self.record.entries.append(e)
        return e

    def finish(self, status: str = "ok") -> TraceRecord:
        self.record.finished_at = datetime.now(UTC)
        self.record.status = status  # type: ignore[assignment]
        if self.store:
            self.store.put(
                "traces",
                {
                    "id": self.record.id,
                    "kind": self.record.kind,
                    "company_id": self.record.company_id,
                    "event_id": self.record.event_id,
                    "started_at": self.record.started_at.isoformat(),
                    "data": self.record.dump(),
                },
            )
        return self.record

    @property
    def tokens(self) -> int:
        return sum(e.tokens_in + e.tokens_out for e in self.record.entries)

    @property
    def cost(self) -> float:
        return sum(e.cost_rub for e in self.record.entries)
