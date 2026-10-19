"""Keeps the database in step with the content folder and the section list."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlmodel import Session, select

from ..content_pack import CONTENT_DIR, blocks_text, load_pack
from ..models import ArticleContent, Section, Story
from ..taxonomy import SECTION_DEFS

PACK_AUTHOR = "News APP Desk"


def slugify_author(name: str) -> str:
    from ..content_pack import slugify

    return slugify(name) or "news-app-desk"


def search_text(*parts: str) -> str:
    return " ".join(p for p in parts if p).lower()


def sync_sections(db: Session) -> None:
    """Create or refresh every section. Safe to run on each start; adding a section is a code change only."""
    existing = {s.key: s for s in db.exec(select(Section)).all()}
    for position, d in enumerate(SECTION_DEFS):
        row = existing.get(d.key) or Section(key=d.key, name=d.name, position=position)
        row.name, row.position = d.name, position
        row.name_hi, row.color, row.about, row.about_hi = d.name_hi, d.color, d.about, d.about_hi
        db.add(row)
    db.commit()


def purge_legacy_demo(db: Session) -> int:
    """Drop the stories the old build seeded for demos (origin "demo")."""
    stale = db.exec(select(Story).where(Story.origin == "demo")).all()
    for story in stale:
        content = db.get(ArticleContent, story.id)
        if content:
            db.delete(content)
        db.delete(story)
    if stale:
        db.commit()
    return len(stale)


def sync_content(db: Session, root: Path = CONTENT_DIR) -> int:
    """Upsert every story found under `root` (origin "pack") and remove pack stories whose file is gone.

    Stories published from the Newsroom are never touched. Returns how many stories were written."""
    items = load_pack(root)
    if not items:
        return 0
    written = 0
    keep: set[str] = set()
    for rank, it in enumerate(items):
        keep.add(it["slug"])
        story = db.get(Story, it["slug"])
        body_text = f"{blocks_text(it['blocks'])} {blocks_text(it['blocks_hi'])}"
        fields = dict(
            slug=it["slug"], section=it["section"], scope=it["scope"], title=it["title"], title_hi=it["title_hi"],
            deck=it["deck"], deck_hi=it["deck_hi"], author=PACK_AUTHOR, read_minutes=it["read_minutes"], live=False,
            position=rank, source_name=it["source_name"], source_url=it["source_url"], language="en", origin="pack",
            urgency=2, published_at=it["published_at"], search_text=search_text(it["title"], it["title_hi"], it["deck"], it["deck_hi"], body_text),
        )
        content = db.get(ArticleContent, it["slug"])
        unchanged = (
            story is not None and content is not None
            and all(getattr(story, k) == v for k, v in fields.items() if k != "published_at")
            and content.blocks == it["blocks"] and content.blocks_hi == it["blocks_hi"] and content.sources == it["sources"]
        )
        if unchanged:
            continue
        story = story or Story(id=it["slug"], title="", author=PACK_AUTHOR, read_minutes=1, position=rank)
        for k, v in fields.items():
            setattr(story, k, v)
        story.updated_at = datetime.now(timezone.utc)
        db.add(story)
        db.flush()
        content = content or ArticleContent(story_id=it["slug"])
        content.blocks, content.blocks_hi, content.sources = it["blocks"], it["blocks_hi"], it["sources"]
        content.updated_at = story.updated_at
        db.add(content)
        written += 1
    for story in db.exec(select(Story).where(Story.origin == "pack")).all():
        if story.id not in keep:
            content = db.get(ArticleContent, story.id)
            if content:
                db.delete(content)
            db.delete(story)
            written += 1
    db.commit()
    return written
