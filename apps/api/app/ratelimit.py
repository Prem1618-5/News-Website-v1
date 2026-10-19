"""In-memory sliding-window limiter for auth endpoints (per process; good enough for brute-force friction)."""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from .config import get_settings

WINDOW_S = 300
MAX_KEYS = 10_000


def client_ip(request: Request) -> str:
    # Behind a trusted proxy every request arrives from the proxy. The proxy appends the real client as the
    # rightmost X-Forwarded-For entry; anything to its left is client-supplied and must not be trusted.
    if get_settings().trust_proxy:
        forwarded = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
        if forwarded:
            return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "-"


class Limiter:
    def __init__(self, limit: int, message: str = "Too many attempts. Try again in a few minutes."):
        self.limit = limit
        self.message = message
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _window(self, key: str) -> deque[float]:
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] > WINDOW_S:
            q.popleft()
        return q

    def check(self, key: str) -> None:
        if len(self._window(key)) >= self.limit:
            raise HTTPException(429, self.message)

    def hit(self, key: str) -> None:
        if len(self._hits) > MAX_KEYS:
            # Evict idle keys first, then the oldest, so a flood of new keys cannot wipe active counters.
            for key in [k for k in self._hits if not self._window(k)]:
                del self._hits[key]
            while len(self._hits) > MAX_KEYS:
                del self._hits[next(iter(self._hits))]
        self._window(key).append(time.monotonic())

    def reset(self, key: str) -> None:
        self._hits.pop(key, None)
