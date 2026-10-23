"""Текстовые утилиты: нормализация, предложения, токены со стеммингом, шинглы для дедупликации."""

from __future__ import annotations

import hashlib
import html
import re
import unicodedata
from functools import lru_cache

import snowballstemmer

_WS = re.compile(r"\s+")
_TAG = re.compile(r"<[^>]+>")
_TOKEN = re.compile(r"[a-zа-я0-9]+(?:[.,][0-9]+)?", re.IGNORECASE)
_SENT = re.compile(r"(?<=[.!?…])\s+(?=[«\"(]?[А-ЯA-Z0-9])")

STOPWORDS = frozenset(
    """и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот
    от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять
    уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без
    будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один
    почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после
    над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед
    иногда лучше чуть том нельзя такой им более всегда конечно всю между это также года году году млн млрд
    тыс руб рублей процента процентов""".split()
)


@lru_cache(maxsize=1)
def _stemmer():
    return snowballstemmer.stemmer("russian")


def clean_html(s: str) -> str:
    s = html.unescape(_TAG.sub(" ", s or ""))
    return _WS.sub(" ", s).strip()


def normalize(s: str) -> str:
    """Нижний регистр, ё→е, единые пробелы и кавычки. Для поиска шаблонов."""
    s = unicodedata.normalize("NFKC", s or "").lower().replace("ё", "е")
    s = s.replace(" ", " ").replace("–", "-").replace("—", "-")
    return _WS.sub(" ", s).strip()


def sentences(s: str) -> list[str]:
    s = _WS.sub(" ", s or "").strip()
    if not s:
        return []
    parts = _SENT.split(s)
    return [p.strip() for p in parts if p.strip()]


def tokens(s: str, stem: bool = True) -> list[str]:
    toks = [t for t in _TOKEN.findall(normalize(s)) if t not in STOPWORDS and len(t) > 1]
    if stem:
        st = _stemmer()
        toks = [st.stemWord(t) if not t[0].isdigit() else t for t in toks]
    return toks


def shingles(s: str, k: int = 3) -> set[str]:
    toks = tokens(s, stem=True)
    if len(toks) < k:
        return {" ".join(toks)} if toks else set()
    return {" ".join(toks[i : i + k]) for i in range(len(toks) - k + 1)}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def content_hash(*parts: str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(normalize(p).encode("utf-8"))
        h.update(b"\x00")
    return h.hexdigest()[:24]


def short_id(prefix: str, *parts: str) -> str:
    return f"{prefix}-{content_hash(*parts)[:16]}"


_NUM = re.compile(r"(?<![\w.,])(\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,](\d+))?")


def numbers_in(s: str) -> set[str]:
    """Числа в тексте в каноническом виде: «14,0» и «14» -> {"14"}, «1 200» -> {"1200"}."""
    out: set[str] = set()
    for m in _NUM.finditer(s or ""):
        whole = re.sub(r"[  ]", "", m.group(1))
        frac = (m.group(2) or "").rstrip("0")
        out.add(f"{int(whole)}.{frac}" if frac else str(int(whole)))
    return out


_PCT = re.compile(r"(\d+(?:[.,]\d+)?)(?:\s*[–\-—]\s*(\d+(?:[.,]\d+)?))?\s*(?:%|процент|п\.\s?п\.)")


def _canon(num: str) -> str:
    whole, _, frac = num.replace(",", ".").partition(".")
    frac = frac.rstrip("0")
    return f"{int(whole)}.{frac}" if frac else str(int(whole))


def percents_in(s: str) -> set[str]:
    """Проценты в тексте: «14,0%» -> {"14"}, «7,1–7,6%» -> {"7.1", "7.6"}.
    Нужны, чтобы «11 сентября» не подтверждало «11%»."""
    out: set[str] = set()
    for m in _PCT.finditer(s or ""):
        out.add(_canon(m.group(1)))
        if m.group(2):
            out.add(_canon(m.group(2)))
    return out


def truncate(s: str, n: int) -> str:
    s = (s or "").strip()
    if len(s) <= n:
        return s
    cut = s[: n - 1]
    sp = cut.rfind(" ")
    if sp > n * 0.6:
        cut = cut[:sp]
    return cut.rstrip(",.;:— ") + "…"
