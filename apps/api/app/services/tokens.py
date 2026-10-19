"""One-time links for invites and password resets.

The raw token only ever exists in the link; the database keeps its SHA-256, so a leaked database cannot be
used to reset anyone's password. Issuing a new link cancels the older unused ones for the same purpose.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from ..models import AuthToken

RESET_HOURS = 1
INVITE_HOURS = 72


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _aware(at: datetime) -> datetime:
    # SQLite returns naive datetimes; everything here is stored in UTC.
    return at if at.tzinfo else at.replace(tzinfo=timezone.utc)


def issue(db: Session, kind: str, subject_id: str, purpose: str, hours: int) -> str:
    now = datetime.now(timezone.utc)
    for old in db.exec(select(AuthToken).where(
        AuthToken.subject_kind == kind, AuthToken.subject_id == subject_id, AuthToken.purpose == purpose, AuthToken.used_at == None,  # noqa: E711
    )).all():
        old.used_at = now
        db.add(old)
    raw = secrets.token_urlsafe(32)
    db.add(AuthToken(token_hash=_hash(raw), subject_kind=kind, subject_id=subject_id, purpose=purpose, expires_at=now + timedelta(hours=hours)))
    db.commit()
    return raw


def peek(db: Session, raw: str, kind: str) -> AuthToken | None:
    """The token if it is still usable, without using it up."""
    row = db.get(AuthToken, _hash(raw or ""))
    if not row or row.subject_kind != kind or row.used_at is not None:
        return None
    if _aware(row.expires_at) < datetime.now(timezone.utc):
        return None
    return row


def consume(db: Session, raw: str, kind: str) -> AuthToken | None:
    row = peek(db, raw, kind)
    if row:
        row.used_at = datetime.now(timezone.utc)
        db.add(row)
    return row
