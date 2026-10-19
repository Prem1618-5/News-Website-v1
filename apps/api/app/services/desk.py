"""Newsroom rules in one place: who may see, edit, review and publish a story, and how people are managed.

Roles: reporter < editor < admin.
  - Reporters write. They send stories to their editor (`reports_to`), or publish straight away when trusted.
  - Editors review (any submitted story, their own reporters first), edit, publish and unpublish; they add
    reporters, who then report to them, and can mark their reporters trusted.
  - Admins do everything editors do and manage everyone: add editors and admins, change roles, move
    reporters between editors, approve people who asked to join, suspend accounts.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlmodel import Session, select

from ..models import ArticleRevision, NewsroomArticle, Notice, StaffAccount

RANK = {"reporter": 1, "editor": 2, "admin": 3}
COALESCE = timedelta(minutes=10)
SNAPSHOT_FIELDS = (
    "headline_en", "standfirst_en", "body_en", "headline_hi", "standfirst_hi", "body_hi",
    "section", "scope", "state", "district", "priority", "hero",
)


def now() -> datetime:
    return datetime.now(timezone.utc)


def aware(at: datetime | None) -> datetime | None:
    if at is None:
        return None
    return at if at.tzinfo else at.replace(tzinfo=timezone.utc)


def iso(at: datetime | None) -> str | None:
    at = aware(at)
    return at.isoformat().replace("+00:00", "Z") if at else None


def senior(actor: StaffAccount) -> bool:
    return actor.role in ("editor", "admin")


def publishes_directly(actor: StaffAccount) -> bool:
    return senior(actor) or actor.trusted


# ------------------------------------------------------------ stories


def can_view(actor: StaffAccount, art: NewsroomArticle) -> bool:
    return art.author_id == actor.staff_id or senior(actor)


def can_edit(actor: StaffAccount, art: NewsroomArticle) -> bool:
    """Writers edit their drafts and returned stories (and their live stories when they publish directly).
    Seniors edit other people's stories while they wait for review and after they are live, never while
    the story is back with its writer, so two people never type into the same draft."""
    if art.author_id == actor.staff_id:
        return art.status in ("draft", "changes_requested") or (art.status == "published" and publishes_directly(actor))
    return senior(actor) and art.status in ("submitted", "published")


def can_review(actor: StaffAccount, art: NewsroomArticle) -> bool:
    return senior(actor) and art.status == "submitted" and art.author_id != actor.staff_id


def permissions(actor: StaffAccount, art: NewsroomArticle) -> dict:
    own = art.author_id == actor.staff_id
    return {
        "edit": can_edit(actor, art),
        "review": can_review(actor, art),
        "submit": own and art.status in ("draft", "changes_requested") and not publishes_directly(actor),
        "publish": (own and art.status in ("draft", "changes_requested") and publishes_directly(actor)) or can_review(actor, art),
        "update_live": art.status == "published" and can_edit(actor, art),
        "unpublish": art.status == "published" and senior(actor),
        "reopen": art.status in ("rejected", "unpublished") and (own or senior(actor)),
        "delete": art.status in ("draft", "changes_requested", "rejected") and not art.story_id and (own or actor.role == "admin"),
        "check": art.status == "published" and art.needs_check and senior(actor) and not own,
        "note": senior(actor) or own,
    }


def require(allowed: bool, message: str = "You cannot do this with this story.") -> None:
    if not allowed:
        raise HTTPException(403, message)


def snapshot(art: NewsroomArticle) -> dict:
    return {k: getattr(art, k) for k in SNAPSHOT_FIELDS}


def record(db: Session, art: NewsroomArticle, actor: StaffAccount, kind: str, summary: str = "", with_snapshot: bool = False) -> None:
    """Add to the story's history. Edits by the same person within 10 minutes fold into one entry."""
    at = now()
    snap = snapshot(art) if with_snapshot or kind == "edit" else None
    if kind == "edit":
        last = db.exec(
            select(ArticleRevision).where(ArticleRevision.article_id == art.id).order_by(ArticleRevision.id.desc())  # type: ignore[union-attr]
        ).first()
        if last and last.kind == "edit" and last.actor_id == actor.staff_id and at - aware(last.updated_at) < COALESCE:
            last.snapshot, last.updated_at = snap, at
            last.summary = summary or last.summary
            db.add(last)
            return
    db.add(ArticleRevision(article_id=art.id, actor_id=actor.staff_id, kind=kind, summary=summary, snapshot=snap, created_at=at, updated_at=at))


# ------------------------------------------------------------ people


def staff_by_id(db: Session, staff_id: str) -> StaffAccount | None:
    return db.exec(select(StaffAccount).where(StaffAccount.staff_id == staff_id)).first() if staff_id else None


def active_seniors(db: Session) -> list[StaffAccount]:
    return list(db.exec(select(StaffAccount).where(StaffAccount.status == "active", StaffAccount.role.in_(["editor", "admin"]))).all())  # type: ignore[attr-defined]


def reviewers_for(db: Session, author: StaffAccount, breaking: bool) -> list[StaffAccount]:
    """Who hears about a submitted story: the writer's editor, or every editor and admin when the writer has
    no active editor or the story is breaking."""
    editor = staff_by_id(db, author.reports_to)
    if editor and editor.status == "active" and not breaking:
        return [editor]
    return [s for s in active_seniors(db) if s.staff_id != author.staff_id]


def notify(db: Session, recipients: list[StaffAccount] | list[str], kind: str, text: str, article_id: str = "") -> None:
    seen: set[str] = set()
    for r in recipients:
        rid = r if isinstance(r, str) else r.staff_id
        if rid and rid not in seen:
            seen.add(rid)
            db.add(Notice(recipient_id=rid, kind=kind, text=text[:300], article_id=article_id))


def can_manage(actor: StaffAccount, person: StaffAccount) -> bool:
    """Admins manage everyone but themselves; editors manage the reporters who report to them."""
    if actor.staff_id == person.staff_id:
        return False
    if actor.role == "admin":
        return True
    return actor.role == "editor" and person.role == "reporter" and person.reports_to == actor.staff_id


def can_create(actor: StaffAccount, role: str) -> bool:
    if actor.role == "admin":
        return role in RANK
    return actor.role == "editor" and role == "reporter"
