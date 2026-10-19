"""Transactional email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).

Without RESEND_API_KEY nothing is sent: the message, link included, is written to the log so local
development and first deploys still work. Sending never raises; callers get True when Resend accepted it.
"""
import html
import logging

import httpx

from ..config import get_settings

log = logging.getLogger("news.email")
RESEND_URL = "https://api.resend.com/emails"


def _layout(heading: str, lines: list[str], button: str, link: str) -> str:
    paras = "".join(f'<p style="margin:0 0 14px">{html.escape(line)}</p>' for line in lines)
    return (
        '<div style="font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#1b1d2b;max-width:520px;margin:0 auto;padding:24px">'
        f'<h1 style="font-size:20px;margin:0 0 16px">{html.escape(heading)}</h1>{paras}'
        f'<p style="margin:22px 0"><a href="{html.escape(link, quote=True)}" '
        'style="background:#3c63ed;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;display:inline-block">'
        f"{html.escape(button)}</a></p>"
        f'<p style="margin:0;color:#6b6e80;font-size:13px">Or open this link: {html.escape(link)}</p></div>'
    )


def send(to: str, subject: str, heading: str, lines: list[str], button: str, link: str) -> bool:
    settings = get_settings()
    text = "\n\n".join([heading, *lines, f"{button}: {link}"])
    if not settings.email_enabled:
        log.warning("email not configured (RESEND_API_KEY); would send to %s: %s -> %s", to, subject, link)
        return False
    try:
        response = httpx.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [to], "subject": subject, "html": _layout(heading, lines, button, link), "text": text},
            timeout=10,
        )
        response.raise_for_status()
        return True
    except httpx.HTTPError as exc:
        log.error("email to %s failed: %s", to, exc)
        return False
