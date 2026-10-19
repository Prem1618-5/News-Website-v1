"""Newsroom workspace API: stories from draft to published, review highlights, history, media and notices.

Every rule lives in services/desk.py; this module only checks them and moves data.
"""
from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlmodel import select

from ..database import DB
from ..models import AnalyticsEvent, ArticleRevision, NewsroomArticle, Notice, ReviewNote, StaffAccount
from ..security import CurrentStaff
from ..services import desk
from ..services.desk import iso, now, permissions, record, require
from ..services.doc import clean_doc, doc_text, safe_media, word_count
from ..services.publish import languages_of, publish, unpublish
from ..taxonomy import SCOPE_KEYS, SECTION_KEYS, STATE_CODES, is_district

router = APIRouter(prefix="/api/desk", tags=["newsroom desk"])

Lang = Literal["en", "hi"]
Scope = Literal["local", "state", "india", "world"]
Priority = Literal["normal", "breaking"]


# ------------------------------------------------------------ bodies


class Hero(BaseModel):
    kind: Literal["image", "video"] = "image"
    src: str = Field(default="", max_length=500)
    poster: str = Field(default="", max_length=500)
    alt: str = Field(default="", max_length=300)
    caption: str = Field(default="", max_length=400)
    credit: str = Field(default="", max_length=200)


class ArticlePatch(BaseModel):
    """Any subset of a story's fields. `version` is required on updates so two people cannot overwrite each other."""
    version: int | None = None
    primary_language: Lang | None = None
    headline_en: str | None = Field(default=None, max_length=300)
    standfirst_en: str | None = Field(default=None, max_length=600)
    body_en: dict[str, Any] | None = None
    headline_hi: str | None = Field(default=None, max_length=300)
    standfirst_hi: str | None = Field(default=None, max_length=600)
    body_hi: dict[str, Any] | None = None
    unproofed: list[Lang] | None = None
    section: str | None = None
    scope: Scope | None = None
    state: str | None = Field(default=None, max_length=4)
    district: str | None = Field(default=None, max_length=40)
    priority: Priority | None = None
    tags: list[Annotated[str, Field(max_length=40)]] | None = Field(default=None, max_length=12)
    hero: Hero | None = None
    clear_hero: bool = False


class Send(BaseModel):
    """The publish sheet: who the story is for and how urgent it is. Applied before sending or publishing."""
    scope: Scope | None = None
    state: str | None = Field(default=None, max_length=4)
    district: str | None = Field(default=None, max_length=40)
    priority: Priority | None = None
    section: str | None = None
    version: int | None = None
    message: str = Field(default="", max_length=1000)


class Decision(BaseModel):
    message: str = Field(default="", max_length=1000)


class NoteIn(BaseModel):
    id: str = Field(min_length=4, max_length=40, pattern=r"^[\w-]+$")
    kind: Literal["problem", "suggestion", "comment"]
    lang: Lang = "en"
    quote: str = Field(default="", max_length=600)
    suggestion: str = Field(default="", max_length=2000)
    message: str = Field(default="", max_length=1000)


class NotePatch(BaseModel):
    status: Literal["open", "done", "accepted", "dismissed"] | None = None
    reply: str = Field(default="", max_length=1000)


# ------------------------------------------------------------ helpers


def _staff_map(db: DB, ids: set[str]) -> dict[str, StaffAccount]:
    if not ids:
        return {}
    rows = db.exec(select(StaffAccount).where(StaffAccount.staff_id.in_(list(ids)))).all()  # type: ignore[attr-defined]
    return {r.staff_id: r for r in rows}


def _person(a: StaffAccount | None, fallback: str = "") -> dict:
    if not a:
        return {"id": fallback, "name": "Former staff", "role": "reporter"}
    return {"id": a.staff_id, "name": a.display_name, "role": a.role}


def _open_notes(db: DB, art_id: str) -> int:
    return db.exec(select(func.count()).select_from(ReviewNote).where(ReviewNote.article_id == art_id, ReviewNote.status == "open")).one()


def _summary(art: NewsroomArticle, people: dict[str, StaffAccount], open_notes: int = 0) -> dict:
    lang = art.primary_language
    body = art.body_en if lang == "en" else art.body_hi
    headline = getattr(art, f"headline_{lang}") or art.headline_en or art.headline_hi
    return {
        "id": art.id,
        "status": art.status,
        "version": art.version,
        "primary_language": lang,
        "languages": languages_of(art),
        "headline": headline,
        "standfirst": getattr(art, f"standfirst_{lang}") or art.standfirst_en or art.standfirst_hi,
        "section": art.section,
        "scope": art.scope,
        "state": art.state,
        "district": art.district,
        "priority": art.priority,
        "hero": art.hero or None,
        "author": _person(people.get(art.author_id), art.author_id),
        "reviewer": _person(people.get(art.reviewer_id), art.reviewer_id) if art.reviewer_id else None,
        "review_message": art.review_message,
        "needs_check": art.needs_check,
        "slug": art.slug,
        "story_id": art.story_id,
        "words": word_count(doc_text(body)),
        "open_notes": open_notes,
        "created_at": iso(art.created_at),
        "updated_at": iso(art.updated_at),
        "submitted_at": iso(art.submitted_at),
        "published_at": iso(art.published_at),
    }


def _note_out(n: ReviewNote, people: dict[str, StaffAccount]) -> dict:
    return {
        "id": n.id, "kind": n.kind, "lang": n.lang, "quote": n.quote, "suggestion": n.suggestion, "message": n.message,
        "status": n.status, "author": _person(people.get(n.author_id), n.author_id),
        "replies": n.replies, "resolved_by": n.resolved_by, "created_at": iso(n.created_at), "resolved_at": iso(n.resolved_at),
    }


def _full(db: DB, art: NewsroomArticle, actor: StaffAccount) -> dict:
    notes = db.exec(select(ReviewNote).where(ReviewNote.article_id == art.id).order_by(ReviewNote.created_at)).all()
    edits = db.exec(
        select(ArticleRevision).where(ArticleRevision.article_id == art.id, ArticleRevision.kind == "edit", ArticleRevision.actor_id != art.author_id)
    ).all()
    seen = desk.aware(art.author_seen_at)
    changed = [e for e in edits if seen is None or desk.aware(e.updated_at) > seen]
    people = _staff_map(db, {art.author_id, art.reviewer_id} | {n.author_id for n in notes} | {e.actor_id for e in edits})
    out = _summary(art, people, sum(1 for n in notes if n.status == "open"))
    out.update({
        "headline_en": art.headline_en, "standfirst_en": art.standfirst_en, "body_en": art.body_en,
        "headline_hi": art.headline_hi, "standfirst_hi": art.standfirst_hi, "body_hi": art.body_hi,
        "unproofed": art.unproofed, "tags": art.tags,
        "notes": [_note_out(n, people) for n in notes],
        # Senior edits the writer has not opened yet: shown as "Changed by ..." on the writer's page.
        "changed_by": [
            {**_person(people.get(e.actor_id), e.actor_id), "at": iso(e.updated_at)}
            for e in sorted(changed, key=lambda e: e.updated_at)
        ],
        "senior_edits": len(edits),
        "can": permissions(actor, art),
    })
    return out


def _get(db: DB, art_id: str, actor: StaffAccount) -> NewsroomArticle:
    art = db.get(NewsroomArticle, art_id)
    if not art or not desk.can_view(actor, art):
        raise HTTPException(404, "Story not found.")
    return art


def _check_version(art: NewsroomArticle, version: int | None) -> None:
    if version is not None and version != art.version:
        raise HTTPException(409, "Someone else changed this story. Your view has been refreshed.")


def _apply_place(art: NewsroomArticle, scope: str | None, state: str | None, district: str | None) -> None:
    if scope is not None:
        if scope not in SCOPE_KEYS:
            raise HTTPException(422, "Choose who the story is for.")
        art.scope = scope
    if state is not None:
        if state and state not in STATE_CODES:
            raise HTTPException(422, "Unknown state.")
        art.state = state
    if district is not None:
        art.district = district
    if art.scope in ("local", "state") and not art.state:
        raise HTTPException(422, "Choose the state this story is about.")
    if art.scope == "local":
        if not is_district(art.state, art.district):
            raise HTTPException(422, "Choose the district this story is about.")
    else:
        art.district = ""
    if art.scope in ("india", "world"):
        art.state = ""


def _apply(art: NewsroomArticle, body: ArticlePatch) -> list[str]:
    """Copy a patch onto a story. Returns the names of what changed, for the history summary."""
    changed: list[str] = []
    for lang in ("en", "hi"):
        for field in ("headline", "standfirst"):
            value = getattr(body, f"{field}_{lang}")
            if value is not None:
                value = " ".join(value.split()) if field == "headline" else value.strip()
                if value != getattr(art, f"{field}_{lang}"):
                    setattr(art, f"{field}_{lang}", value)
                    changed.append(field)
        doc = getattr(body, f"body_{lang}")
        if doc is not None:
            try:
                clean = clean_doc(doc)
            except ValueError as exc:
                raise HTTPException(413, str(exc))
            if clean != getattr(art, f"body_{lang}"):
                setattr(art, f"body_{lang}", clean)
                changed.append("text")
    if body.primary_language and body.primary_language != art.primary_language:
        art.primary_language = body.primary_language
    if body.unproofed is not None:
        art.unproofed = sorted(set(body.unproofed))
    if body.section is not None:
        if body.section not in SECTION_KEYS:
            raise HTTPException(422, "Unknown desk.")
        if body.section != art.section:
            art.section = body.section
            changed.append("desk")
    if body.priority is not None and body.priority != art.priority:
        art.priority = body.priority
        changed.append("priority")
    if body.tags is not None:
        art.tags = list(dict.fromkeys(t.strip().lower() for t in body.tags if t.strip()))[:12]
    if body.clear_hero:
        art.hero = {}
        changed.append("photo")
    elif body.hero is not None:
        hero = body.hero.model_dump()
        hero["src"], hero["poster"] = safe_media(hero["src"]), safe_media(hero["poster"])
        if hero != art.hero:
            art.hero = hero if hero["src"] else {}
            changed.append("photo")
    if body.state and body.state not in STATE_CODES:
        raise HTTPException(422, "Unknown state.")
    if any(v is not None for v in (body.scope, body.state, body.district)):
        before = (art.scope, art.state, art.district)
        art.scope = body.scope or art.scope
        art.state = body.state if body.state is not None else art.state
        art.district = body.district if body.district is not None else art.district
        if (art.scope, art.state, art.district) != before:
            changed.append("place")
    return list(dict.fromkeys(changed))


def _touch(art: NewsroomArticle) -> None:
    art.version += 1
    art.updated_at = now()


def _ready_to_publish(art: NewsroomArticle) -> None:
    langs = languages_of(art)
    if not langs:
        raise HTTPException(422, "Add a headline before publishing.")
    lang = "en" if "en" in langs else langs[0]
    if word_count(doc_text(getattr(art, f"body_{lang}"))) < 15 and not art.hero:
        raise HTTPException(422, "Add a few lines or a photo before publishing.")
    if art.scope in ("local", "state") and not art.state:
        raise HTTPException(422, "Choose who the story is for.")


def _go_live(db: DB, art: NewsroomArticle, actor: StaffAccount, kind: str, summary: str) -> dict:
    author = desk.staff_by_id(db, art.author_id)
    first_time = art.published_at is None
    art.status = "published"
    art.published_at = art.published_at or now()
    _touch(art)
    record(db, art, actor, kind, summary, with_snapshot=True)
    try:
        publish(db, art, author)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if first_time and author and author.staff_id != actor.staff_id:
        desk.notify(db, [author], "published", f"{actor.display_name} published “{_title(art)}”.", art.id)
    db.commit()
    db.refresh(art)
    return _full(db, art, actor)


def _title(art: NewsroomArticle) -> str:
    return (art.headline_en or art.headline_hi or "Untitled story")[:120]


# ------------------------------------------------------------ me


class Profile(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=80)
    job_title: str | None = Field(default=None, max_length=80)
    home_state: str | None = Field(default=None, max_length=4)
    home_district: str | None = Field(default=None, max_length=40)
    writing_language: Lang | None = None


def staff_public(a: StaffAccount, full: bool = True) -> dict:
    out = {
        "id": a.staff_id, "name": a.display_name, "role": a.role, "jobTitle": a.job_title, "status": a.status,
        "reportsTo": a.reports_to, "trusted": a.trusted, "homeState": a.home_state, "homeDistrict": a.home_district,
        "writingLanguage": a.writing_language,
    }
    if full:
        out.update({"email": a.email, "createdAt": iso(a.created_at), "lastLoginAt": iso(a.last_login_at), "createdBy": a.created_by})
    return out


@router.get("/me")
def me(db: DB, actor: CurrentStaff):
    mine = select(func.count()).select_from(NewsroomArticle).where(NewsroomArticle.author_id == actor.staff_id)
    counts = {
        "drafts": db.exec(mine.where(NewsroomArticle.status == "draft")).one(),
        "returned": db.exec(mine.where(NewsroomArticle.status == "changes_requested")).one(),
        "waiting": db.exec(mine.where(NewsroomArticle.status == "submitted")).one(),
    }
    if desk.senior(actor):
        counts["to_review"] = db.exec(select(func.count()).select_from(NewsroomArticle).where(
            NewsroomArticle.status == "submitted", NewsroomArticle.author_id != actor.staff_id)).one()
        counts["to_check"] = db.exec(select(func.count()).select_from(NewsroomArticle).where(
            NewsroomArticle.status == "published", NewsroomArticle.needs_check == True)).one()  # noqa: E712
    unread = db.exec(select(func.count()).select_from(Notice).where(Notice.recipient_id == actor.staff_id, Notice.read_at == None)).one()  # noqa: E711
    return {"staff": staff_public(actor), "counts": counts, "unread": unread}


@router.put("/me")
def update_me(body: Profile, db: DB, actor: CurrentStaff):
    if body.display_name is not None:
        actor.display_name = " ".join(body.display_name.split())
    if body.job_title is not None:
        actor.job_title = body.job_title.strip()
    if body.writing_language is not None:
        actor.writing_language = body.writing_language
    if body.home_state is not None:
        if body.home_state and body.home_state not in STATE_CODES:
            raise HTTPException(422, "Unknown state.")
        actor.home_state = body.home_state
        actor.home_district = ""
    if body.home_district is not None:
        if body.home_district and not is_district(actor.home_state, body.home_district):
            raise HTTPException(422, "Unknown district.")
        actor.home_district = body.home_district
    db.add(actor)
    db.commit()
    return staff_public(actor)


# ------------------------------------------------------------ stories


@router.get("/articles")
def list_articles(
    db: DB,
    actor: CurrentStaff,
    view: Literal["mine", "review", "checks", "all"] = "mine",
    status: Annotated[str | None, Query(max_length=80)] = None,
    author: Annotated[str | None, Query(max_length=60)] = None,
    section: Annotated[str | None, Query(max_length=20)] = None,
    priority: Priority | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    stmt = select(NewsroomArticle)
    if view == "mine" or not desk.senior(actor):
        stmt = stmt.where(NewsroomArticle.author_id == actor.staff_id)
    elif view == "review":
        stmt = stmt.where(NewsroomArticle.status == "submitted", NewsroomArticle.author_id != actor.staff_id)
    elif view == "checks":
        stmt = stmt.where(NewsroomArticle.status == "published", NewsroomArticle.needs_check == True)  # noqa: E712
    else:
        # Everyone's stories except other people's private drafts.
        stmt = stmt.where(or_(NewsroomArticle.author_id == actor.staff_id, NewsroomArticle.status != "draft"))
    if status:
        stmt = stmt.where(NewsroomArticle.status.in_(status.split(",")))  # type: ignore[attr-defined]
    if author:
        stmt = stmt.where(NewsroomArticle.author_id == author)
    if section:
        stmt = stmt.where(NewsroomArticle.section == section)
    if priority:
        stmt = stmt.where(NewsroomArticle.priority == priority)
    for word in (q or "").split()[:5]:
        like = f"%{word}%"
        stmt = stmt.where(or_(NewsroomArticle.headline_en.ilike(like), NewsroomArticle.headline_hi.ilike(like)))  # type: ignore[attr-defined]
    total = db.exec(select(func.count()).select_from(stmt.subquery())).one()
    if view == "review":
        # Breaking first, then the writer's own editor's stories, then oldest waiting first.
        rows = list(db.exec(stmt).all())
        people = _staff_map(db, {r.author_id for r in rows})
        rows.sort(key=lambda r: (
            r.priority != "breaking",
            (people.get(r.author_id).reports_to if people.get(r.author_id) else "") != actor.staff_id,
            desk.aware(r.submitted_at) or desk.aware(r.updated_at),
        ))
        rows = rows[offset: offset + limit]
    else:
        rows = list(db.exec(stmt.order_by(NewsroomArticle.updated_at.desc()).offset(offset).limit(limit)).all())  # type: ignore[attr-defined]
    people = _staff_map(db, {r.author_id for r in rows} | {r.reviewer_id for r in rows})
    open_counts = dict(db.exec(
        select(ReviewNote.article_id, func.count()).where(ReviewNote.article_id.in_([r.id for r in rows]), ReviewNote.status == "open")  # type: ignore[attr-defined]
        .group_by(ReviewNote.article_id)
    ).all()) if rows else {}
    return {"total": total, "items": [_summary(r, people, open_counts.get(r.id, 0)) for r in rows]}


@router.post("/articles", status_code=201)
def create_article(body: ArticlePatch, db: DB, actor: CurrentStaff):
    art = NewsroomArticle(
        id=uuid.uuid4().hex[:12], author_id=actor.staff_id, primary_language=body.primary_language or actor.writing_language or "en",
        state=actor.home_state, district=actor.home_district, scope="local" if actor.home_district else ("state" if actor.home_state else "india"),
    )
    _apply(art, body)
    record(db, art, actor, "create", "Started the story", with_snapshot=True)
    db.add(art)
    db.commit()
    db.refresh(art)
    return _full(db, art, actor)


@router.get("/articles/{art_id}")
def get_article(art_id: str, db: DB, actor: CurrentStaff):
    return _full(db, _get(db, art_id, actor), actor)


@router.post("/articles/{art_id}/seen")
def seen_changes(art_id: str, db: DB, actor: CurrentStaff):
    """The writer has looked at what their editor changed: the "Changed by" notice goes away."""
    art = _get(db, art_id, actor)
    if art.author_id == actor.staff_id:
        art.author_seen_at = now()
        db.add(art)
        db.commit()
    return _full(db, art, actor)


@router.patch("/articles/{art_id}")
def update_article(art_id: str, body: ArticlePatch, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    require(desk.can_edit(actor, art), "This story is with someone else right now, so you cannot change it.")
    _check_version(art, body.version)
    changed = _apply(art, body)
    if not changed and body.unproofed is None and body.primary_language is None and body.tags is None:
        return _full(db, art, actor)
    if art.scope == "local" and art.district and not is_district(art.state, art.district):
        raise HTTPException(422, "Choose a district in the chosen state.")
    _touch(art)
    if changed:
        record(db, art, actor, "edit", "Changed " + ", ".join(changed))
    if art.author_id != actor.staff_id and changed:
        author = desk.staff_by_id(db, art.author_id)
        recent = db.exec(select(Notice).where(
            Notice.recipient_id == art.author_id, Notice.article_id == art.id, Notice.kind == "edited", Notice.read_at == None,  # noqa: E711
        )).first()
        if author and not recent:
            desk.notify(db, [author], "edited", f"{actor.display_name} edited “{_title(art)}”.", art.id)
    db.add(art)
    db.commit()
    if art.status == "published":
        try:
            publish(db, art, desk.staff_by_id(db, art.author_id))
        except ValueError as exc:
            raise HTTPException(422, str(exc))
        if art.author_id == actor.staff_id and not desk.senior(actor):
            art.needs_check = True
            db.add(art)
            db.commit()
    db.refresh(art)
    return _full(db, art, actor)


def _apply_send(db: DB, art: NewsroomArticle, body: Send) -> None:
    _check_version(art, body.version)
    if body.section is not None:
        if body.section not in SECTION_KEYS:
            raise HTTPException(422, "Unknown desk.")
        art.section = body.section
    if body.priority is not None:
        art.priority = body.priority
    _apply_place(art, body.scope, body.state, body.district)


@router.post("/articles/{art_id}/submit")
def submit(art_id: str, body: Send, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    require(art.author_id == actor.staff_id and art.status in ("draft", "changes_requested"), "Only the writer can send this story.")
    _apply_send(db, art, body)
    _ready_to_publish(art)
    resubmit = art.status == "changes_requested"
    art.status = "submitted"
    art.submitted_at = now()
    _touch(art)
    record(db, art, actor, "submit", body.message or ("Sent back with fixes" if resubmit else "Sent for review"), with_snapshot=True)
    breaking = art.priority == "breaking"
    kind = "breaking" if breaking else "submitted"
    label = "BREAKING: " if breaking else ""
    desk.notify(db, desk.reviewers_for(db, actor, breaking), kind, f"{label}{actor.display_name} sent “{_title(art)}”.", art.id)
    db.add(art)
    db.commit()
    db.refresh(art)
    return _full(db, art, actor)


@router.post("/articles/{art_id}/publish")
def publish_article(art_id: str, body: Send, db: DB, actor: CurrentStaff):
    """Publish now: the writer when they publish directly, or a senior approving a submitted story."""
    art = _get(db, art_id, actor)
    can = permissions(actor, art)
    require(can["publish"], "This story needs an editor's approval first.")
    _apply_send(db, art, body)
    _ready_to_publish(art)
    reviewing = art.author_id != actor.staff_id
    open_problems = db.exec(select(func.count()).select_from(ReviewNote).where(
        ReviewNote.article_id == art.id, ReviewNote.status == "open", ReviewNote.kind == "problem")).one()
    if open_problems and not reviewing:
        raise HTTPException(422, "Fix the highlighted problems before publishing.")
    if reviewing:
        art.reviewer_id = actor.staff_id
        art.review_message = body.message
        art.needs_check = False
        # Approving settles every open highlight.
        for n in db.exec(select(ReviewNote).where(ReviewNote.article_id == art.id, ReviewNote.status == "open")).all():
            n.status, n.resolved_by, n.resolved_at = "dismissed", actor.staff_id, now()
            db.add(n)
    else:
        art.needs_check = not desk.senior(actor)
    return _go_live(db, art, actor, "publish", ("Approved and published" if reviewing else "Published") + (f": {body.message}" if body.message else ""))


@router.post("/articles/{art_id}/return")
def request_changes(art_id: str, body: Decision, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    require(desk.can_review(actor, art), "Only an editor reviewing this story can send it back.")
    if not body.message.strip() and not _open_notes(db, art.id):
        raise HTTPException(422, "Highlight what to fix or write a note for the writer.")
    art.status = "changes_requested"
    art.reviewer_id, art.review_message = actor.staff_id, body.message.strip()
    _touch(art)
    record(db, art, actor, "request_changes", body.message.strip() or "Asked for changes")
    desk.notify(db, [art.author_id], "returned", f"{actor.display_name} sent “{_title(art)}” back with notes.", art.id)
    db.add(art)
    db.commit()
    db.refresh(art)
    return _full(db, art, actor)


@router.post("/articles/{art_id}/reject")
def reject(art_id: str, body: Decision, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    require(desk.can_review(actor, art), "Only an editor reviewing this story can decline it.")
    if len(body.message.strip()) < 5:
        raise HTTPException(422, "Tell the writer why the story is declined.")
    art.status = "rejected"
    art.reviewer_id, art.review_message = actor.staff_id, body.message.strip()
    _touch(art)
    record(db, art, actor, "reject", body.message.strip())
    desk.notify(db, [art.author_id], "rejected", f"{actor.display_name} declined “{_title(art)}”.", art.id)
    db.add(art)
    db.commit()
    db.refresh(art)
    return _full(db, art, actor)


@router.post("/articles/{art_id}/unpublish")
def take_down(art_id: str, body: Decision, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    require(permissions(actor, art)["unpublish"], "Only editors can take a story off the site.")
    unpublish(db, art.story_id)
    art.status = "unpublished"
    art.needs_check = False
    _touch(art)
    record(db, art, actor, "unpublish", body.message.strip() or "Taken off the site")
    if art.author_id != actor.staff_id:
        desk.notify(db, [art.author_id], "rejected", f"{actor.display_name} took “{_title(art)}” off the site.", art.id)
    db.add(art)
    db.commit()
    db.refresh(art)
    return _full(db, art, actor)


@router.post("/articles/{art_id}/check")
def looks_good(art_id: str, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    require(permissions(actor, art)["check"], "Nothing to check here.")
    art.needs_check, art.checked_by = False, actor.staff_id
    _touch(art)
    record(db, art, actor, "check", "Checked the published story")
    db.add(art)
    db.commit()
    db.refresh(art)
    return _full(db, art, actor)


@router.post("/articles/{art_id}/reopen")
def reopen(art_id: str, db: DB, actor: CurrentStaff):
    """A declined or removed story goes back to its writer as a draft."""
    art = _get(db, art_id, actor)
    require(permissions(actor, art)["reopen"], "This story cannot be reopened.")
    art.status = "draft"
    _touch(art)
    record(db, art, actor, "edit", "Reopened as a draft")
    db.add(art)
    db.commit()
    db.refresh(art)
    return _full(db, art, actor)


@router.delete("/articles/{art_id}")
def delete_article(art_id: str, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    require(permissions(actor, art)["delete"], "Only unpublished drafts can be deleted.")
    for model in (ReviewNote, ArticleRevision):
        for row in db.exec(select(model).where(model.article_id == art.id)).all():
            db.delete(row)
    for row in db.exec(select(Notice).where(Notice.article_id == art.id)).all():
        db.delete(row)
    db.delete(art)
    db.commit()
    return {"ok": True}


@router.get("/articles/{art_id}/history")
def history(art_id: str, db: DB, actor: CurrentStaff):
    """Every version and event, oldest first, with snapshots for the change graph and word diffs."""
    art = _get(db, art_id, actor)
    rows = db.exec(select(ArticleRevision).where(ArticleRevision.article_id == art.id).order_by(ArticleRevision.id)).all()  # type: ignore[arg-type]
    people = _staff_map(db, {r.actor_id for r in rows} | {art.author_id})
    return {
        "author_id": art.author_id,
        "items": [{
            "id": r.id, "kind": r.kind, "summary": r.summary, "actor": _person(people.get(r.actor_id), r.actor_id),
            "lane": "author" if r.actor_id == art.author_id else "desk",
            "at": iso(r.updated_at), "started_at": iso(r.created_at), "snapshot": r.snapshot,
        } for r in rows],
    }


# ------------------------------------------------------------ review notes


@router.post("/articles/{art_id}/notes", status_code=201)
def add_note(art_id: str, body: NoteIn, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    require(permissions(actor, art)["note"])
    if body.kind == "suggestion" and not body.suggestion.strip():
        raise HTTPException(422, "Write the suggested wording.")
    if body.kind == "comment" and not body.message.strip():
        raise HTTPException(422, "Write a comment.")
    if db.get(ReviewNote, body.id):
        raise HTTPException(409, "This note already exists.")
    note = ReviewNote(article_id=art.id, author_id=actor.staff_id, **body.model_dump())
    db.add(note)
    db.commit()
    people = _staff_map(db, {actor.staff_id})
    return _note_out(note, people)


@router.patch("/articles/{art_id}/notes/{note_id}")
def update_note(art_id: str, note_id: str, body: NotePatch, db: DB, actor: CurrentStaff):
    art = _get(db, art_id, actor)
    note = db.get(ReviewNote, note_id)
    if not note or note.article_id != art.id:
        raise HTTPException(404, "Note not found.")
    own_story = art.author_id == actor.staff_id
    if body.reply.strip():
        note.replies = [*note.replies, {"by": actor.staff_id, "name": actor.display_name, "text": body.reply.strip(), "at": iso(now())}]
    if body.status and body.status != note.status:
        if body.status in ("done", "accepted"):
            # The writer marks a fix done or accepts a suggestion; seniors can settle anything.
            require(own_story or desk.senior(actor), "Only the writer or an editor can settle this note.")
        elif body.status == "dismissed":
            require(desk.senior(actor) or note.author_id == actor.staff_id, "Only an editor can dismiss this note.")
        else:  # reopen
            require(desk.senior(actor) or note.author_id == actor.staff_id, "Only an editor can reopen this note.")
        note.status = body.status
        note.resolved_by = "" if body.status == "open" else actor.staff_id
        note.resolved_at = None if body.status == "open" else now()
    db.add(note)
    db.commit()
    people = _staff_map(db, {note.author_id})
    return _note_out(note, people)


# ------------------------------------------------------------ notices


@router.get("/notices")
def notices(db: DB, actor: CurrentStaff, limit: Annotated[int, Query(ge=1, le=100)] = 30):
    rows = db.exec(select(Notice).where(Notice.recipient_id == actor.staff_id).order_by(Notice.created_at.desc()).limit(limit)).all()  # type: ignore[attr-defined]
    return [{"id": n.id, "kind": n.kind, "text": n.text, "article_id": n.article_id, "at": iso(n.created_at), "read": n.read_at is not None} for n in rows]


@router.post("/notices/read")
def read_notices(db: DB, actor: CurrentStaff):
    at = now()
    for n in db.exec(select(Notice).where(Notice.recipient_id == actor.staff_id, Notice.read_at == None)).all():  # noqa: E711
        n.read_at = at
        db.add(n)
    db.commit()
    return {"ok": True}


# ------------------------------------------------------------ numbers


@router.get("/stats")
def stats(db: DB, actor: CurrentStaff, days: Annotated[int, Query(ge=1, le=90)] = 30):
    """Real numbers only: stories per person, time from sending to publishing, and reader opens."""
    since = now() - timedelta(days=days)
    people_q = select(StaffAccount)
    if actor.role == "editor":
        people_q = people_q.where(or_(StaffAccount.reports_to == actor.staff_id, StaffAccount.staff_id == actor.staff_id))
    elif actor.role == "reporter":
        people_q = people_q.where(StaffAccount.staff_id == actor.staff_id)
    people = {p.staff_id: p for p in db.exec(people_q).all()}
    arts = db.exec(select(NewsroomArticle).where(NewsroomArticle.author_id.in_(list(people)))).all()  # type: ignore[attr-defined]
    story_ids = [a.story_id for a in arts if a.story_id]
    views = dict(db.exec(
        select(AnalyticsEvent.story_id, func.count()).where(
            AnalyticsEvent.name == "article_open", AnalyticsEvent.story_id.in_(story_ids), AnalyticsEvent.created_at >= since)  # type: ignore[attr-defined]
        .group_by(AnalyticsEvent.story_id)
    ).all()) if story_ids else {}
    revs = db.exec(select(ArticleRevision).where(
        ArticleRevision.article_id.in_([a.id for a in arts]), ArticleRevision.kind.in_(["submit", "publish"]))  # type: ignore[attr-defined]
        .order_by(ArticleRevision.id)).all() if arts else []
    waits: list[float] = []
    sent: dict[str, Any] = {}
    for r in revs:
        if r.kind == "submit":
            sent[r.article_id] = desk.aware(r.created_at)
        elif r.article_id in sent:
            waits.append((desk.aware(r.created_at) - sent.pop(r.article_id)).total_seconds() / 60)
    rows = []
    for pid, p in people.items():
        mine = [a for a in arts if a.author_id == pid]
        recent = [a for a in mine if a.published_at and desk.aware(a.published_at) >= since]
        rows.append({
            "person": _person(p), "drafts": sum(a.status == "draft" for a in mine),
            "waiting": sum(a.status == "submitted" for a in mine), "returned": sum(a.status == "changes_requested" for a in mine),
            "published": len(recent), "breaking": sum(a.priority == "breaking" for a in recent),
            "views": sum(views.get(a.story_id, 0) for a in mine),
        })
    top = sorted((a for a in arts if a.story_id), key=lambda a: -views.get(a.story_id, 0))[:10]
    people_map = _staff_map(db, {a.author_id for a in top})
    return {
        "days": days,
        "people": sorted(rows, key=lambda r: (-r["published"], r["person"]["name"])),
        "published": sum(r["published"] for r in rows),
        "median_wait_min": round(sorted(waits)[len(waits) // 2]) if waits else None,
        "views": sum(views.values()),
        "top": [{**_summary(a, people_map), "views": views.get(a.story_id, 0)} for a in top if views.get(a.story_id)],
        "views_tracked": bool(views),
    }
