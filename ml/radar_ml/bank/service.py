"""Аналитика Альфа-Банка: загрузка PDF ЦМИ, фрагменты со страницами, поиск и позиции банка.

Позиция банка — выжимка из материала с точной ссылкой на страницу, а не вывод модели.
Позиции извлекаются при загрузке материала:
- LLM (Qwen / DeepSeek) по схеме; каждая позиция обязана иметь цитату со страницы материала,
  а все числа позиции — встречаться в этой цитате, иначе позиция отбрасывается;
- без LLM — экстрактивно: предложения со словами прогноза и показателем берутся как есть.
Если по теме нет материала, позиция банка не формируется — модель её не придумывает.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import re
import threading
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

from radar_ml.llm.gateway import LLMUnavailable, get_gateway
from radar_ml.llm.prompts import load_prompt
from radar_ml.nlp.text import normalize, numbers_in, sentences, short_id, tokens, truncate
from radar_ml.retrieval.bm25 import BM25Index
from radar_ml.schemas import BankMaterial, BankMaterialCitation, BankView, SupersededBankView
from radar_ml.settings import get_settings
from radar_ml.store import Store, get_store

log = logging.getLogger(__name__)

# Показатель -> (подпись, ключевые слова для поиска в тексте материала)
INDICATORS: dict[str, tuple[str, list[str]]] = {
    "key_rate": ("ключевая ставка", ["ключев", "ставк"]),
    "loan_rates": ("ставки по кредитам", ["кредит", "ставк"]),
    "ofz_yield": ("доходности ОФЗ", ["офз", "доходност"]),
    "inflation": ("инфляция", ["инфляц"]),
    "usd_rub": ("курс доллара", ["доллар", "usd"]),
    "eur_rub": ("курс евро", ["евро", "eur"]),
    "cny_rub": ("курс юаня", ["юан", "cny"]),
    "gdp": ("рост ВВП", ["ввп"]),
    "industrial_production": ("промышленное производство", ["промышлен", "производств"]),
    "consumption": ("потребление", ["потреблен", "потребител", "розничн"]),
    "real_wages": ("реальные зарплаты", ["реальн", "зарплат"]),
    "wages": ("зарплаты", ["зарплат", "заработн"]),
    "unemployment": ("безработица", ["безработ", "рынок труда", "занятост"]),
    "brent": ("нефть Brent", ["brent", "нефт"]),
    "urals": ("нефть Urals", ["urals"]),
    "gold": ("золото", ["золот"]),
    "steel": ("сталь", ["стал"]),
    "aluminium": ("алюминий", ["алюмин"]),
    "copper": ("медь", ["мед"]),
    "nickel": ("никель", ["никел"]),
    "gas_price": ("газ", ["газ"]),
    "coal": ("уголь", ["угол", "угл"]),
    "grain": ("зерно", ["зерн", "пшениц"]),
    "fertilizers": ("удобрения", ["удобрен"]),
    "budget": ("бюджет", ["бюджет"]),
    "mortgage": ("ипотека", ["ипотек"]),
    "construction": ("строительство", ["строител", "жиль"]),
    "trade_balance": ("внешняя торговля", ["экспорт", "импорт", "торгов"]),
    "current_account": ("текущий счёт", ["текущ", "счет"]),
    "rail_loading": ("погрузка", ["погрузк"]),
    "auto_sales": ("продажи автомобилей", ["автомобил"]),
    "excise": ("акцизы", ["акциз"]),
    "tariffs": ("тарифы", ["тариф"]),
    "fuel_prices": ("цены на топливо", ["бензин", "топлив", "дизел"]),
}
FORECAST_WORDS = re.compile(
    r"(ожида|прогноз|ждем|ждём|полагаем|считаем|оцениваем|предполага|сохран\w* .{0,20}прогноз|повысил\w* прогноз|понизил\w* прогноз|base case|базов\w* сценари)",
    re.I,
)
MONTHS = {
    "январ": 1,
    "феврал": 2,
    "март": 3,
    "апрел": 4,
    "ма": 5,
    "июн": 6,
    "июл": 7,
    "август": 8,
    "сентябр": 9,
    "октябр": 10,
    "ноябр": 11,
    "декабр": 12,
}


@dataclass
class Chunk:
    id: str
    material_id: str
    page: int
    text: str


class Position(BaseModel):
    id: str = ""
    material_id: str = ""
    indicator: str
    horizon: str | None = None
    summary: str = Field(max_length=400)
    quote: str
    page: int
    direction: str | None = None
    method: str = "llm"


class _LLMPositions(BaseModel):
    positions: list[Position] = []


def _parse_date(text: str) -> datetime | None:
    t = normalize(text[:3000])
    m = re.search(r"\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b", t)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)), tzinfo=UTC)
        except ValueError:
            pass
    m = re.search(
        r"\b(\d{1,2}) (январ|феврал|март|апрел|ма[яй]|июн|июл|август|сентябр|октябр|ноябр|декабр)\w* (20\d{2})",
        t,
    )
    if m:
        mon = next(v for k, v in MONTHS.items() if m.group(2).startswith(k))
        try:
            return datetime(int(m.group(3)), mon, int(m.group(1)), tzinfo=UTC)
        except ValueError:
            pass
    return None


def _quote_in_page(quote: str, page_text: str) -> bool:
    q, p = normalize(quote), normalize(page_text)
    if len(q) < 12:
        return False
    if q in p:
        return True
    qt = set(tokens(q))
    pt = set(tokens(p))
    return bool(qt) and len(qt & pt) / len(qt) >= 0.85


def chunk_pages(material_id: str, pages: list[str], size: int = 900, overlap: int = 150) -> list[Chunk]:
    out = []
    for pi, text in enumerate(pages, start=1):
        sents = sentences(text)
        buf = ""
        for s in sents:
            if len(buf) + len(s) > size and buf:
                out.append(
                    Chunk(short_id("bc", material_id, str(pi), buf[:80]), material_id, pi, buf.strip())
                )
                buf = buf[-overlap:] + " " + s
            else:
                buf = f"{buf} {s}"
        if buf.strip():
            out.append(Chunk(short_id("bc", material_id, str(pi), buf[:80]), material_id, pi, buf.strip()))
    return out


def extractive_positions(material_id: str, pages: list[str]) -> list[Position]:
    """Без LLM: предложения со словами прогноза и показателем, как они есть в материале."""
    out: list[Position] = []
    seen: set[str] = set()
    for pi, text in enumerate(pages, start=1):
        for s in sentences(text):
            sl = normalize(s)
            if len(sl) < 30 or not FORECAST_WORDS.search(sl) or not numbers_in(sl):
                continue
            for ind, (_label, kws) in INDICATORS.items():
                if all(any(k in sl for k in [kw]) for kw in kws[:1]) and ind not in seen:
                    out.append(
                        Position(
                            id=short_id("bp", material_id, ind, s[:60]),
                            material_id=material_id,
                            indicator=ind,
                            summary=truncate(s, 380),
                            quote=truncate(s, 380),
                            page=pi,
                            method="extractive",
                        )
                    )
                    seen.add(ind)
                    break
    return out


class BankService:
    def __init__(self, store: Store):
        self.store = store
        self.s = get_settings()
        self._lock = threading.RLock()
        self.materials: dict[str, BankMaterial] = {}
        self.chunks: dict[str, Chunk] = {}
        self.positions: list[Position] = []
        self._index: BM25Index[str] = BM25Index()
        self._meta_cfg = self._load_meta()
        self._reload()

    def _load_meta(self) -> list[dict[str, Any]]:
        p = self.s.config_dir / "materials.yaml"
        if not p.exists():
            return []
        with p.open(encoding="utf-8") as f:
            return (yaml.safe_load(f) or {}).get("materials", [])

    def _reload(self) -> None:
        with self._lock:
            self.materials = {
                d["id"]: BankMaterial.model_validate(d) for d in self.store.all_json("bank_materials")
            }
            self.chunks = {}
            idx: BM25Index[str] = BM25Index()
            for d in self.store.all_json("bank_chunks"):
                c = Chunk(**d)
                self.chunks[c.id] = c
                title = self.materials[c.material_id].title if c.material_id in self.materials else ""
                idx.add(c.id, f"{title} {c.text}")
            self._index = idx
            self.positions = [Position.model_validate(d) for d in self.store.all_json("bank_positions")]

    # ----------------------------------------------------------- ingest
    def _meta_for(self, filename: str, first_page: str) -> dict[str, Any]:
        hay = normalize(f"{filename} {first_page[:1500]}")
        for m in self._meta_cfg:
            if re.search(m["match"], hay):
                return m
        return {}

    def _vision_notes(self, reader: Any, page_no: int) -> str:
        """Таблицы и графики страницы через мультимодальную модель (если доступна)."""
        gw = get_gateway()
        if not gw.available("bank_vision"):
            return ""
        notes = []
        try:
            images = list(reader.pages[page_no].images)[:2]
        except Exception:  # noqa: BLE001
            return ""
        prompt = load_prompt("bank_vision")
        for im in images:
            if len(im.data) < 15_000:
                continue
            b64 = base64.b64encode(im.data).decode()
            msgs = prompt.render()
            msgs[1]["content"] = [
                {"type": "text", "text": msgs[1]["content"]},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            ]
            try:
                res = gw.complete_json("bank_vision", msgs, prompt_version=prompt.version)
                if isinstance(res.data, dict) and res.data.get("text"):
                    notes.append(str(res.data["text"])[:1500])
            except LLMUnavailable:
                break
        return " ".join(f"[Данные с графика или таблицы] {n}" for n in notes)

    def ingest_pdf(self, path: Path, force: bool = False, use_llm: bool = True) -> BankMaterial:
        from pypdf import PdfReader

        data = path.read_bytes()
        fhash = hashlib.sha256(data).hexdigest()[:24]
        existing = self.store.query("SELECT id FROM bank_materials WHERE file_hash = ?", (fhash,))
        if existing and not force:
            return self.materials[existing[0]["id"]]
        reader = PdfReader(str(path))
        pages = []
        for i, p in enumerate(reader.pages):
            try:
                t = p.extract_text() or ""
            except Exception:  # noqa: BLE001
                t = ""
            t = re.sub(r"[ \t]+", " ", t)
            if use_llm and len(t) < 400:
                t = f"{t} {self._vision_notes(reader, i)}".strip()
            pages.append(t)
        return self.ingest_pages(
            path.name,
            pages,
            fhash,
            fallback_time=datetime.fromtimestamp(path.stat().st_mtime, tz=UTC),
            use_llm=use_llm,
        )

    def ingest_pages(
        self,
        filename: str,
        pages: list[str],
        fhash: str | None = None,
        fallback_time: datetime | None = None,
        use_llm: bool = True,
    ) -> BankMaterial:
        """Материал из уже извлечённого текста страниц (для PDF, других форматов и тестов)."""
        fhash = fhash or hashlib.sha256("\n".join(pages).encode()).hexdigest()[:24]
        first = pages[0] if pages else ""
        meta = self._meta_for(filename, first)
        title = meta.get("title") or next(
            (ln.strip() for ln in first.splitlines() if len(ln.strip()) > 15), Path(filename).stem
        )
        published = _parse_date(first)
        if not published and meta.get("published_at"):
            published = datetime.fromisoformat(str(meta["published_at"])).replace(tzinfo=UTC)
        if not published:
            published = fallback_time or datetime.now(UTC)
        mid = meta.get("id") or short_id("bm", fhash)
        material = BankMaterial(
            id=mid,
            title=truncate(title, 200),
            published_at=published,
            outdated=bool(meta.get("outdated", False)),
        )
        path_name = filename

        with self._lock:
            self.store.execute("DELETE FROM bank_chunks WHERE material_id = ?", (mid,))
            self.store.execute("DELETE FROM bank_positions WHERE material_id = ?", (mid,))
            self.store.put(
                "bank_materials", {"id": mid, "file": path_name, "file_hash": fhash, "data": material.dump()}
            )
            for c in chunk_pages(mid, pages):
                self.store.put(
                    "bank_chunks", {"id": c.id, "material_id": mid, "page": c.page, "data": c.__dict__}
                )
            for pos in self._extract_positions(material, pages, use_llm=use_llm):
                self.store.put(
                    "bank_positions",
                    {"id": pos.id, "material_id": mid, "indicator": pos.indicator, "data": pos.model_dump()},
                )
            self._reload()
        log.info("bank material %s ingested: %s pages", mid, len(pages))
        return material

    def ingest_dir(self, d: Path | None = None, use_llm: bool = True) -> list[BankMaterial]:
        d = d or self.s.materials_dir
        out = []
        if not d.exists():
            return out
        for p in sorted(d.glob("*.pdf")):
            try:
                out.append(self.ingest_pdf(p, use_llm=use_llm))
            except Exception as e:  # noqa: BLE001 — один битый PDF не останавливает остальные
                log.warning("failed to ingest %s: %s", p.name, e)
        return out

    def _extract_positions(self, material: BankMaterial, pages: list[str], use_llm: bool) -> list[Position]:
        gw = get_gateway()
        if use_llm and gw.available("bank_positions"):
            prompt = load_prompt("bank_positions")
            numbered = [{"page": i + 1, "text": truncate(t, 3500)} for i, t in enumerate(pages[:14])]

            def validate(data: dict[str, Any]) -> list[str]:
                problems = []
                for p in data.get("positions", []):
                    page = p.get("page", 0)
                    if not 1 <= page <= len(pages):
                        problems.append(f"страница {page} вне материала")
                        continue
                    if not _quote_in_page(p.get("quote", ""), pages[page - 1]):
                        problems.append(f"цитаты «{p.get('quote', '')[:60]}» нет на странице {page}")
                    # Числа позиции сверяем с цитатой, а не со всей страницей: «11» из даты «11 сентября»
                    # не должно подтверждать «ставку 11%». Годы горизонта допускаются.
                    extra = {
                        n
                        for n in numbers_in(p.get("summary", "")) - numbers_in(p.get("quote", ""))
                        if not (n.isdigit() and 2020 <= int(n) <= 2035)
                    }
                    if extra:
                        problems.append(f"в summary числа {sorted(extra)} отсутствуют в цитате")
                    if p.get("indicator") not in INDICATORS:
                        problems.append(f"неизвестный показатель {p.get('indicator')}")
                return problems

            try:
                res = gw.complete_json(
                    "bank_positions",
                    prompt.render(
                        title=material.title,
                        published_at=material.published_at.date().isoformat(),
                        pages=numbered,
                        indicators={k: v[0] for k, v in INDICATORS.items()},
                    ),
                    schema=_LLMPositions,
                    prompt_version=prompt.version,
                    validate=validate,
                )
                out = []
                for p in res.data.get("positions", []):
                    pos = Position.model_validate(p)
                    pos.material_id = material.id
                    pos.id = short_id("bp", material.id, pos.indicator, pos.quote[:60])
                    out.append(pos)
                if out:
                    return out
            except LLMUnavailable as e:
                log.info("bank_positions llm failed for %s, extractive fallback: %s", material.id, e)
        return extractive_positions(material.id, pages)

    # ------------------------------------------------------------ query
    def is_outdated(self, m: BankMaterial, now: datetime) -> bool:
        return m.outdated or (now - m.published_at) > timedelta(days=self.s.bank_material_outdated_days)

    def material(self, mid: str, now: datetime) -> BankMaterial | None:
        m = self.materials.get(mid)
        if not m:
            return None
        return m.model_copy(update={"outdated": self.is_outdated(m, now)})

    def search(self, query: str, k: int = 4, now: datetime | None = None) -> list[dict[str, Any]]:
        now = now or datetime.now(UTC)
        with self._lock:
            hits = self._index.search(query, k=k * 3)
        out = []
        for h in hits:
            c = self.chunks[h.item]
            m = self.material(c.material_id, now)
            if not m or m.published_at > now:
                continue
            fresh = 1.0 if not m.outdated else 0.5
            out.append(
                {
                    "chunkId": c.id,
                    "materialId": m.id,
                    "title": m.title,
                    "publishedAt": m.published_at.isoformat(),
                    "outdated": m.outdated,
                    "page": c.page,
                    "text": c.text,
                    "score": round(h.score * fresh, 3),
                }
            )
        out.sort(key=lambda x: -x["score"])
        return out[:k]

    def bank_view(
        self, indicators: list[str], query: str = "", now: datetime | None = None
    ) -> tuple[BankView | None, list[dict[str, Any]]]:
        """Позиция банка по показателям: самая свежая неустаревшая; прежняя оценка — в supersedes.
        Возвращает также список рассмотренных позиций для трассы."""
        now = now or datetime.now(UTC)
        cands = []
        for p in self.positions:
            if p.indicator not in indicators:
                continue
            m = self.material(p.material_id, now)
            if not m or m.published_at > now:
                continue
            cands.append((p, m))
        considered = [
            {
                "materialId": m.id,
                "page": p.page,
                "indicator": p.indicator,
                "publishedAt": m.published_at.date().isoformat(),
                "outdated": m.outdated,
                "summary": truncate(p.summary, 160),
            }
            for p, m in cands
        ]
        if not cands:
            return None, considered
        rank = {ind: i for i, ind in enumerate(indicators)}
        qtok = set(tokens(query)) if query else set()

        def key(pm: tuple[Position, BankMaterial]) -> tuple:
            p, m = pm
            overlap = len(qtok & set(tokens(p.summary))) if qtok else 0
            return (m.outdated, rank.get(p.indicator, 99), -m.published_at.timestamp(), -overlap)

        cands.sort(key=key)
        best_p, best_m = cands[0]
        view = BankView(
            summary=best_p.summary, material=BankMaterialCitation(**best_m.model_dump(), page=best_p.page)
        )
        older = [
            (p, m)
            for p, m in cands[1:]
            if p.indicator == best_p.indicator
            and m.published_at < best_m.published_at
            and m.id != best_m.id
            and normalize(p.summary) != normalize(best_p.summary)
        ]
        if older:
            op, om = max(older, key=lambda pm: pm[1].published_at)
            view.supersedes = SupersededBankView(
                summary=op.summary, material=BankMaterialCitation(**om.model_dump(), page=op.page)
            )
        return view, considered

    def list_materials(self, now: datetime | None = None) -> list[dict[str, Any]]:
        now = now or datetime.now(UTC)
        out = []
        for m in sorted(self.materials.values(), key=lambda m: m.published_at, reverse=True):
            mm = self.material(m.id, now)
            out.append(
                {
                    **mm.dump(),
                    "positions": sum(1 for p in self.positions if p.material_id == m.id),
                    "chunks": sum(1 for c in self.chunks.values() if c.material_id == m.id),
                }
            )
        return out

    def mark_outdated(self, mid: str, outdated: bool = True) -> BankMaterial | None:
        m = self.materials.get(mid)
        if not m:
            return None
        m = m.model_copy(update={"outdated": outdated})
        rows = self.store.query("SELECT file, file_hash FROM bank_materials WHERE id = ?", (mid,))
        self.store.put(
            "bank_materials",
            {"id": mid, "file": rows[0]["file"], "file_hash": rows[0]["file_hash"], "data": m.dump()},
        )
        self._reload()
        return m


_lock = threading.Lock()


@lru_cache
def _service(db: str) -> BankService:
    with _lock:
        return BankService(get_store())


def get_bank() -> BankService:
    return _service(str(get_settings().db_path))
