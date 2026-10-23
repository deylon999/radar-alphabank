"""Настройки сервиса. Всё, что не бизнес-логика, задаётся переменными окружения RADAR_ML_*."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ML_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RADAR_ML_", env_file=".env", extra="ignore")

    # Данные кейса (CSV) и материалы банка (PDF). В репозиторий не коммитятся.
    data_dir: Path = ML_ROOT / "data" / "raw"
    materials_dir: Path = ML_ROOT / "data" / "materials"
    # Состояние сервиса: SQLite с новостями, событиями, индексом, кэшем LLM и трассами.
    state_dir: Path = ML_ROOT / "data" / "state"
    config_dir: Path = ML_ROOT / "config"
    prompts_dir: Path = ML_ROOT / "prompts"
    snapshot_path: Path = ML_ROOT / "snapshots" / "news.jsonl"
    load_snapshot_on_start: bool = True

    # LLM. live — ходим в модели (без ключа — правила); stub — заглушки для тестов; off — только правила.
    llm_mode: Literal["live", "stub", "off"] = "live"
    llm_base_url: str = "https://changellenge.up.railway.app/v1"
    llm_api_key: SecretStr = SecretStr("")
    llm_timeout_s: float = 60.0
    llm_max_retries: int = 1
    # Общий дневной лимит команды по кейсу — 500 ₽. Сервису оставляем часть на разработку.
    llm_daily_budget_rub: float = 350.0
    llm_economy_ratio: float = 0.8

    # Агент
    agent_max_revisions: int = 2
    agent_max_tool_calls: int = 12
    agent_max_tokens_per_insight: int = 24_000
    ask_timeout_s: float = 55.0

    # Отбор событий
    freshness_tau_days: float = 30.0
    feed_max_insights: int = 12
    candidate_min_score: float = 0.35
    direct_min_score: float = 0.6
    # «Сейчас» для свежести и окна новостей. Пусто — текущее время. Нужен для воспроизводимых тестов.
    reference_time: str | None = None
    bank_material_outdated_days: int = 180

    # Межсервисная аутентификация: Java-бэкенд передаёт X-Internal-Token. Пусто — проверка выключена (dev).
    internal_token: SecretStr = SecretStr("")

    # Сбор новостей
    news_fetch_timeout_s: float = 15.0
    news_user_agent: str = "RadarBot/0.1 (+hackathon prototype)"
    collect_interval_min: int = Field(default=0, description="0 — фоновый сбор выключен")

    log_level: str = "INFO"

    @property
    def db_path(self) -> Path:
        return self.state_dir / "radar_ml.sqlite3"

    @property
    def llm_enabled(self) -> bool:
        return self.llm_mode == "live" and bool(self.llm_api_key.get_secret_value())


@lru_cache
def get_settings() -> Settings:
    return Settings()
