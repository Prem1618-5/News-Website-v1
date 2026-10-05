from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlmodel import select

from ..config import MEDIA_DIR
from ..database import DB
from ..models import ArticleContent, Section, Story
from ..schemas import Page

router = APIRouter(tags=["content"])
IMAGES_DIR = (MEDIA_DIR / "images").resolve()


@router.get("/api/sections")
def sections(db: DB, response: Response) -> list[Section]:
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=86400"
    return db.exec(select(Section).order_by(Section.position)).all()


@router.get("/api/stories", response_model=Page)
def stories(
    db: DB,
    response: Response,
    section: str | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    stmt = select(Story)
    if section:
        stmt = stmt.where(Story.section == section)
    for word in (q or "").lower().split():
        stmt = stmt.where(or_(func.lower(Story.title).contains(word, autoescape=True), func.lower(Story.deck).contains(word, autoescape=True)))
    total = db.exec(select(func.count()).select_from(stmt.subquery())).one()
    items = db.exec(stmt.order_by(Story.position).offset(offset).limit(limit)).all()
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=600"
    return Page(total=total, items=items)


@router.get("/api/stories/{story_id}")
def story(story_id: str, db: DB, response: Response):
    found = db.get(Story, story_id)
    if not found:
        raise HTTPException(404, "Story not found")
    article = db.get(ArticleContent, story_id)
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=3600"
    return {**found.model_dump(), "body": article.blocks if article else [], "media": article.media if article else {}}


@router.api_route("/images/{image_name:path}", methods=["GET", "HEAD"])
def serve_image(image_name: str):
    target = (IMAGES_DIR / image_name).resolve()
    if target.is_relative_to(IMAGES_DIR) and target.is_file():
        return FileResponse(target, headers={"Cache-Control": "public, max-age=604800, immutable"})
    raise HTTPException(404, "Image not found")
