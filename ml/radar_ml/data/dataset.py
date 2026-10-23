"""Загрузка и очистка обезличенного датасета кейса.

Файлы (разделитель «;»):
- df_Uid_data_hack.csv — компании;
- df_Fid_Uid_link_hack.csv — связи физлиц с компаниями;
- df_Uid_payment_hack.csv — агрегированные платежи между компаниями.

Что делаем с «грязными» данными и почему — в отчёте quality_report(); пропуски не заполняем
выдуманными значениями, а помечаем как неизвестные.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from radar_ml.nlp.geo import norm_city, norm_country
from radar_ml.settings import get_settings

log = logging.getLogger(__name__)

COMPANIES_FILE = "df_Uid_data_hack.csv"
PERSONS_FILE = "df_Fid_Uid_link_hack.csv"
PAYMENTS_FILE = "df_Uid_payment_hack.csv"

PRODUCT_COLUMNS = {
    "CL_PRODUCT_RKO_MARK": "settlement",
    "CL_PRODUCT_LOA_MARK": "loan",
    "CL_PRODUCT_LEA_MARK": "leasing",
    "CL_PRODUCT_GAR_MARK": "guarantee",
    "CL_PRODUCT_DEP_MARK": "deposit",
    "CL_PRODUCT_ZPP_MARK": "payroll",
    "FACTORING_MARK": "factoring",
}
CL_TYPE = {"CLIENT": "client", "PROSPECT": "prospect", "CLOSE_CLIENT": "closed"}


def _flag(v: Any) -> bool:
    try:
        return float(v) >= 0.5
    except (TypeError, ValueError):
        return False


def _str(v: Any) -> str | None:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    s = str(v).strip()
    return s or None


def okved_class(code: str | None) -> str | None:
    """«46.71.2» -> «46.71», «42.99» -> «42.99», «46» -> «46»."""
    if not code:
        return None
    parts = code.split(".")
    return ".".join(parts[:2])


@dataclass
class Company:
    id: str
    okved_code: str | None
    okved_name: str | None
    region: str | None
    city: str | None
    revenue: float | None
    employees: str | None
    age_years: str | None
    stage: str | None
    ownership: str | None
    relationship: str | None
    products: list[str]
    countries: list[str]
    group_id: str | None
    key_owner_mark: bool
    ambiguous: bool = False
    raw: dict[str, Any] = field(default_factory=dict, repr=False)


class Dataset:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.companies: dict[str, Company] = {}
        self.quality: dict[str, Any] = {}
        self._pay: pd.DataFrame | None = None
        self._by_benef: dict[str, np.ndarray] = {}
        self._by_payer: dict[str, np.ndarray] = {}
        self._in_total: dict[str, float] = {}
        self._out_total: dict[str, float] = {}
        self.persons_by_company: dict[str, list[str]] = {}
        self.companies_by_person: dict[str, list[str]] = {}
        self.class_revenues: dict[str, np.ndarray] = {}
        self.group_members: dict[str, list[str]] = {}
        self.loaded = False

    # ------------------------------------------------------------------ load
    def load(self) -> Dataset:
        cpath = self.data_dir / COMPANIES_FILE
        if not cpath.exists():
            log.warning("dataset not found at %s: profiles from dataset are unavailable", self.data_dir)
            self.quality = {"available": False, "dataDir": str(self.data_dir)}
            return self
        q: dict[str, Any] = {"available": True}
        df = pd.read_csv(cpath, sep=";", dtype=str, keep_default_na=True)
        q["companyRows"] = int(len(df))
        q["missing"] = {c: int(n) for c, n in df.isna().sum().items() if n}
        dup_mask = df["SYNTHETIC_U"].duplicated(keep=False)
        dup_ids = sorted(df.loc[dup_mask, "SYNTHETIC_U"].unique().tolist())
        q["duplicateCompanyIds"] = {i: int((df["SYNTHETIC_U"] == i).sum()) for i in dup_ids}
        # Для повторяющегося ID оставляем первую запись и помечаем профиль как неоднозначный:
        # какая из строк настоящая, по данным определить нельзя, а придумывать новые ID нельзя.
        first = df.drop_duplicates("SYNTHETIC_U", keep="first")

        bad_revenue = 0
        for rec in first.to_dict(orient="records"):
            cid = rec["SYNTHETIC_U"]
            try:
                revenue = float(rec.get("REVENUE_COMPANY"))
                if revenue < 0 or np.isnan(revenue):
                    raise ValueError
            except (TypeError, ValueError):
                revenue = None
                bad_revenue += 1
            countries = []
            if _str(rec.get("FTS_COUNTRY_NAME")):
                countries = [norm_country(c) for c in rec["FTS_COUNTRY_NAME"].split(",") if c.strip()]
            self.companies[cid] = Company(
                id=cid,
                okved_code=_str(rec.get("MAINOKVED_CODE")),
                okved_name=_str(rec.get("MAINOKVED_NAME")),
                region=_str(rec.get("REGION")),
                city=norm_city(_str(rec.get("CITY"))),
                revenue=revenue,
                employees=_str(rec.get("AMOUNT_WORKERS_FNS_GRADATION"))
                or _str(rec.get("AMOUNT_WORKERS_SPARK_GRADATION")),
                age_years=_str(rec.get("COMPANY_AGE_YEARS_GRADATION")),
                stage=_str(rec.get("ECO_MARK_LABEL")),
                ownership=_str(rec.get("OKFS_NAME")),
                relationship=CL_TYPE.get(_str(rec.get("CL_TYPE")) or "", None),
                products=[p for col, p in PRODUCT_COLUMNS.items() if _flag(rec.get(col))],
                countries=countries,
                group_id=_str(rec.get("GROUP_ID")),
                key_owner_mark=_flag(rec.get("NEGATIVEMARK")),
                ambiguous=cid in dup_ids,
                raw=rec,
            )
        q["companies"] = len(self.companies)
        q["invalidRevenue"] = bad_revenue
        q["ftsFlagWithoutCountry"] = int(
            ((df["FTS_FLAG"].astype(float) > 0.5) & df["FTS_COUNTRY_NAME"].isna()).sum()
        )

        # Отрасль: выручки по классу ОКВЭД для оценки положения компании среди клиентов банка.
        cls: dict[str, list[float]] = {}
        for c in self.companies.values():
            k = okved_class(c.okved_code)
            if k and c.revenue is not None:
                cls.setdefault(k, []).append(c.revenue)
            if c.group_id:
                self.group_members.setdefault(c.group_id, []).append(c.id)
        self.class_revenues = {k: np.sort(np.array(v))[::-1] for k, v in cls.items()}

        self._load_persons(q)
        self._load_payments(q)
        self.quality = q
        self.loaded = True
        log.info("dataset loaded: %s companies", len(self.companies))
        return self

    def _load_persons(self, q: dict[str, Any]) -> None:
        p = self.data_dir / PERSONS_FILE
        if not p.exists():
            q["persons"] = {"available": False}
            return
        df = pd.read_csv(p, sep=";", dtype=str)
        # Пропуск города не отменяет связь физлица с компанией — связь оставляем.
        for f, u in zip(df["SYNTHETIC_F"], df["SYNTHETIC_U"], strict=True):
            self.persons_by_company.setdefault(u, []).append(f)
            self.companies_by_person.setdefault(f, []).append(u)
        unknown = sum(1 for u in self.persons_by_company if u not in self.companies)
        q["persons"] = {
            "links": int(len(df)),
            "missingLocation": int(df["CITY_NAME"].isna().sum()),
            "companiesNotInDataset": unknown,
            "personsLinkedToSeveralCompanies": sum(
                1 for v in self.companies_by_person.values() if len(set(v)) > 1
            ),
        }

    def _load_payments(self, q: dict[str, Any]) -> None:
        p = self.data_dir / PAYMENTS_FILE
        if not p.exists():
            q["payments"] = {"available": False}
            return
        df = pd.read_csv(
            p, sep=";", dtype={"BENEFICIARY": str, "PAYER": str, "PAY_AMT": float, "PAY_CNT": float}
        )
        rows = len(df)
        exact_dups = int(df.duplicated().sum())
        self_pay = df["BENEFICIARY"] == df["PAYER"]
        known = set(self.companies)
        q["payments"] = {
            "rows": int(rows),
            "exactDuplicateRows": exact_dups,
            "selfTransfers": int(self_pay.sum()),
            "rowsWithUnknownBeneficiary": int((~df["BENEFICIARY"].isin(known)).sum()),
            "rowsWithUnknownPayer": int((~df["PAYER"].isin(known)).sum()),
        }
        # Полные дубли строк сохраняем: агрегаты за период могут совпасть законно. Переводы себе исключаем.
        df = df[~self_pay].reset_index(drop=True)
        df = df.sort_values("PAY_AMT", ascending=False, kind="stable").reset_index(drop=True)
        self._pay = df
        self._by_benef = {k: v for k, v in df.groupby("BENEFICIARY", sort=False).indices.items()}
        self._by_payer = {k: v for k, v in df.groupby("PAYER", sort=False).indices.items()}
        self._in_total = df.groupby("BENEFICIARY")["PAY_AMT"].sum().to_dict()
        self._out_total = df.groupby("PAYER")["PAY_AMT"].sum().to_dict()

    # --------------------------------------------------------------- queries
    def get(self, company_id: str) -> Company | None:
        return self.companies.get(company_id)

    def counterparties(self, company_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """Крупнейшие контрагенты по сумме: incoming — платят компании, outgoing — компания платит им."""
        if self._pay is None:
            return []
        out: list[dict[str, Any]] = []
        for direction, index, col, total in (
            ("incoming", self._by_benef, "PAYER", self._in_total.get(company_id, 0.0)),
            ("outgoing", self._by_payer, "BENEFICIARY", self._out_total.get(company_id, 0.0)),
        ):
            idx = index.get(company_id)
            if idx is None:
                continue
            part = self._pay.iloc[idx]
            agg = part.groupby(col).agg(amount=("PAY_AMT", "sum"), payments=("PAY_CNT", "sum"))
            agg = agg.sort_values("amount", ascending=False).head(limit)
            for cp, row in agg.iterrows():
                out.append(
                    {
                        "id": str(cp),
                        "direction": direction,
                        "amount": int(round(row["amount"])),
                        "payments": int(round(row["payments"])),
                        "share": float(row["amount"] / total) if total else None,
                    }
                )
        out.sort(key=lambda x: -x["amount"])
        return out

    def flow_totals(self, company_id: str) -> tuple[float, float]:
        return self._in_total.get(company_id, 0.0), self._out_total.get(company_id, 0.0)

    def linked_companies(self, company_id: str, limit: int = 20) -> list[str]:
        """Компании, связанные с этой через общих физлиц."""
        seen: list[str] = []
        for f in self.persons_by_company.get(company_id, []):
            for u in self.companies_by_person.get(f, []):
                if u != company_id and u not in seen:
                    seen.append(u)
                    if len(seen) >= limit:
                        return seen
        return seen

    def industry_position(self, company: Company) -> tuple[str, int, int, float] | None:
        k = okved_class(company.okved_code)
        if not k or company.revenue is None or k not in self.class_revenues:
            return None
        arr = self.class_revenues[k]
        rank = int(np.searchsorted(-arr, -company.revenue, side="left")) + 1
        total = float(arr.sum())
        share = 100.0 * company.revenue / total if total else 0.0
        return k, int(len(arr)), rank, share

    def search(self, q: str = "", limit: int = 20, min_revenue: float | None = None) -> list[Company]:
        ql = q.strip().lower()
        res = []
        for c in self.companies.values():
            if min_revenue is not None and (c.revenue or 0) < min_revenue:
                continue
            if ql and not (
                ql in c.id.lower()
                or ql in (c.okved_name or "").lower()
                or ql == (c.okved_code or "")
                or ql in (c.region or "").lower()
            ):
                continue
            res.append(c)
        res.sort(key=lambda c: -(c.revenue or 0))
        return res[:limit]


_lock = threading.Lock()


@lru_cache
def _dataset_singleton(data_dir: str) -> Dataset:
    with _lock:
        return Dataset(Path(data_dir)).load()


def get_dataset() -> Dataset:
    return _dataset_singleton(str(get_settings().data_dir))
