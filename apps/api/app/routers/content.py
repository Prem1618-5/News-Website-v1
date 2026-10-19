"""Public, cacheable reading endpoints: sections, story feeds, one story, trending and the build snapshot."""
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlmodel import select

from ..config import MEDIA_DIR
from ..content_pack import slugify
from ..database import DB
from ..models import AnalyticsEvent, ArticleContent, Section, Story
from ..schemas import SCOPE_KEYS, Page, SectionOut, Snapshot, StoryDetail, StoryOut

router = APIRouter(tags=["content"])
IMAGES_DIR = (MEDIA_DIR / "images").resolve()
FEED_CACHE = "public, max-age=30, stale-while-revalidate=600"


def story_out(story: Story) -> StoryOut:
    data = story.model_dump(exclude={"search_text", "ago", "origin", "position"})
    return StoryOut(**data, author_slug=slugify(story.author), has_hi=bool(story.title_hi))


def story_detail(story: Story, content: ArticleContent | None) -> StoryDetail:
    base = story_out(story).model_dump()
    return StoryDetail(
        **base,
        body=content.blocks if content else [],
        body_hi=content.blocks_hi if content else [],
        sources=content.sources if content else [],
        media=content.media if content else {},
    )


def newest_first(stmt):
    return stmt.order_by(Story.published_at.desc(), Story.position)


def sections_with_counts(db) -> list[SectionOut]:
    counts = dict(db.exec(select(Story.section, func.count()).group_by(Story.section)).all())
    rows = db.exec(select(Section).order_by(Section.position)).all()
    return [SectionOut(**r.model_dump(), count=counts.get(r.key, 0)) for r in rows]


@router.get("/api/sections", response_model=list[SectionOut])
def sections(db: DB, response: Response):
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=3600"
    return sections_with_counts(db)


@router.get("/api/stories", response_model=Page)
def stories(
    db: DB,
    response: Response,
    section: str | None = None,
    scope: Annotated[str | None, Query(pattern="^(" + "|".join(SCOPE_KEYS) + ")$")] = None,
    author: Annotated[str | None, Query(max_length=120, description="Author slug")] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    ids: Annotated[str | None, Query(max_length=4000, description="Comma-separated story ids or slugs")] = None,
    exclude: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    stmt = select(Story)
    if section:
        stmt = stmt.where(Story.section.in_(section.split(",")[:20]))
    if scope:
        stmt = stmt.where(Story.scope == scope)
    if author:
        names = [n for n in db.exec(select(Story.author).distinct()).all() if slugify(n) == author]
        stmt = stmt.where(Story.author.in_(names or [""]))
    if ids:
        wanted = [i for i in ids.split(",") if i][:100]
        stmt = stmt.where(Story.id.in_(wanted) | Story.slug.in_(wanted))
    if exclude:
        stmt = stmt.where(Story.id != exclude, Story.slug != exclude)
    for word in (q or "").lower().split()[:6]:
        stmt = stmt.where(Story.search_text.contains(word, autoescape=True))
    total = db.exec(select(func.count()).select_from(stmt.subquery())).one()
    items = db.exec(newest_first(stmt).offset(offset).limit(limit)).all()
    response.headers["Cache-Control"] = FEED_CACHE
    return Page(total=total, items=[story_out(s) for s in items])


@router.get("/api/stories/{ref}", response_model=StoryDetail)
def story(ref: str, db: DB, response: Response):
    found = db.get(Story, ref) or db.exec(select(Story).where(Story.slug == ref)).first()
    if not found:
        raise HTTPException(404, "Story not found")
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=3600"
    return story_detail(found, db.get(ArticleContent, found.id))


@router.get("/api/authors")
def authors(db: DB, response: Response):
    rows = db.exec(select(Story.author, func.count(), func.max(Story.published_at)).group_by(Story.author)).all()
    response.headers["Cache-Control"] = FEED_CACHE
    return [{"name": name, "slug": slugify(name), "stories": n, "latest": latest} for name, n, latest in rows if name]


@router.get("/api/trending", response_model=Page)
def trending(db: DB, response: Response, limit: Annotated[int, Query(ge=1, le=20)] = 5):
    """Most-opened stories of the last three days (consenting readers only). Falls back to the newest stories."""
    since = datetime.now(timezone.utc) - timedelta(days=3)
    counts = db.exec(
        select(AnalyticsEvent.story_id, func.count().label("n"))
        .where(AnalyticsEvent.name == "article_open", AnalyticsEvent.created_at >= since, AnalyticsEvent.story_id != "")
        .group_by(AnalyticsEvent.story_id).order_by(func.count().desc()).limit(limit)
    ).all()
    picked = [s for sid, _ in counts if (s := db.get(Story, sid))]
    if len(picked) < limit:
        have = {s.id for s in picked}
        filler = db.exec(newest_first(select(Story)).limit(limit + len(have))).all()
        picked += [s for s in filler if s.id not in have][: limit - len(picked)]
    response.headers["Cache-Control"] = FEED_CACHE
    return Page(total=len(picked), items=[story_out(s) for s in picked])


@router.get("/api/snapshot", response_model=Snapshot)
def snapshot(db: DB, response: Response, limit: Annotated[int, Query(ge=1, le=2000)] = 1000):
    """Whole public site in one response. The Reader's static build prerenders every page from this."""
    rows = db.exec(newest_first(select(Story)).limit(limit)).all()
    contents = {c.story_id: c for c in db.exec(select(ArticleContent).where(ArticleContent.story_id.in_([r.id for r in rows]))).all()}
    response.headers["Cache-Control"] = "public, max-age=60"
    return Snapshot(
        generated_at=datetime.now(timezone.utc),
        sections=sections_with_counts(db),
        stories=[story_detail(r, contents.get(r.id)) for r in rows],
    )


@router.api_route("/images/{image_name:path}", methods=["GET", "HEAD"])
def serve_image(image_name: str):
    target = (IMAGES_DIR / image_name).resolve()
    if target.is_relative_to(IMAGES_DIR) and target.is_file():
        return FileResponse(target, headers={"Cache-Control": "public, max-age=604800, immutable"})
    raise HTTPException(404, "Image not found")
