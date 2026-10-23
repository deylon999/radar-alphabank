"""Шлюз к языковым моделям.

- вызывает только модели из config/models.yaml (Приложение 3 кейса), проверяя семейство по allowlist;
- выбирает модель под задачу и переключается на резервную при ошибке;
- кэширует ответы (одинаковый вход — без повторного расхода);
- считает токены и стоимость, держит дневной лимит и экономный режим;
- требует JSON по схеме: невалидный ответ отправляется на исправление ограниченное число раз,
  после чего задача честно завершается ошибкой, а не пустым «всё хорошо».
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, TypeVar

import httpx
import yaml
from pydantic import BaseModel, ValidationError

from radar_ml.settings import Settings, get_settings
from radar_ml.store import Store, get_store

log = logging.getLogger(__name__)

# Семейства из Приложения 3. Любая модель вне списка блокируется, даже если её прописали в конфиг.
ALLOWED_FAMILIES = (
    "gemma-4-26b",
    "glm-5.3-flash",
    "qwen3.6-35b",
    "deepseek-v4.1-flash",
    "qwen3-vl-30b",
    "kimi-k2.6",
)
# В экономном режиме разрешены только интерактивные задачи пользователя.
ECONOMY_TASKS = {"ask_plan", "ask_answer", "facts_extract", "sector_classify"}

T = TypeVar("T", bound=BaseModel)


class LLMUnavailable(Exception):
    """Модель недоступна: нет ключа, выключена, лимит исчерпан или все попытки неудачны."""

    code = "ai-unavailable"


class LLMBudgetExceeded(LLMUnavailable):
    code = "budget-exceeded"


class LLMBadOutput(LLMUnavailable):
    code = "bad-output"


@dataclass
class LLMResult:
    text: str
    data: Any
    model: str
    task: str
    tokens_in: int = 0
    tokens_out: int = 0
    cost_rub: float = 0.0
    cached: bool = False
    ms: int = 0
    attempts: int = 1
    prompt_version: str | None = None


def is_allowed_model(model_id: str) -> bool:
    mid = model_id.lower()
    return any(f in mid for f in ALLOWED_FAMILIES)


_THINK = re.compile(r"<think>.*?</think>", re.S)
_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)


def extract_json(text: str) -> Any:
    """JSON из ответа модели: без рассуждений <think>, без ```-ограждений, первый объект или массив."""
    t = _THINK.sub("", text or "").strip()
    m = _FENCE.search(t)
    if m:
        t = m.group(1).strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        pass
    starts = [i for i in (t.find("{"), t.find("[")) if i >= 0]
    if not starts:
        raise ValueError("в ответе нет JSON")
    start = min(starts)
    closer = "}" if t[start] == "{" else "]"
    end = t.rfind(closer)
    if end <= start:
        raise ValueError("JSON обрезан")
    chunk = t[start : end + 1]
    chunk = re.sub(r",\s*([}\]])", r"\1", chunk)  # висячие запятые
    return json.loads(chunk)


StubHandler = Callable[[str, list[dict[str, Any]]], str]


class Gateway:
    def __init__(self, settings: Settings, store: Store, config_path: Path | None = None):
        self.s = settings
        self.store = store
        cfg_path = config_path or settings.config_dir / "models.yaml"
        with cfg_path.open(encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        self.models: dict[str, dict[str, Any]] = cfg["models"]
        self.tasks: dict[str, dict[str, Any]] = cfg["tasks"]
        for alias, m in self.models.items():
            if not is_allowed_model(m["id"]):
                raise ValueError(f"model {alias}={m['id']} is not in the case allowlist")
        for t, tc in self.tasks.items():
            for alias in tc["models"]:
                if alias not in self.models:
                    raise ValueError(f"task {t}: unknown model alias {alias}")
        self._stubs: dict[str, StubHandler] = {}
        self._no_json_mode: set[str] = set()
        self._lock = threading.Lock()
        self._client = httpx.Client(timeout=settings.llm_timeout_s)

    # ------------------------------------------------------------- state
    @property
    def mode(self) -> str:
        return self.s.llm_mode

    def register_stub(self, task: str, handler: StubHandler) -> None:
        self._stubs[task] = handler

    def clear_stubs(self) -> None:
        self._stubs.clear()

    def available(self, task: str) -> bool:
        if self.mode == "off":
            return False
        if self.mode == "stub":
            return task in self._stubs
        if not self.s.llm_enabled:
            return False
        spent = self.spent_today()
        if spent >= self.s.llm_daily_budget_rub:
            return False
        if spent >= self.s.llm_economy_ratio * self.s.llm_daily_budget_rub and task not in ECONOMY_TASKS:
            return False
        return True

    def spent_today(self) -> float:
        day = datetime.now(UTC).date().isoformat()
        rows = self.store.query(
            "SELECT COALESCE(SUM(cost_rub),0) AS s FROM llm_usage WHERE day = ? AND cached = 0", (day,)
        )
        return float(rows[0]["s"]) if rows else 0.0

    def usage_today(self) -> dict[str, Any]:
        day = datetime.now(UTC).date().isoformat()
        rows = self.store.query(
            "SELECT task, model, COUNT(*) n, SUM(tokens_in) ti, SUM(tokens_out) tout, SUM(cost_rub) c, SUM(cached) cached, "
            "SUM(1-ok) failed FROM llm_usage WHERE day = ? GROUP BY task, model",
            (day,),
        )
        spent = self.spent_today()
        return {
            "day": day,
            "mode": self.mode,
            "budgetRub": self.s.llm_daily_budget_rub,
            "spentRub": round(spent, 2),
            "economyMode": spent >= self.s.llm_economy_ratio * self.s.llm_daily_budget_rub,
            "byTask": [
                {
                    "task": r["task"],
                    "model": r["model"],
                    "calls": r["n"],
                    "tokensIn": r["ti"] or 0,
                    "tokensOut": r["tout"] or 0,
                    "costRub": round(r["c"] or 0, 3),
                    "cached": r["cached"] or 0,
                    "failed": r["failed"] or 0,
                }
                for r in rows
            ],
        }

    def _record(self, task: str, model: str, ti: int, to: int, cost: float, cached: bool, ok: bool) -> None:
        now = datetime.now(UTC)
        self.store.execute(
            "INSERT INTO llm_usage (at, day, task, model, tokens_in, tokens_out, cost_rub, cached, ok) VALUES (?,?,?,?,?,?,?,?,?)",
            (now.isoformat(), now.date().isoformat(), task, model, ti, to, cost, int(cached), int(ok)),
        )

    def _cost(self, alias: str, ti: int, to: int) -> float:
        p = self.models[alias].get("price_rub_per_1m", {})
        return (ti * p.get("input", 0) + to * p.get("output", 0)) / 1_000_000

    # -------------------------------------------------------------- calls
    def _call_http(
        self, alias: str, messages: list[dict[str, Any]], max_tokens: int, temperature: float
    ) -> tuple[str, int, int]:
        model_id = self.models[alias]["id"]
        body: dict[str, Any] = {
            "model": model_id,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if alias not in self._no_json_mode:
            body["response_format"] = {"type": "json_object"}
        headers = {"Authorization": f"Bearer {self.s.llm_api_key.get_secret_value()}"}
        r = self._client.post(
            f"{self.s.llm_base_url.rstrip('/')}/chat/completions", json=body, headers=headers
        )
        if r.status_code == 400 and "response_format" in body and "response_format" in r.text.lower():
            self._no_json_mode.add(alias)
            body.pop("response_format")
            r = self._client.post(
                f"{self.s.llm_base_url.rstrip('/')}/chat/completions", json=body, headers=headers
            )
        r.raise_for_status()
        data = r.json()
        msg = data["choices"][0]["message"]
        text = msg.get("content") or ""
        usage = data.get("usage") or {}
        ti = int(usage.get("prompt_tokens") or sum(len(str(m.get("content", ""))) for m in messages) // 3)
        to = int(usage.get("completion_tokens") or len(text) // 3)
        return text, ti, to

    def complete_json(
        self,
        task: str,
        messages: list[dict[str, Any]],
        schema: type[T] | None = None,
        prompt_version: str | None = None,
        validate: Callable[[Any], list[str]] | None = None,
        use_cache: bool = True,
    ) -> LLMResult:
        """Вызов модели с ответом в JSON. schema — pydantic-модель ответа; validate — доп. проверки,
        возвращающие список проблем (пустой — всё хорошо)."""
        if task not in self.tasks:
            raise ValueError(f"unknown task {task}")
        tc = self.tasks[task]
        if not self.available(task):
            if self.mode == "live" and self.s.llm_enabled:
                raise LLMBudgetExceeded("дневной лимит LLM исчерпан или включён экономный режим")
            raise LLMUnavailable(f"LLM недоступна для задачи {task} (режим {self.mode})")

        key = hashlib.sha256(
            json.dumps(
                {"t": task, "m": tc["models"], "msg": messages, "pv": prompt_version},
                ensure_ascii=False,
                sort_keys=True,
            ).encode()
        ).hexdigest()
        if use_cache:
            cached = self.store.get_json("llm_cache", "key", key)
            if cached is not None:
                self._record(task, cached["model"], 0, 0, 0.0, True, True)
                return LLMResult(
                    text=cached["text"],
                    data=cached["data"],
                    model=cached["model"],
                    task=task,
                    cached=True,
                    prompt_version=prompt_version,
                )

        last_err: Exception | None = None
        attempts = 0
        for alias in tc["models"]:
            convo = list(messages)
            for _try in range(self.s.llm_max_retries + 1):
                attempts += 1
                t0 = time.monotonic()
                try:
                    if self.mode == "stub":
                        handler = self._stubs.get(task)
                        if handler is None:
                            raise LLMUnavailable(f"нет заглушки для {task}")
                        text, ti, to = handler(task, convo), 0, 0
                    else:
                        text, ti, to = self._call_http(
                            alias, convo, tc.get("max_tokens", 1000), tc.get("temperature", 0.0)
                        )
                except LLMUnavailable:
                    raise
                except (httpx.HTTPError, KeyError, ValueError) as e:
                    last_err = e
                    status = getattr(getattr(e, "response", None), "status_code", None)
                    self._record(task, self.models[alias]["id"], 0, 0, 0.0, False, False)
                    log.warning("llm %s/%s http error (status=%s): %s", task, alias, status, e)
                    if status in (401, 403):
                        raise LLMUnavailable("ключ LLM отклонён") from e
                    time.sleep(min(2.0 * (_try + 1), 6.0) if self.mode == "live" else 0)
                    if status == 400:
                        break  # запрос некорректен для этой модели — пробуем следующую
                    continue
                ms = int((time.monotonic() - t0) * 1000)
                cost = self._cost(alias, ti, to)
                problems: list[str] = []
                data: Any = None
                try:
                    data = extract_json(text)
                    if schema is not None:
                        data = schema.model_validate(data).model_dump(by_alias=True, mode="json")
                    if validate is not None:
                        problems = validate(data)
                except (ValueError, ValidationError) as e:
                    problems = [f"ответ не соответствует схеме: {str(e)[:600]}"]
                ok = not problems
                self._record(task, self.models[alias]["id"], ti, to, cost, False, ok)
                if ok:
                    result = LLMResult(
                        text=text,
                        data=data,
                        model=self.models[alias]["id"],
                        task=task,
                        tokens_in=ti,
                        tokens_out=to,
                        cost_rub=cost,
                        ms=ms,
                        attempts=attempts,
                        prompt_version=prompt_version,
                    )
                    if use_cache:
                        self.store.put(
                            "llm_cache",
                            {
                                "key": key,
                                "model": result.model,
                                "task": task,
                                "created_at": datetime.now(UTC).isoformat(),
                                "data": {"text": text, "data": data, "model": result.model},
                            },
                        )
                    return result
                last_err = LLMBadOutput("; ".join(problems))
                log.info("llm %s/%s bad output, asking to fix: %s", task, alias, problems[:2])
                convo = convo + [
                    {"role": "assistant", "content": text[:6000]},
                    {
                        "role": "user",
                        "content": "Исправь ответ. Проблемы:\n- "
                        + "\n- ".join(problems[:8])
                        + "\nВерни только исправленный JSON целиком, без пояснений.",
                    },
                ]
        if isinstance(last_err, LLMBadOutput):
            raise last_err
        raise LLMUnavailable(f"все модели задачи {task} недоступны: {last_err}")


_gw_lock = threading.Lock()


@lru_cache
def _gateway(_key: str) -> Gateway:
    with _gw_lock:
        return Gateway(get_settings(), get_store())


def get_gateway() -> Gateway:
    s = get_settings()
    return _gateway(f"{s.llm_mode}:{s.db_path}")
