import json

import pytest
import yaml
from pydantic import BaseModel


def test_extract_json_variants():
    from radar_ml.llm.gateway import extract_json

    assert extract_json('<think>долго думаю</think>{"a": 1}') == {"a": 1}
    assert extract_json('Вот ответ:\n```json\n{"a": [1, 2,],}\n```') == {"a": [1, 2]}
    assert extract_json('ok {"a": {"b": 2}} end') == {"a": {"b": 2}}
    with pytest.raises(ValueError):
        extract_json("нет json")


def test_allowlist_blocks_other_models(env, tmp_path):
    from radar_ml.llm.gateway import Gateway
    from radar_ml.settings import get_settings
    from radar_ml.store import get_store

    cfg = {"models": {"gpt": {"id": "openai/gpt-5", "family": "gpt"}}, "tasks": {"x": {"models": ["gpt"]}}}
    p = tmp_path / "models.yaml"
    p.write_text(yaml.safe_dump(cfg))
    with pytest.raises(ValueError, match="allowlist"):
        Gateway(get_settings(), get_store(), p)


class _Out(BaseModel):
    answer: str


def test_cache_validation_and_usage(gw):
    calls = []

    def h(task, msgs):
        calls.append(1)
        return json.dumps({"answer": "да"}) if len(calls) > 1 else "мусор"

    gw.register_stub("ask_plan", h)
    msgs = [{"role": "user", "content": "вопрос"}]
    r = gw.complete_json("ask_plan", msgs, schema=_Out)
    assert r.data == {"answer": "да"} and r.attempts == 2
    r2 = gw.complete_json("ask_plan", msgs, schema=_Out)
    assert r2.cached and len(calls) == 2
    u = gw.usage_today()
    assert any(row["task"] == "ask_plan" for row in u["byTask"])


def test_budget_and_economy_mode(env, monkeypatch):
    from radar_ml.llm import gateway as g
    from radar_ml.settings import get_settings

    monkeypatch.setenv("RADAR_ML_LLM_MODE", "live")
    monkeypatch.setenv("RADAR_ML_LLM_API_KEY", "test-key")
    monkeypatch.setenv("RADAR_ML_LLM_DAILY_BUDGET_RUB", "10")
    get_settings.cache_clear()
    g._gateway.cache_clear()
    gw = g.get_gateway()
    assert gw.available("insight_draft")
    gw._record("insight_draft", "z-ai/glm-5.3-flash", 1000, 1000, 8.5, False, True)
    assert not gw.available("insight_draft")  # экономный режим: фоновые задачи стоп
    assert gw.available("ask_answer")  # интерактивные вопросы пока можно
    gw._record("ask_answer", "deepseek/deepseek-v4.1-flash", 1000, 1000, 2.0, False, True)
    assert not gw.available("ask_answer")
    with pytest.raises(g.LLMBudgetExceeded):
        gw.complete_json("ask_answer", [{"role": "user", "content": "x"}])
