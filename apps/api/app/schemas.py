"""Request and response bodies."""
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from .models import Story

SECTION_KEYS = {"world", "politics", "business", "tech", "sports", "culture", "science"}


class Highlight(BaseModel):
    id: str = Field(max_length=120)
    t: str = Field(max_length=1000)
    d: str = Field(max_length=40)


class ReaderState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    saved: list[str] = Field(default_factory=list, max_length=500)
    liked: list[str] = Field(default_factory=list, max_length=500)
    follow: list[str] = Field(default_factory=list, max_length=20)
    hl: list[Highlight] = Field(default_factory=list, max_length=1000)
    cm: dict[str, list[Annotated[str, Field(max_length=500)]]] = Field(default_factory=dict, max_length=500)
    theme: str = Field("", pattern=r"^(light|dark)?$")
    sz: int = Field(0, ge=0, le=2)
    lang: str = Field("", pattern=r"^(en|hi)?$")


class Page(BaseModel):
    total: int
    items: list[Story]


EmailText = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=254)]
NameText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]
OptionalText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80)]
# Passwords are never trimmed: leading/trailing spaces are part of what the user typed.
LoginPassword = Annotated[str, Field(min_length=1, max_length=128)]
NewPassword = Annotated[str, Field(min_length=8, max_length=128)]


class AuthCredentials(BaseModel):
    email: EmailText
    password: LoginPassword


class SignupRequest(BaseModel):
    email: EmailText
    password: NewPassword
    display_name: NameText


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=4096)


class CookiePreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")
    necessary: bool = True
    preferences: bool = True
    analytics: bool = False
    personalization: bool = False
    notifications: bool = False


class AccountUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)
    interests: list[str] = Field(default_factory=list, max_length=7)
    cookie_preferences: CookiePreferences = Field(default_factory=CookiePreferences)
    timezone: str = Field(default="UTC", max_length=80)
    language: Literal["en", "hi"] = "en"
    onboarding_completed: bool = False


class ReadActivity(BaseModel):
    story_id: str = Field(min_length=1, max_length=160)


class ConsentChoice(BaseModel):
    subject_id: str = Field(min_length=8, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    version: str = Field(min_length=4, max_length=20)
    choices: CookiePreferences
    source: Literal["banner", "preference_center", "onboarding", "account"] = "banner"
    gpc: bool = False


class EventIn(BaseModel):
    name: Literal["page_view", "article_open", "read_depth", "engaged_time", "share", "save", "search", "language_switch", "video_play"]
    story_id: str = Field(default="", max_length=160)
    section: str = Field(default="", max_length=20)
    referrer_kind: Literal["", "direct", "search", "social", "internal"] = ""
    device: Literal["", "mobile", "tablet", "desktop"] = ""
    viewport: str = Field(default="", max_length=12)
    language: Literal["", "en", "hi"] = ""
    value: float = Field(default=0, ge=0, le=86400)


class EventBatch(BaseModel):
    subject_id: str = Field(min_length=8, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    events: list[EventIn] = Field(max_length=50)


class HeroMedia(BaseModel):
    kind: Literal["image", "video"] = "image"
    url: str = Field(default="", max_length=2000)
    poster_url: str = Field(default="", max_length=2000)
    alt: str = Field(default="", max_length=300)
    credit: str = Field(default="", max_length=200)
    caption: str = Field(default="", max_length=400)
    width: int = 0
    height: int = 0
    duration_sec: float = 0


class NewsroomPublish(BaseModel):
    """Payload the Newsroom sends when an article goes live."""
    id: str = Field(min_length=1, max_length=120, pattern=r"^[A-Za-z0-9_-]+$")
    slug: str = Field(min_length=1, max_length=160)
    headline: str = Field(min_length=1, max_length=300)
    standfirst: str = Field(default="", max_length=600)
    section: str
    author: str = Field(min_length=1, max_length=120)
    urgency: int = Field(default=2, ge=1, le=5)
    language: Literal["en", "hi"] = "en"
    tags: list[str] = Field(default_factory=list, max_length=12)
    hero: HeroMedia | None = None
    body: list[dict[str, Any]] = Field(default_factory=list, max_length=400)
    live: bool = False


class AiRequest(BaseModel):
    task: Literal["headline", "summary", "proofread", "translate", "tags"]
    text: str = Field(min_length=1, max_length=20000)
    language: Literal["en", "hi"] = "en"
    target_language: Literal["en", "hi"] | None = None


class StaffLogin(BaseModel):
    email: EmailText
    password: LoginPassword


class StaffSignup(BaseModel):
    display_name: NameText
    email: EmailText
    password: NewPassword
    job_title: OptionalText = ""
