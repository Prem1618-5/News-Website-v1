"""Database tables."""
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Section(SQLModel, table=True):
    key: str = Field(primary_key=True)
    name: str
    position: int
    name_hi: str = ""
    color: str = ""
    about: str = ""
    about_hi: str = ""


class Story(SQLModel, table=True):
    id: str = Field(primary_key=True)
    # Public URL segment: /story/<slug>. Pack stories use the slug as id; Newsroom stories are "nr-<id>".
    slug: str = Field(default="", index=True)
    section: str = Field(index=True, foreign_key="section.key")
    # Coverage level: local | state | india | world. Local and state stories name the place below.
    scope: str = Field(default="world", index=True)
    state: str = Field(default="", index=True)  # state code, e.g. "JH"
    district: str = ""  # district key within the state, e.g. "ranchi"
    # A breaking story keeps its banner and feed boost until this moment.
    breaking_until: datetime | None = None
    title: str
    title_hi: str = ""
    deck: str = ""
    deck_hi: str = ""
    author: str
    ago: str = ""  # legacy; relative time is computed in the Reader from published_at
    read_minutes: int
    live: bool = False
    position: int = Field(index=True)
    image_url: str = ""
    source_name: str = ""
    source_url: str = ""
    caption: str = ""
    language: str = "en"
    origin: str = "pack"  # pack | newsroom
    urgency: int = 2
    published_at: datetime | None = Field(default=None, index=True)
    updated_at: datetime | None = None
    # Lower-cased title + standfirst + body in both languages, for search.
    search_text: str = ""


class ArticleContent(SQLModel, table=True):
    """Story body as Reader blocks (format in services/doc.py). HTML is never stored."""
    story_id: str = Field(primary_key=True, foreign_key="story.id")
    blocks: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    blocks_hi: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    media: dict = Field(default_factory=dict, sa_column=Column(JSON))
    sources: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=utcnow)


class Reader(SQLModel, table=True):
    """Reader preferences keyed by the authenticated user ID."""
    id: str = Field(primary_key=True)
    state: dict = Field(default_factory=dict, sa_column=Column(JSON))


class AccountProfile(SQLModel, table=True):
    user_id: str = Field(primary_key=True, index=True)
    email: str = ""
    display_name: str = ""
    interests: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    cookie_preferences: dict = Field(
        default_factory=lambda: {"necessary": True, "preferences": True, "analytics": False, "personalization": False, "notifications": False},
        sa_column=Column(JSON),
    )
    language: str = "en"
    timezone: str = "UTC"
    onboarding_completed: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ReadingDay(SQLModel, table=True):
    user_id: str = Field(primary_key=True, index=True)
    read_date: date = Field(primary_key=True)
    story_id: str = ""


class LocalUser(SQLModel, table=True):
    """Fallback accounts used when Supabase is not configured (local development)."""
    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    display_name: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class ConsentRecord(SQLModel, table=True):
    """Append-only consent ledger. One row per decision; the newest row per subject wins."""
    id: int | None = Field(default=None, primary_key=True)
    subject_id: str = Field(index=True)
    user_id: str = ""
    version: str
    choices: dict = Field(default_factory=dict, sa_column=Column(JSON))
    source: str = "banner"
    gpc: bool = False
    created_at: datetime = Field(default_factory=utcnow, index=True)


class AnalyticsEvent(SQLModel, table=True):
    """Pseudonymous product events. Only accepted when the subject has analytics consent."""
    id: int | None = Field(default=None, primary_key=True)
    subject_id: str = Field(index=True)
    name: str = Field(index=True)
    story_id: str = ""
    section: str = ""
    referrer_kind: str = ""
    device: str = ""
    viewport: str = ""
    language: str = ""
    value: float = 0
    created_at: datetime = Field(default_factory=utcnow, index=True)


class StaffAccount(SQLModel, table=True):
    """Newsroom staff login. `staff_id` is the public id used everywhere in the Newsroom API."""
    id: str = Field(primary_key=True)
    staff_id: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    display_name: str
    role: str = "reporter"  # admin | editor | reporter
    job_title: str = ""
    # invited (no password yet) | pending (asked to join, waiting for an admin) | active | suspended
    status: str = "active"
    # The editor a reporter sends stories to (a staff_id). Editors and admins report to nobody.
    reports_to: str = ""
    # Trusted reporters publish without waiting for review. Editors and admins always can.
    trusted: bool = False
    home_state: str = ""
    home_district: str = ""
    writing_language: str = "en"
    created_by: str = ""
    # Bumped on password reset, suspension and "sign out everywhere"; older tokens stop working.
    token_version: int = 0
    last_login_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)


class AuthToken(SQLModel, table=True):
    """One-time links: password resets and staff invites. Only a SHA-256 of the token is stored."""
    token_hash: str = Field(primary_key=True)
    subject_kind: str = Field(index=True)  # staff | reader
    subject_id: str = Field(index=True)
    purpose: str  # reset | invite
    expires_at: datetime
    used_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)


class NewsroomArticle(SQLModel, table=True):
    """A story in the Newsroom, from first draft to published. Bodies are TipTap (ProseMirror) JSON."""
    id: str = Field(primary_key=True)
    author_id: str = Field(index=True)  # staff_id
    # draft | submitted | changes_requested | published | rejected | unpublished
    status: str = Field(default="draft", index=True)
    version: int = 1
    primary_language: str = "en"
    headline_en: str = ""
    standfirst_en: str = ""
    body_en: dict = Field(default_factory=dict, sa_column=Column(JSON))
    headline_hi: str = ""
    standfirst_hi: str = ""
    body_hi: dict = Field(default_factory=dict, sa_column=Column(JSON))
    # Languages whose text came from the AI draft and still needs a human read.
    unproofed: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    section: str = "world"
    scope: str = "local"
    state: str = ""
    district: str = ""
    priority: str = Field(default="normal", index=True)  # normal | breaking
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    hero: dict = Field(default_factory=dict, sa_column=Column(JSON))
    slug: str = ""
    story_id: str = ""
    # The last decision: who made it and what they told the writer.
    reviewer_id: str = ""
    review_message: str = ""
    # Published straight away by a trusted reporter: an editor confirms it afterwards.
    needs_check: bool = False
    checked_by: str = ""
    # When the writer last opened the story; senior edits after this are flagged to them.
    author_seen_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)
    submitted_at: datetime | None = None
    published_at: datetime | None = None


class ArticleRevision(SQLModel, table=True):
    """History of a Newsroom story: edits (with a snapshot) and events (submit, publish...). Feeds the change graph."""
    id: int | None = Field(default=None, primary_key=True)
    article_id: str = Field(index=True)
    actor_id: str
    # create | edit | submit | publish | request_changes | reject | unpublish | check | language
    kind: str
    summary: str = ""
    snapshot: dict | None = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow, index=True)
    updated_at: datetime = Field(default_factory=utcnow)


class ReviewNote(SQLModel, table=True):
    """A highlight on a story: a problem, a suggested replacement or a comment. Anchored by a `note` mark in the body."""
    id: str = Field(primary_key=True)
    article_id: str = Field(index=True)
    author_id: str
    kind: str = "comment"  # problem | suggestion | comment
    lang: str = "en"
    quote: str = ""
    suggestion: str = ""
    message: str = ""
    # open | done (writer fixed it) | accepted (suggestion applied) | dismissed
    status: str = Field(default="open", index=True)
    replies: list[dict] = Field(default_factory=list, sa_column=Column(JSON))
    resolved_by: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    resolved_at: datetime | None = None


class MediaAsset(SQLModel, table=True):
    """A photo, video or audio clip uploaded from the Newsroom, served at /media/<path>."""
    id: str = Field(primary_key=True)
    owner_id: str = Field(index=True)
    path: str
    mime: str
    kind: str  # image | video | audio
    size: int
    created_at: datetime = Field(default_factory=utcnow)


class Notice(SQLModel, table=True):
    """Bell notifications for staff."""
    id: int | None = Field(default=None, primary_key=True)
    recipient_id: str = Field(index=True)
    # submitted | breaking | returned | rejected | published | edited | joined | request
    kind: str
    text: str
    article_id: str = ""
    created_at: datetime = Field(default_factory=utcnow, index=True)
    read_at: datetime | None = None
