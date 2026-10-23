"""Прогон эталонного набора: качество отбора и (по желанию) качество выводов агента.

    python -m radar_ml.eval.run --golden eval/golden_demo.yaml            # отбор, без LLM
    python -m radar_ml.eval.run --golden eval/golden_demo.yaml --generate # плюс выводы агента (тратит лимит)

Метрики отбора: точность класса связи (direct/possible/none), доля пропущенных прямых событий,
ложные «Главное», точность вида (риск/возможность), темы. Метрики выводов: доля прошедших самопроверку
с первой попытки, доля выводов модели (а не правил), признаки компании ≥ 2, позиция банка, стоимость и время.
Результат — JSON и markdown-отчёт; при изменении промптов, моделей или правил сравниваются версии.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import yaml


def _norm_expected(v: Any) -> set[str]:
    if isinstance(v, list):
        return set(v)
    return {v}


def run(golden_path: Path, generate: bool = False, snapshot: Path | None = None) -> dict[str, Any]:
    golden = yaml.safe_load(golden_path.read_text(encoding="utf-8"))
    if golden.get("reference_time"):
        os.environ["RADAR_ML_REFERENCE_TIME"] = golden["reference_time"]
    from radar_ml.settings import get_settings

    get_settings.cache_clear()
    from radar_ml.llm.prompts import load_prompt
    from radar_ml.news.service import get_news
    from radar_ml.pipeline import candidates_for, generate_insight
    from radar_ml.store import get_store

    news = get_news()
    if not news.events:
        news.load_snapshot(snapshot or get_settings().snapshot_path)

    cache: dict[str, Any] = {}
    rows = []
    for case in golden["cases"]:
        cid = case["company"]
        if cid not in cache:
            bp, cands = candidates_for(cid, None, None, limit=200)
            cache[cid] = (bp, cands)
        bp, cands = cache[cid]
        ev = next(
            (e for e in news.list(relevant_only=False) if case["event"].lower() in e.title.lower()), None
        )
        if ev is None:
            rows.append({**case, "status": "event-missing"})
            continue
        cand = next((c for c in cands if c.event_id == ev.id), None)
        got_rel = cand.relevance if cand else "none"
        exp_rel = _norm_expected(case["relevance"])
        row: dict[str, Any] = {
            "company": cid,
            "event": ev.title[:80],
            "expectedRelevance": sorted(exp_rel),
            "relevance": got_rel,
            "relevanceOk": got_rel in exp_rel,
            "score": cand.score if cand else 0.0,
        }
        if case.get("kind") and case["kind"] != "any" and cand:
            row["expectedKind"] = case["kind"]
            row["kindPrior"] = cand.kind_prior
        if case.get("topic") and cand:
            row["topicOk"] = cand.topic == case["topic"]
        if generate and cand:
            t0 = time.monotonic()
            ins = generate_insight(cid, ev.id, None, bp=bp, candidate=cand, force=True)
            tr = get_store().get_json("traces", "id", ins.trace_id) or {}
            checks = tr.get("checks", [])
            row.update(
                {
                    "kind": ins.kind,
                    "kindOk": case.get("kind", "any") in ("any", ins.kind),
                    "generatedBy": ins.generated_by,
                    "firstCheckPassed": bool(checks) and not checks[0].get("blocking"),
                    "signals": len(ins.signals),
                    "bankView": ins.bank_view is not None,
                    "costRub": round(sum(e.get("costRub", 0) for e in tr.get("entries", [])), 3),
                    "seconds": round(time.monotonic() - t0, 1),
                    "title": ins.title,
                }
            )
        rows.append(row)

    scored = [r for r in rows if "relevanceOk" in r]
    n = len(scored) or 1
    direct_expected = [r for r in scored if r["expectedRelevance"] == ["direct"]]
    none_expected = [r for r in scored if r["expectedRelevance"] == ["none"]]
    kind_rows = [r for r in scored if "expectedKind" in r]
    summary: dict[str, Any] = {
        "cases": len(rows),
        "relevanceAccuracy": round(sum(r["relevanceOk"] for r in scored) / n, 3),
        "missedDirect": sum(1 for r in direct_expected if r["relevance"] == "none"),
        "falseDirect": sum(1 for r in none_expected if r["relevance"] == "direct"),
        "falseAny": sum(1 for r in none_expected if r["relevance"] != "none"),
        "kindPriorAccuracy": round(
            sum(r.get("kindPrior") == r["expectedKind"] for r in kind_rows) / len(kind_rows), 3
        )
        if kind_rows
        else None,
        "topicAccuracy": round(
            sum(r["topicOk"] for r in scored if "topicOk" in r) / max(1, sum("topicOk" in r for r in scored)),
            3,
        ),
        "eventsMissing": sum(1 for r in rows if r.get("status") == "event-missing"),
        "prompts": {p: load_prompt(p).version for p in ("insight_plan", "insight_draft", "insight_critic")},
    }
    gen = [r for r in scored if "generatedBy" in r]
    if gen:
        g = len(gen)
        summary.update(
            {
                "generated": g,
                "agentShare": round(sum(r["generatedBy"] == "agent" for r in gen) / g, 3),
                "firstCheckPassRate": round(sum(r["firstCheckPassed"] for r in gen) / g, 3),
                "signals2Rate": round(sum(r["signals"] >= 2 for r in gen) / g, 3),
                "bankViewRate": round(sum(r["bankView"] for r in gen) / g, 3),
                "kindAccuracy": round(sum(r["kindOk"] for r in gen) / g, 3),
                "avgCostRub": round(sum(r["costRub"] for r in gen) / g, 3),
                "avgSeconds": round(sum(r["seconds"] for r in gen) / g, 1),
            }
        )
    return {"summary": summary, "rows": rows}


def to_markdown(res: dict[str, Any]) -> str:
    s = res["summary"]
    lines = ["# Прогон эталонного набора", "", "| Метрика | Значение |", "|---|---|"]
    lines += [f"| {k} | {v} |" for k, v in s.items() if k != "prompts"]
    lines += ["", "| Компания | Событие | Ожидалось | Получено | Ок |", "|---|---|---|---|---|"]
    for r in res["rows"]:
        if "relevanceOk" not in r:
            lines.append(f"| {r['company']} | {r['event']} | — | событие не найдено | — |")
            continue
        lines.append(
            f"| {r['company']} | {r['event']} | {'/'.join(r['expectedRelevance'])} | {r['relevance']} | {'✓' if r['relevanceOk'] else '✗'} |"
        )
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--golden", type=Path, default=Path("eval/golden_demo.yaml"))
    ap.add_argument("--generate", action="store_true")
    ap.add_argument("--out", type=Path, default=None)
    ap.add_argument("--min-accuracy", type=float, default=0.0)
    a = ap.parse_args(argv)
    res = run(a.golden, generate=a.generate)
    print(json.dumps(res["summary"], ensure_ascii=False, indent=1))
    if a.out:
        a.out.mkdir(parents=True, exist_ok=True)
        (a.out / "eval.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
        (a.out / "eval.md").write_text(to_markdown(res), encoding="utf-8")
    return 0 if res["summary"]["relevanceAccuracy"] >= a.min_accuracy else 1


if __name__ == "__main__":
    sys.exit(main())
