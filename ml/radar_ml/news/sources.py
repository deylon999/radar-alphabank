"""Источники новостей: адаптеры RSS и загрузка статьи по ссылке.

Ссылки загружаются с защитой: только http(s), без внутренних и частных адресов, с лимитом размера,
времени и числа перенаправлений.
"""

from __future__ import annotations

import ipaddress
import logging
import socket
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import feedparser
import httpx
import yaml

from radar_ml.nlp.text import clean_html, content_hash, short_id
from radar_ml.schemas import Article
from radar_ml.settings import get_settings

log = logging.getLogger(__name__)

MAX_BYTES = 3_000_000
MAX_REDIRECTS = 3


@dataclass(frozen=True)
class SourceConfig:
    id: str
    publisher: str
    kind: str
    url: str
    trust: float = 0.8
    official: bool = False
    enabled: bool = True


def load_sources(path: Path | None = None) -> list[SourceConfig]:
    p = path or get_settings().config_dir / "sources.yaml"
    with p.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return [SourceConfig(**s) for s in data["sources"]]


class UnsafeURL(ValueError):
    pass


def check_public_url(url: str) -> None:
    u = urlparse(url)
    if u.scheme not in ("http", "https") or not u.hostname:
        raise UnsafeURL("разрешены только http(s)-ссылки")
    try:
        infos = socket.getaddrinfo(u.hostname, None)
    except socket.gaierror as e:
        raise UnsafeURL(f"не удалось разрешить адрес {u.hostname}") from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise UnsafeURL("ссылка ведёт во внутреннюю сеть")


def fetch_public(url: str, timeout: float | None = None) -> httpx.Response:
    s = get_settings()
    current = url
    with httpx.Client(
        timeout=timeout or s.news_fetch_timeout_s,
        follow_redirects=False,
        headers={"User-Agent": s.news_user_agent},
    ) as c:
        for _ in range(MAX_REDIRECTS + 1):
            check_public_url(current)
            with c.stream("GET", current) as r:
                if r.is_redirect and r.headers.get("location"):
                    current = str(httpx.URL(current).join(r.headers["location"]))
                    continue
                r.raise_for_status()
                chunks, size = [], 0
                for ch in r.iter_bytes():
                    size += len(ch)
                    if size > MAX_BYTES:
                        raise UnsafeURL("страница слишком большая")
                    chunks.append(ch)
                return httpx.Response(
                    r.status_code, headers=r.headers, content=b"".join(chunks), request=r.request
                )
    raise UnsafeURL("слишком много перенаправлений")


def _entry_time(e: Any) -> datetime:
    for key in ("published_parsed", "updated_parsed"):
        t = e.get(key)
        if t:
            return datetime(*t[:6], tzinfo=UTC)
    for key in ("published", "updated"):
        if e.get(key):
            try:
                return parsedate_to_datetime(e[key]).astimezone(UTC)
            except (TypeError, ValueError):
                pass
    return datetime.now(UTC)


def fetch_rss(src: SourceConfig, limit: int = 60) -> list[Article]:
    resp = fetch_public(src.url)
    feed = feedparser.parse(resp.content)
    now = datetime.now(UTC)
    out = []
    for e in feed.entries[:limit]:
        title = clean_html(e.get("title", ""))
        link = e.get("link", "")
        if not title or not link:
            continue
        body = clean_html(e.get("summary", "") or e.get("description", ""))
        if "content" in e and e.content:
            full = clean_html(e.content[0].get("value", ""))
            if len(full) > len(body):
                body = full
        out.append(
            Article(
                id=short_id("art", link),
                url=link,
                title=title,
                text=body[:8000],
                publisher=src.publisher,
                source_id=src.id,
                published_at=_entry_time(e),
                fetched_at=now,
                content_hash=content_hash(title, body[:500]),
            )
        )
    return out


def fetch_article(url: str, publisher: str | None = None) -> Article:
    """Новость по ссылке: текст извлекается trafilatura."""
    import trafilatura

    resp = fetch_public(url)
    html = resp.text
    meta = trafilatura.extract_metadata(html)
    text = trafilatura.extract(html, include_comments=False, include_tables=False) or ""
    title = (meta.title if meta and meta.title else "") or clean_html(text[:120])
    published = datetime.now(UTC)
    if meta and meta.date:
        try:
            published = datetime.fromisoformat(meta.date).replace(tzinfo=UTC)
        except ValueError:
            pass
    host = urlparse(url).hostname or "источник"
    return Article(
        id=short_id("art", url),
        url=url,
        title=title.strip(),
        text=text[:20000],
        publisher=publisher or (meta.sitename if meta and meta.sitename else host),
        source_id=f"user:{host}",
        published_at=published,
        fetched_at=datetime.now(UTC),
        content_hash=content_hash(title, text[:500]),
    )
