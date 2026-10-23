"""Внутренние метрики AI-компонента по сохранённым выводам и трассам.

Дополняют метрики бэкенда (оценки пользователей, прочтения, вопросы — api/metrics): здесь то,
что видно только ML-сервису — самопроверка, адаптация, откаты на правила, стоимость и время.
"""

from __future__ import annotations

import json
import statistics
from datetime import UTC, datetime, timedelta
from typing import Any

from radar_ml.store import get_store


def ai_quality(days: int = 7) -> dict[str, Any]:
    st = get_store()
    since = (datetime.now(UTC) - timedelta(days=days)).isoformat()
    traces = [
        json.loads(r["data"])
        for r in st.query("SELECT data FROM traces WHERE kind = 'insight' AND started_at >= ?", (since,))
    ]
    asks = [
        json.loads(r["data"])
        for r in st.query("SELECT data FROM traces WHERE kind = 'ask' AND started_at >= ?", (since,))
    ]
    insights = [
        json.loads(r["data"]) for r in st.query("SELECT data FROM insights WHERE created_at >= ?", (since,))
    ]
    n = len(traces) or 1

    def dur(t: dict[str, Any]) -> float:
        if not t.get("finishedAt"):
            return 0.0
        return (
            datetime.fromisoformat(t["finishedAt"]) - datetime.fromisoformat(t["startedAt"])
        ).total_seconds()

    costs = [sum(e.get("costRub", 0) for e in t.get("entries", [])) for t in traces]
    first_pass = sum(1 for t in traces if t.get("checks") and not t["checks"][0].get("blocking"))
    revised = sum(1 for t in traces if any(e.get("name") == "insight_revise" for e in t.get("entries", [])))
    adapted = sum(1 for t in traces if any(e.get("name") == "adapt" for e in t.get("entries", [])))
    tool_calls = st.query(
        "SELECT tool, COUNT(*) n, SUM(1-ok) failed, AVG(ms) ms FROM tool_calls WHERE at >= ? GROUP BY tool",
        (since,),
    )
    return {
        "periodDays": days,
        "insights": len(insights),
        "agentRuns": len(traces),
        "byRules": sum(1 for i in insights if i.get("generatedBy") == "rules"),
        "degradedRuns": sum(1 for t in traces if t.get("status") == "degraded"),
        "firstCheckPassRate": round(first_pass / n, 3),
        "revisedRate": round(revised / n, 3),
        "adaptedRate": round(adapted / n, 3),
        "withBankView": sum(1 for i in insights if i.get("bankView")),
        "withTwoSignals": sum(1 for i in insights if len(i.get("signals", [])) >= 2),
        "withChecks": sum(1 for i in insights if i.get("checks")),
        "avgCostRub": round(statistics.mean(costs), 3) if costs else 0.0,
        "p50Seconds": round(statistics.median([dur(t) for t in traces]), 1) if traces else 0.0,
        "asks": len(asks),
        "askRefusals": sum(1 for t in asks if any(e.get("name") == "refused" for e in t.get("entries", []))),
        "toolCalls": [
            {"tool": r["tool"], "calls": r["n"], "failed": r["failed"], "avgMs": round(r["ms"] or 0)}
            for r in tool_calls
        ],
    }
