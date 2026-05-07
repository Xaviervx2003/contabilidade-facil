"""
Rate limiter simples em memoria por janela fixa.
Uso recomendado para endpoints criticos (login/importacao/consultas pesadas).
"""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Tuple


class InMemoryRateLimiter:
    def __init__(self):
        self._events = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            bucket = self._events[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(window_seconds - (now - bucket[0])))
                return False, retry_after
            bucket.append(now)
            return True, 0


rate_limiter = InMemoryRateLimiter()
