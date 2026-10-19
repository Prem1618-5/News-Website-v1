"""Asks the static host to rebuild the Reader after the Newsroom publishes or removes a story.

The Reader is prerendered, so a new story is only crawlable as plain HTML once the site is rebuilt.
Set NEWS_DEPLOY_HOOK_URL to the host's deploy hook (Cloudflare Pages, Netlify, Vercel, Render all offer one).
Calls are debounced so a burst of publishes causes one build. Without a hook this does nothing.
"""
import logging
import os
import threading

import httpx

from ..config import get_settings

log = logging.getLogger("news.rebuild")
DEBOUNCE_S = 45
_timer: threading.Timer | None = None
_lock = threading.Lock()


def _fire(url: str) -> None:
    global _timer
    with _lock:
        _timer = None
    try:
        httpx.post(url, timeout=10).raise_for_status()
        log.info("rebuild requested")
    except httpx.HTTPError as exc:
        log.warning("rebuild hook failed: %s", exc)


def request_rebuild() -> None:
    global _timer
    url = get_settings().deploy_hook_url
    if not url:
        return
    # Serverless instances are frozen after the response, so a timer would never fire: call straight away.
    if os.environ.get("VERCEL"):
        _fire(url)
        return
    with _lock:
        if _timer is None:
            _timer = threading.Timer(DEBOUNCE_S, _fire, args=(url,))
            _timer.daemon = True
            _timer.start()
