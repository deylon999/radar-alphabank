"""Доменные справочники из config/*.yaml: факторы, секторы ОКВЭД, продукты, роли, предложения банка."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from radar_ml.settings import get_settings


@dataclass(frozen=True)
class Factor:
    id: str
    label: str
    topic: str
    patterns: tuple[re.Pattern[str], ...]
    bank_query: str
    indicators: tuple[str, ...]
    directions: dict[str, tuple[re.Pattern[str], ...]] = field(default_factory=dict)


@dataclass(frozen=True)
class Sector:
    id: str
    name: str
    prefixes: tuple[str, ...]
    trade_role: str
    factors: dict[str, float]


@dataclass(frozen=True)
class Domain:
    factors: dict[str, Factor]
    sectors: dict[str, Sector]
    default_sector: Sector
    products: dict[str, dict[str, Any]]
    country_currency: dict[str, str]
    sanction_sensitive: frozenset[str]
    roles: dict[str, dict[str, float]]
    role_focus: dict[str, str]
    offers: list[dict[str, Any]]
    _prefix_index: list[tuple[str, str]] = field(default_factory=list)

    def sector_for_okved(self, code: str | None) -> Sector:
        if not code:
            return self.default_sector
        code = str(code).strip()
        # Префиксы отсортированы по убыванию длины: «46.71» сработает раньше «46».
        for prefix, sid in self._prefix_index:
            if code.startswith(prefix):
                return self.sectors[sid]
        return self.default_sector

    def sector_by_id(self, sid: str | None) -> Sector:
        if sid and sid in self.sectors:
            return self.sectors[sid]
        return self.default_sector

    def currency_factor(self, country: str) -> str:
        return self.country_currency.get(country, self.country_currency.get("_default", "fx_usd"))

    def find_factors(self, text_lower: str) -> dict[str, int]:
        """Фактор -> число совпадений шаблонов в тексте."""
        out: dict[str, int] = {}
        for fid, f in self.factors.items():
            n = sum(len(p.findall(text_lower)) for p in f.patterns)
            if n:
                out[fid] = n
        return out

    def find_directions(
        self, text_lower: str, factor_ids: list[str], title_lower: str = ""
    ) -> dict[str, str]:
        """Направление по фактору: совпадения в заголовке весят втрое больше, чем в тексте."""
        out: dict[str, str] = {}
        for fid in factor_ids:
            f = self.factors.get(fid)
            if not f:
                continue
            scores: dict[str, int] = {}
            for direction, pats in f.directions.items():
                n = 3 * sum(len(p.findall(title_lower)) for p in pats) + sum(
                    len(p.findall(text_lower)) for p in pats
                )
                if n:
                    scores[direction] = n
            if scores:
                best = sorted(scores.items(), key=lambda x: -x[1])
                if len(best) == 1 or best[0][1] > best[1][1]:
                    out[fid] = best[0][0]
        return out

    def role_weight(self, position: str | None, topic: str) -> float:
        return self.roles.get(position or "other", self.roles.get("other", {})).get(topic, 1.0)


def _load_yaml(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


@lru_cache
def get_domain(config_dir: str | None = None) -> Domain:
    cfg = Path(config_dir) if config_dir else get_settings().config_dir
    fy = _load_yaml(cfg / "factors.yaml")
    sy = _load_yaml(cfg / "sectors.yaml")
    oy = _load_yaml(cfg / "offers.yaml")

    factors: dict[str, Factor] = {}
    for fid, v in fy.items():
        factors[fid] = Factor(
            id=fid,
            label=v["label"],
            topic=v["topic"],
            patterns=tuple(re.compile(p) for p in v.get("patterns", [])),
            bank_query=v.get("bank_query", v["label"]),
            indicators=tuple(v.get("indicators", [])),
            directions={d: tuple(re.compile(p) for p in ps) for d, ps in (v.get("directions") or {}).items()},
        )

    sectors: dict[str, Sector] = {}
    prefix_index: list[tuple[str, str]] = []
    for sid, v in sy["sectors"].items():
        unknown = set(v["factors"]) - set(factors)
        if unknown:
            raise ValueError(f"sector {sid}: unknown factors {unknown}")
        sectors[sid] = Sector(
            sid, v["name"], tuple(v["prefixes"]), v.get("trade_role", "unknown"), dict(v["factors"])
        )
        for p in v["prefixes"]:
            prefix_index.append((p, sid))
    prefix_index.sort(key=lambda x: -len(x[0]))
    d = sy["default_sector"]
    default_sector = Sector("other", d["name"], (), d.get("trade_role", "unknown"), dict(d["factors"]))

    for pid, pv in sy["products"].items():
        unknown = set(pv.get("factors", {})) - set(factors)
        if unknown:
            raise ValueError(f"product {pid}: unknown factors {unknown}")
    for o in oy["offers"]:
        unknown = set(o["when"].get("factors", [])) - set(factors)
        if unknown:
            raise ValueError(f"offer {o['id']}: unknown factors {unknown}")

    return Domain(
        factors=factors,
        sectors=sectors,
        default_sector=default_sector,
        products=sy["products"],
        country_currency=sy["country_currency"],
        sanction_sensitive=frozenset(sy.get("sanction_sensitive_countries", [])),
        roles=sy["roles"],
        role_focus=sy.get("role_focus", {}),
        offers=oy["offers"],
        _prefix_index=prefix_index,
    )
