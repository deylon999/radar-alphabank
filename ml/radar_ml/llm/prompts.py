"""Промпты хранятся отдельно от кода в prompts/*.md и имеют версию.

Формат файла:
    ---
    version: insight_draft.v1
    ---
    ## system
    ...
    ## user
    ... (Jinja2)
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from jinja2 import Environment, StrictUndefined

from radar_ml.settings import get_settings

_env = Environment(undefined=StrictUndefined, autoescape=False, trim_blocks=True, lstrip_blocks=True)
_env.filters["tojson"] = lambda v: json.dumps(v, ensure_ascii=False, indent=1, default=str)


@dataclass(frozen=True)
class Prompt:
    name: str
    version: str
    system: str
    user: str

    def render(self, **ctx: Any) -> list[dict[str, str]]:
        return [
            {"role": "system", "content": _env.from_string(self.system).render(**ctx).strip()},
            {"role": "user", "content": _env.from_string(self.user).render(**ctx).strip()},
        ]


def _parse(name: str, text: str) -> Prompt:
    meta: dict[str, Any] = {}
    if text.startswith("---"):
        _, fm, text = text.split("---", 2)
        meta = yaml.safe_load(fm) or {}
    sections: dict[str, list[str]] = {}
    cur: str | None = None
    for line in text.splitlines():
        if line.strip().lower() in ("## system", "## user"):
            cur = line.strip()[3:].lower()
            sections[cur] = []
            continue
        if cur:
            sections[cur].append(line)
    return Prompt(
        name=name,
        version=str(meta.get("version", f"{name}.v0")),
        system="\n".join(sections.get("system", [])),
        user="\n".join(sections.get("user", [])),
    )


@lru_cache
def load_prompt(name: str, prompts_dir: str | None = None) -> Prompt:
    d = Path(prompts_dir) if prompts_dir else get_settings().prompts_dir
    return _parse(name, (d / f"{name}.md").read_text(encoding="utf-8"))
