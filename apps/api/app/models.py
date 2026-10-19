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
    # Where it happens: ranchi | jharkhand | india | world.
    scope: str = Field(default="world", index=True)
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
    """BlockNote JSON document for a story. HTML is never stored."""
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
    """Newsroom staff login. `staff_id` is the id of the Staff record shown in the Newsroom workspace."""
    id: str = Field(primary_key=True)
    staff_id: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    display_name: str
    role: str = "reporter"  # admin | editor | reporter
    job_title: str = ""
    status: str = "active"  # active | pending | suspended
    created_at: datetime = Field(default_factory=utcnow)
