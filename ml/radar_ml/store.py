"""Состояние ML-сервиса в SQLite: статьи, события, материалы банка, кэш LLM, расход, трассы, выводы.

Одна база в volume — переживает перезапуск контейнера. Запись под блокировкой, запросы короткие.
Данные приложения (пользователи, статусы выводов, оценки) хранит бэкенд, не ML.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from collections.abc import Iterable
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

from radar_ml.settings import get_settings

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY, source_id TEXT, url TEXT, title TEXT, published_at TEXT, content_hash TEXT,
    event_id TEXT, data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS articles_hash ON articles(content_hash);
CREATE INDEX IF NOT EXISTS articles_url ON articles(url);
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, version INTEGER, topic TEXT, occurred_at TEXT, updated_at TEXT, data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bank_materials (id TEXT PRIMARY KEY, file TEXT, file_hash TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bank_chunks (id TEXT PRIMARY KEY, material_id TEXT, page INTEGER, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bank_positions (id TEXT PRIMARY KEY, material_id TEXT, indicator TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS llm_cache (key TEXT PRIMARY KEY, model TEXT, task TEXT, created_at TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS llm_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, day TEXT, task TEXT, model TEXT,
    tokens_in INTEGER, tokens_out INTEGER, cost_rub REAL, cached INTEGER, ok INTEGER
);
CREATE INDEX IF NOT EXISTS llm_usage_day ON llm_usage(day);
CREATE TABLE IF NOT EXISTS traces (id TEXT PRIMARY KEY, kind TEXT, company_id TEXT, event_id TEXT, started_at TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS insights (
    key TEXT PRIMARY KEY, company_id TEXT, event_id TEXT, event_version INTEGER, position TEXT,
    input_hash TEXT, created_at TEXT, data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS insights_company ON insights(company_id);
CREATE TABLE IF NOT EXISTS tool_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, trace_id TEXT, company_id TEXT, tool TEXT, args TEXT, ok INTEGER, ms INTEGER
);
"""


def utcnow() -> datetime:
    return datetime.now(UTC)


class Store:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(path), check_same_thread=False, isolation_level=None)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(SCHEMA)

    def execute(self, sql: str, params: Iterable[Any] = ()) -> sqlite3.Cursor:
        with self._lock:
            return self._conn.execute(sql, tuple(params))

    def query(self, sql: str, params: Iterable[Any] = ()) -> list[sqlite3.Row]:
        with self._lock:
            return self._conn.execute(sql, tuple(params)).fetchall()

    def put(self, table: str, row: dict[str, Any]) -> None:
        cols = ", ".join(row)
        qs = ", ".join("?" for _ in row)
        vals = [
            json.dumps(v, ensure_ascii=False, default=str) if isinstance(v, dict | list) else v
            for v in row.values()
        ]
        self.execute(f"INSERT OR REPLACE INTO {table} ({cols}) VALUES ({qs})", vals)

    def get_json(self, table: str, key_col: str, key: str) -> dict[str, Any] | None:
        rows = self.query(f"SELECT data FROM {table} WHERE {key_col} = ?", (key,))
        return json.loads(rows[0]["data"]) if rows else None

    def all_json(self, table: str, where: str = "", params: Iterable[Any] = ()) -> list[dict[str, Any]]:
        sql = f"SELECT data FROM {table}" + (f" WHERE {where}" if where else "")
        return [json.loads(r["data"]) for r in self.query(sql, params)]

    def log_tool_call(
        self, trace_id: str, company_id: str | None, tool: str, args: dict[str, Any], ok: bool, ms: int
    ) -> None:
        self.execute(
            "INSERT INTO tool_calls (at, trace_id, company_id, tool, args, ok, ms) VALUES (?,?,?,?,?,?,?)",
            (
                utcnow().isoformat(),
                trace_id,
                company_id,
                tool,
                json.dumps(args, ensure_ascii=False, default=str)[:2000],
                int(ok),
                ms,
            ),
        )


@lru_cache
def _store(path: str) -> Store:
    return Store(Path(path))


def get_store() -> Store:
    return _store(str(get_settings().db_path))
