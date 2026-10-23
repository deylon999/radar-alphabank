"""Конвейер новостей: статья -> извлечение -> дедупликация -> событие.

Событие — один факт, о котором могут писать несколько источников. Перепечатка не создаёт новое
событие; существенное обновление (сменилась стадия, появились новые числа) повышает версию события,
чтобы бэкенд пересчитал выводы, но не рассылал повторную тревогу о той же версии.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

from radar_ml.domain import get_domain
from radar_ml.news.extract import llm_extract, merge_extraction, rule_extract
from radar_ml.news.sources import SourceConfig, fetch_article, fetch_rss, load_sources
from radar_ml.nlp.text import content_hash, jaccard, normalize, numbers_in, shingles, short_id, truncate
from radar_ml.retrieval.bm25 import BM25Index
from radar_ml.schemas import Article, Event, NewsSource
from radar_ml.settings import get_settings
from radar_ml.store import Store, get_store

log = logging.getLogger(__name__)

CLUSTER_WINDOW = timedelta(days=4)


class NewsService:
    def __init__(self, store: Store):
        self.store = store
        self._lock = threading.RLock()
        self.events: dict[str, Event] = {}
        self._shingles: dict[str, set[str]] = {}
        self._index: BM25Index[str] | None = None
        self.sources = {s.id: s for s in load_sources()}
        for d in store.all_json("events"):
            ev = Event.model_validate(d)
            self.events[ev.id] = ev
            self._shingles[ev.id] = shingles(f"{ev.title} {ev.summary}")

    # ------------------------------------------------------------ queries
    def get(self, event_id: str) -> Event | None:
        return self.events.get(event_id)

    def list(self, since: datetime | None = None, relevant_only: bool = True) -> list[Event]:
        with self._lock:
            snapshot = list(self.events.values())
        evs = [e for e in snapshot if (not relevant_only or e.business_relevant)]
        if since:
            evs = [e for e in evs if (e.occurred_at or e.created_at) >= since]
        return sorted(evs, key=lambda e: e.occurred_at or e.created_at, reverse=True)

    def search(
        self, query: str, k: int = 5, exclude: str | None = None, before: datetime | None = None
    ) -> list[tuple[Event, float]]:
        with self._lock:
            if self._index is None or len(self._index) != len(self.events):
                idx: BM25Index[str] = BM25Index()
                for e in self.events.values():
                    idx.add(e.id, f"{e.title} {e.title} {e.summary} {' '.join(c.text for c in e.claims[:3])}")
                self._index = idx
            hits = self._index.search(query, k=k + 5)
        out = []
        for h in hits:
            e = self.events[h.item]
            if e.id == exclude or not e.business_relevant:
                continue
            if before and (e.occurred_at or e.created_at) > before:
                continue
            out.append((e, h.score))
        return out[:k]

    # ------------------------------------------------------------ ingest
    def _source(self, art: Article) -> SourceConfig | None:
        return self.sources.get(art.source_id)

    def _find_cluster(self, art: Article, factors: list[str], stage: str) -> tuple[Event | None, float]:
        sh = shingles(f"{art.title} {truncate(art.text, 400)}")
        nums = numbers_in(art.title)
        best: tuple[Event | None, float] = (None, 0.0)
        for ev in list(self.events.values()):
            t = ev.occurred_at or ev.created_at
            if abs(t - art.published_at) > CLUSTER_WINDOW:
                continue
            js = jaccard(sh, self._shingles.get(ev.id, set()))
            same_factor = bool(set(factors[:2]) & set(ev.entities.factors[:2]))
            num_overlap = bool(nums & numbers_in(ev.title)) and bool(nums)
            score = js
            if same_factor and num_overlap and abs(t - art.published_at) <= timedelta(days=1):
                score = max(score, 0.55)
            # Официальное решение и публикации о нём в тот же день: в тексте статьи есть числа из заголовка решения.
            ev_nums = numbers_in(ev.title)
            if (
                ev.official
                and same_factor
                and ev_nums
                and ev_nums <= numbers_in(f"{art.title} {art.text}")
                and abs(t - art.published_at) <= timedelta(days=1)
            ):
                score = max(score, 0.5)
            elif same_factor and js >= 0.2:
                score = max(score, js + 0.2)
            if score > best[1]:
                best = (ev, score)
        return best if best[1] >= 0.45 else (None, best[1])

    def ingest(self, art: Article, use_llm: bool = True) -> tuple[Event, str]:
        """Возвращает событие и тип изменения: new, reprint, update, same."""
        with self._lock:
            dup = self.store.query(
                "SELECT event_id FROM articles WHERE id = ? OR content_hash = ?", (art.id, art.content_hash)
            )
            if dup and dup[0]["event_id"] in self.events:
                return self.events[dup[0]["event_id"]], "reprint"

            src = self._source(art)
            official = bool(src and src.official)
            rules = rule_extract(art.title, art.text, official=official)
            llm = (
                llm_extract(art.title, art.text, art.published_at, rules)
                if use_llm and rules.business_relevant
                else None
            )
            ext, llm_title, llm_summary = merge_extraction(rules, llm)

            ns = NewsSource(
                id=art.id,
                title=art.title,
                publisher=art.publisher,
                url=art.url,
                published_at=art.published_at,
            )
            now = datetime.now(UTC)
            cluster, sim = self._find_cluster(art, list(ext.factors), ext.stage)
            change = "new"
            if cluster:
                ev = cluster
                change = "reprint" if sim >= 0.8 else "same"
                if art.source_id not in ev.source_ids:
                    ev.source_ids.append(art.source_id)
                if art.id not in ev.article_ids:
                    ev.article_ids.append(art.id)
                    ev.sources.append(ns)
                    ev.sources.sort(key=lambda s: s.published_at)
                new_numbers = {n.value for n in ext.entities.numbers} - {n.value for n in ev.entities.numbers}
                stage_order = {"discussed": 0, "occurred": 1, "decided": 2, "resolved": 3}
                if stage_order.get(ext.stage, 1) > stage_order.get(ev.stage, 1) and change != "reprint":
                    ev.stage = ext.stage  # type: ignore[assignment]
                    ev.version += 1
                    change = "update"
                elif new_numbers and change != "reprint" and len(ev.entities.numbers) < 12:
                    ev.entities.numbers.extend(n for n in ext.entities.numbers if n.value in new_numbers)
                    ev.version += 1
                    change = "update"
                for f in ext.factors:
                    if f not in ev.entities.factors:
                        ev.entities.factors.append(f)
                ev.official = ev.official or official
                ev.updated_at = now
            else:
                title = llm_title or art.title
                summary = llm_summary or truncate(art.text or art.title, 420)
                ev = Event(
                    id=short_id("ev", art.id),
                    title=truncate(title, 160),
                    summary=summary,
                    topic=ext.topic,
                    stage=ext.stage,  # type: ignore[arg-type]
                    occurred_at=art.published_at,
                    place=ext.place,
                    entities=ext.entities,
                    directions=ext.directions,
                    claims=[c.model_copy(update={"source_id": art.id}) for c in ext.claims],
                    article_ids=[art.id],
                    source_ids=[art.source_id],
                    sources=[ns],
                    official=official,
                    business_relevant=ext.business_relevant,
                    importance=ext.importance,
                    extraction="llm" if llm else "rules",
                    created_at=now,
                    updated_at=now,
                )
            self.events[ev.id] = ev
            self._shingles[ev.id] = shingles(f"{ev.title} {ev.summary}")
            self._index = None
            self.store.put(
                "articles",
                {
                    "id": art.id,
                    "source_id": art.source_id,
                    "url": art.url,
                    "title": art.title,
                    "published_at": art.published_at.isoformat(),
                    "content_hash": art.content_hash,
                    "event_id": ev.id,
                    "data": art.dump(),
                },
            )
            self.store.put(
                "events",
                {
                    "id": ev.id,
                    "version": ev.version,
                    "topic": ev.topic,
                    "occurred_at": (ev.occurred_at or ev.created_at).isoformat(),
                    "updated_at": ev.updated_at.isoformat(),
                    "data": ev.dump(),
                },
            )
            return ev, change

    def ingest_text(
        self,
        title: str,
        text: str,
        url: str | None = None,
        publisher: str | None = None,
        published_at: datetime | None = None,
    ) -> tuple[Event, str]:
        now = datetime.now(UTC)
        art = Article(
            id=short_id("art", url or title, text[:200]),
            url=url or "",
            title=title.strip(),
            text=text.strip(),
            publisher=publisher or "Добавлено пользователем",
            source_id="user:text",
            published_at=published_at or now,
            fetched_at=now,
            content_hash=content_hash(title, text[:500]),
            synthetic=url is None,
        )
        return self.ingest(art)

    def ingest_url(self, url: str) -> tuple[Event, str]:
        return self.ingest(fetch_article(url))

    def collect(self, source_ids: list[str] | None = None, use_llm: bool = True) -> dict[str, Any]:
        report: dict[str, Any] = {"sources": {}, "new": 0, "updated": 0, "reprints": 0}
        for src in self.sources.values():
            if not src.enabled or (source_ids and src.id not in source_ids):
                continue
            try:
                arts = fetch_rss(src)
            except Exception as e:  # noqa: BLE001 — сбой одного источника не останавливает остальные
                log.warning("source %s failed: %s", src.id, e)
                report["sources"][src.id] = {"ok": False, "error": str(e)[:200]}
                continue
            n = 0
            for a in arts:
                _, change = self.ingest(a, use_llm=use_llm)
                n += 1
                report["new" if change == "new" else "updated" if change == "update" else "reprints"] += 1
            report["sources"][src.id] = {"ok": True, "articles": n}
        return report

    def load_snapshot(self, path: Path, use_llm: bool = False) -> int:
        """Снимок новостей для воспроизводимой проверки без доступа к внешним источникам."""
        if not path.exists():
            return 0
        n = 0
        now = datetime.now(UTC)
        with path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("//"):
                    continue
                d = json.loads(line)
                published = datetime.fromisoformat(d["published_at"])
                if published.tzinfo is None:
                    published = published.replace(tzinfo=UTC)
                art = Article(
                    id=d.get("id") or short_id("art", d["url"] or d["title"]),
                    url=d.get("url", ""),
                    title=d["title"],
                    text=d.get("text", ""),
                    publisher=d["publisher"],
                    source_id=d.get("source_id", "snapshot"),
                    published_at=published,
                    fetched_at=now,
                    content_hash=content_hash(d["title"], d.get("text", "")[:500]),
                    synthetic=bool(d.get("synthetic", False)),
                )
                self.ingest(art, use_llm=use_llm)
                n += 1
        return n


_lock = threading.Lock()


@lru_cache
def _service(db: str) -> NewsService:
    with _lock:
        return NewsService(get_store())


def get_news() -> NewsService:
    return _service(str(get_settings().db_path))


def event_text(ev: Event) -> str:
    return normalize(f"{ev.title} {ev.summary} {' '.join(c.text for c in ev.claims)}")


__all__ = ["NewsService", "get_news", "event_text", "get_domain"]
