"""BM25 по русским текстам со стеммингом Snowball.

Почему BM25, а не эмбеддинги: в кейсе разрешены только перечисленные LLM, отдельной модели
эмбеддингов в списке нет. BM25 работает локально, детерминирован и объясним. Если организаторы
разрешат эмбеддинги, поиск расширяется до гибридного без смены интерфейса search().
"""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field
from typing import Generic, TypeVar

from radar_ml.nlp.text import tokens

T = TypeVar("T")


@dataclass
class Hit(Generic[T]):
    item: T
    score: float


@dataclass
class BM25Index(Generic[T]):
    k1: float = 1.4
    b: float = 0.75
    items: list[T] = field(default_factory=list)
    _tf: list[Counter[str]] = field(default_factory=list)
    _len: list[int] = field(default_factory=list)
    _df: Counter[str] = field(default_factory=Counter)

    def add(self, item: T, text: str) -> None:
        toks = tokens(text)
        tf = Counter(toks)
        self.items.append(item)
        self._tf.append(tf)
        self._len.append(len(toks))
        self._df.update(tf.keys())

    def __len__(self) -> int:
        return len(self.items)

    def search(self, query: str, k: int = 5, min_score: float = 0.0) -> list[Hit[T]]:
        if not self.items:
            return []
        q = [t for t in tokens(query)]
        if not q:
            return []
        n = len(self.items)
        avg = sum(self._len) / n or 1.0
        scores: list[tuple[float, int]] = []
        for i, tf in enumerate(self._tf):
            s = 0.0
            dl = self._len[i]
            for t in set(q):
                f = tf.get(t)
                if not f:
                    continue
                df = self._df[t]
                idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
                s += idf * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * dl / avg))
            if s > min_score:
                scores.append((s, i))
        scores.sort(key=lambda x: (-x[0], x[1]))
        return [Hit(self.items[i], s) for s, i in scores[:k]]
