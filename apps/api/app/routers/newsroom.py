"""Publishing bridge: the Newsroom pushes approved articles here and they appear in the Reader feed."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import select

from ..database import DB
from ..models import ArticleContent, Story
from ..schemas import SECTION_KEYS, NewsroomPublish
from ..security import require_newsroom

router = APIRouter(prefix="/api/newsroom", tags=["newsroom"], dependencies=[Depends(require_newsroom)])

ALLOWED_BLOCKS = {
    "paragraph", "heading", "quote", "bulletListItem", "numberedListItem", "checkListItem",
    "image", "video", "audio", "table", "divider", "pullquote",
}
SAFE_URL_PREFIXES = ("https://", "/images/", "/media/", "data:image/")


def _clean_url(value: object) -> str:
    url = str(value or "")
    return url if url.startswith(SAFE_URL_PREFIXES) else ""


def sanitize_blocks(blocks: list[dict], depth: int = 0) -> list[dict]:
    """Keep allow-listed block types only, strip unsafe media URLs. HTML is never accepted."""
    if depth > 3:
        return []
    clean: list[dict] = []
    for block in blocks:
        kind = block.get("type")
        if kind not in ALLOWED_BLOCKS:
            continue
        props = dict(block.get("props") or {})
        for key in ("url", "posterUrl"):
            if key in props:
                props[key] = _clean_url(props[key])
        clean.append({
            "id": str(block.get("id") or "")[:64],
            "type": kind,
            "props": props,
            "content": block.get("content") if isinstance(block.get("content"), (list, dict)) else [],
            "children": sanitize_blocks(block.get("children") or [], depth + 1),
        })
    return clean


def _plain_text(blocks: list[dict]) -> str:
    out: list[str] = []
    for block in blocks:
        content = block.get("content")
        if isinstance(content, list):
            out.extend(str(item.get("text", "")) for item in content if isinstance(item, dict))
        out.append(_plain_text(block.get("children") or []))
    return " ".join(filter(None, out))


@router.post("/articles")
def publish(body: NewsroomPublish, db: DB):
    if body.section not in SECTION_KEYS:
        raise HTTPException(422, "Unknown section.")
    blocks = sanitize_blocks(body.body)
    words = len(_plain_text(blocks).split())
    story_id = f"nr-{body.id}"
    now = datetime.now(timezone.utc)
    top = db.exec(select(func.min(Story.position))).one() or 0
    story = db.get(Story, story_id) or Story(id=story_id, section=body.section, title="", author="", ago="", read_minutes=1, position=top - 1)
    story.section = body.section
    story.title = body.headline.strip()
    story.deck = body.standfirst.strip()
    story.author = body.author.strip()
    story.ago = "Just now"
    story.read_minutes = max(1, round(words / 220))
    story.live = body.live or body.urgency == 5
    story.image_url = _clean_url(body.hero.poster_url or body.hero.url) if body.hero else ""
    story.caption = body.hero.caption if body.hero else ""
    story.source_name = "News APP"
    story.source_url = ""
    story.language = body.language
    story.origin = "newsroom"
    story.urgency = body.urgency
    story.published_at = story.published_at or now
    story.updated_at = now
    db.add(story)
    db.flush()
    content = db.get(ArticleContent, story_id) or ArticleContent(story_id=story_id)
    content.blocks = blocks
    content.media = body.hero.model_dump() if body.hero else {}
    content.updated_at = now
    db.add(content)
    db.commit()
    return {"ok": True, "story_id": story_id, "url": f"/#/story/{story_id}"}


@router.delete("/articles/{article_id}")
def unpublish(article_id: str, db: DB):
    story_id = article_id if article_id.startswith("nr-") else f"nr-{article_id}"
    content = db.get(ArticleContent, story_id)
    if content:
        db.delete(content)
    story = db.get(Story, story_id)
    if story:
        db.delete(story)
    db.commit()
    return {"ok": True, "removed": bool(story)}
