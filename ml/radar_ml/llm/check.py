"""Проверка доступа к моделям организаторов и соответствия config/models.yaml.

python -m radar_ml.llm.check          # список моделей прокси и сверка идентификаторов
python -m radar_ml.llm.check --ping   # плюс короткий запрос к каждой модели (тратит немного лимита)
"""

from __future__ import annotations

import argparse
import sys

import httpx

from radar_ml.llm.gateway import Gateway, is_allowed_model
from radar_ml.settings import get_settings
from radar_ml.store import get_store


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ping", action="store_true")
    a = ap.parse_args(argv)
    s = get_settings()
    key = s.llm_api_key.get_secret_value()
    if not key:
        print("RADAR_ML_LLM_API_KEY не задан")
        return 2
    r = httpx.get(
        f"{s.llm_base_url.rstrip('/')}/models", headers={"Authorization": f"Bearer {key}"}, timeout=30
    )
    r.raise_for_status()
    available = sorted(m["id"] for m in r.json().get("data", []))
    print("Модели прокси:")
    for m in available:
        print(f"  {'✓' if is_allowed_model(m) else '·'} {m}")
    gw = Gateway(s, get_store())
    ok = True
    for alias, m in gw.models.items():
        found = m["id"] in available
        ok &= found
        hint = "" if found else "  <- нет в /models: поправьте id в config/models.yaml"
        print(f"{alias:10s} {m['id']}{hint}")
        if a.ping and found:
            try:
                text, ti, to = gw._call_http(
                    alias, [{"role": "user", "content": 'Ответь JSON {"ok": true}'}], 20, 0.0
                )
                print(f"           ping: {text.strip()[:60]!r} ({ti}+{to} токенов)")
            except Exception as e:  # noqa: BLE001
                ok = False
                print(f"           ping: ошибка {e}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
