"""Machine publishing bridge: scripts and imports holding NEWSROOM_API_KEY push finished stories here.

The Newsroom app itself publishes through /api/desk (routers/desk.py), which keeps drafts, review and history.
Bodies here are already in Reader block format; every block, inline item and URL is re-checked.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import select

from ..database import DB
from ..models import ArticleContent, Story
from ..schemas import SCOPE_KEYS, SECTION_KEYS, NewsroomPublish
from ..services.doc import COLORS, HIGHLIGHTS, safe_link
from ..services.publish import unique_slug
from ..taxonomy import BREAKING_HOURS, STATE_CODES, is_district
from ..security import require_newsroom
from ..services.content import search_text
from ..services.rebuild import request_rebuild

router = APIRouter(prefix="/api/newsroom", tags=["newsroom"], dependencies=[Depends(require_newsroom)])

ALLOWED_BLOCKS = {
    "paragraph", "heading", "quote", "bulletListItem", "numberedListItem", "checkListItem",
    "image", "video", "audio", "table", "divider", "pullquote", "factbox",
}
# Site files only: third-party images are never hotlinked, and data: URLs (SVG scripts) are refused.
SAFE_URL_PREFIXES = ("/images/", "/media/")
PROP_KEYS = {"level", "textAlignment", "url", "posterUrl", "caption", "credit", "name", "cite", "title", "header", "checked"}
BOOL_STYLES = {"bold", "italic", "underline", "strike", "code", "sup", "sub"}


def _clean_url(value: object) -> str:
    url = str(value or "")
    return url if url.startswith(SAFE_URL_PREFIXES) and ".." not in url else ""


def _clean_text(item: object) -> dict | None:
    if not isinstance(item, dict) or item.get("type") != "text":
        return None
    raw = item.get("styles") if isinstance(item.get("styles"), dict) else {}
    styles: dict = {k: True for k in BOOL_STYLES if raw.get(k) is True}
    if raw.get("highlight") in HIGHLIGHTS:
        styles["highlight"] = raw["highlight"]
    if raw.get("textColor") in COLORS:
        styles["textColor"] = raw["textColor"]
    return {"type": "text", "text": str(item.get("text", ""))[:20000], "styles": styles}


def _clean_inline(content: object) -> list[dict]:
    out: list[dict] = []
    for item in content if isinstance(content, list) else []:
        if isinstance(item, dict) and item.get("type") == "link":
            href = safe_link(item.get("href"))
            texts = [t for t in (_clean_text(c) for c in item.get("content") or []) if t]
            if href:
                out.append({"type": "link", "href": href, "content": texts})
            else:
                out.extend(texts)
        elif (text := _clean_text(item)):
            out.append(text)
    return out


def _clean_content(kind: str, content: object) -> list | dict:
    if kind == "table" and isinstance(content, dict):
        rows = content.get("rows") if isinstance(content.get("rows"), list) else []
        return {"type": "tableContent", "rows": [
            {"cells": [_clean_inline(c) for c in (r.get("cells") or [])[:20]]} for r in rows[:200] if isinstance(r, dict)
        ]}
    return _clean_inline(content)


def sanitize_blocks(blocks: list[dict], depth: int = 0) -> list[dict]:
    """Keep allow-listed block types only, strip unsafe media URLs. HTML is never accepted."""
    if depth > 3:
        return []
    clean: list[dict] = []
    for block in blocks:
        kind = block.get("type")
        if kind not in ALLOWED_BLOCKS:
            continue
        raw = block.get("props") if isinstance(block.get("props"), dict) else {}
        props = {k: (v[:400] if isinstance(v, str) else v) for k, v in raw.items() if k in PROP_KEYS and isinstance(v, (str, int, bool))}
        for key in ("url", "posterUrl"):
            if key in props:
                props[key] = _clean_url(props[key])
        if kind in ("image", "video", "audio") and not props.get("url"):
            continue
        clean.append({
            "id": str(block.get("id") or "")[:64],
            "type": kind,
            "props": props,
            "content": _clean_content(kind, block.get("content")),
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
    if body.scope not in SCOPE_KEYS:
        raise HTTPException(422, "Unknown coverage area.")
    if body.scope in ("local", "state") and body.state not in STATE_CODES:
        raise HTTPException(422, "Local and state stories need a state.")
    if body.scope == "local" and not is_district(body.state, body.district):
        raise HTTPException(422, "Local stories need a district.")
    blocks = sanitize_blocks(body.body)
    blocks_hi = sanitize_blocks(body.body_hi)
    plain = _plain_text(blocks)
    story_id = f"nr-{body.id}"
    now = datetime.now(timezone.utc)
    top = db.exec(select(func.min(Story.position))).one() or 0
    story = db.get(Story, story_id) or Story(id=story_id, section=body.section, title="", author="", read_minutes=1, position=top - 1)
    story.slug = unique_slug(db, body.slug or body.headline, story_id)
    story.section = body.section
    story.scope = body.scope
    story.state = body.state if body.scope in ("local", "state") else ""
    story.district = body.district if body.scope == "local" else ""
    story.title = body.headline.strip()
    story.deck = body.standfirst.strip()
    story.title_hi = body.headline_hi.strip()
    story.deck_hi = body.standfirst_hi.strip()
    story.author = body.author.strip()
    story.read_minutes = max(1, round(len(plain.split()) / 220))
    story.live = body.live
    breaking = body.breaking or body.urgency == 5
    story.breaking_until = (story.breaking_until or now + timedelta(hours=BREAKING_HOURS)) if breaking else None
    story.image_url = _clean_url(body.hero.poster_url or body.hero.url) if body.hero else ""
    story.caption = body.hero.caption if body.hero else ""
    story.source_name = "News APP"
    story.source_url = ""
    story.language = body.language
    story.origin = "newsroom"
    story.urgency = body.urgency
    story.published_at = story.published_at or now
    story.updated_at = now
    story.search_text = search_text(story.title, story.deck, story.title_hi, story.deck_hi, plain, _plain_text(blocks_hi))
    db.add(story)
    db.flush()
    content = db.get(ArticleContent, story_id) or ArticleContent(story_id=story_id)
    content.blocks = blocks
    content.blocks_hi = blocks_hi if story.title_hi else []
    content.media = body.hero.model_dump() if body.hero else {}
    content.updated_at = now
    db.add(content)
    db.commit()
    request_rebuild()
    return {"ok": True, "story_id": story_id, "slug": story.slug, "url": f"/story/{story.slug}"}


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
    request_rebuild()
    return {"ok": True, "removed": bool(story)}
