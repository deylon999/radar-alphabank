"""Общие фикстуры: синтетический датасет, отдельная база состояния, заглушки LLM вместо сети.

Тесты не тратят лимит модели и не ходят в интернет.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = Path(__file__).resolve().parent / "fixtures"
sys.path.insert(0, str(ROOT))


def _clear_caches() -> None:
    from radar_ml import domain, settings, store
    from radar_ml.bank import service as bank
    from radar_ml.data import dataset
    from radar_ml.llm import gateway, prompts
    from radar_ml.news import service as news

    for fn in (
        settings.get_settings,
        domain.get_domain,
        dataset._dataset_singleton,
        store._store,
        news._service,
        bank._service,
        gateway._gateway,
        prompts.load_prompt,
    ):
        fn.cache_clear()


@pytest.fixture()
def env(tmp_path, monkeypatch):
    monkeypatch.setenv("RADAR_ML_DATA_DIR", str(FIXTURES / "data"))
    monkeypatch.setenv("RADAR_ML_STATE_DIR", str(tmp_path / "state"))
    monkeypatch.setenv("RADAR_ML_MATERIALS_DIR", str(tmp_path / "materials"))
    monkeypatch.setenv("RADAR_ML_LLM_MODE", "stub")
    monkeypatch.setenv("RADAR_ML_REFERENCE_TIME", "2026-10-23T18:00:00+03:00")
    monkeypatch.setenv("RADAR_ML_SNAPSHOT_PATH", str(FIXTURES / "news.jsonl"))
    monkeypatch.setenv("RADAR_ML_INTERNAL_TOKEN", "")
    _clear_caches()
    yield tmp_path
    _clear_caches()


@pytest.fixture()
def gw(env):
    from radar_ml.llm.gateway import get_gateway

    g = get_gateway()
    g.clear_stubs()
    return g


@pytest.fixture()
def news(env):
    from radar_ml.news.service import get_news

    n = get_news()
    n.load_snapshot(FIXTURES / "news.jsonl")
    return n


RATE_PAGE_NEW = (
    "Ключевая ставка ЦБ РФ: ставка без изменения на 14,0%, риторика стала жестче. 11 сентября 2026 г. "
    "Банк России сохранил ключевую ставку на уровне 14,0%. "
    "Мы ожидаем сохранения ключевой ставки на уровне 14,0% до конца 2026 года, а к концу 2027 года прогнозируем 12%. "
    "Инфляционные риски остаются повышенными."
)
RATE_PAGE_OLD = (
    "Макростатистика 1П26: слабый рост 1П26 смещает прогноз роста ВВП на 0,1% за год. 31 июля 2026 г. "
    "Рост ВВП в первом полугодии замедлился. "
    "Мы ожидаем ключевую ставку 13,5% на конец 2026 года. "
    "Прогноз роста ВВП на 2026 год понижен на 0,1 п.п."
)


@pytest.fixture()
def bank(env):
    from radar_ml.bank.service import get_bank

    b = get_bank()
    b.ingest_pages("policy_rate.pdf", [RATE_PAGE_NEW], use_llm=False)
    b.ingest_pages("macro_1h26.pdf", [RATE_PAGE_OLD], use_llm=False)
    return b


def pytest_configure(config):  # noqa: ARG001
    os.environ.setdefault("RADAR_ML_LLM_MODE", "stub")
