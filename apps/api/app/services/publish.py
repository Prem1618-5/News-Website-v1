"""Putting a Newsroom story on the public site (and taking it off again).

A published Newsroom story is a normal `Story` row (id "nr-<article id>") plus its `ArticleContent`, so the
Reader, the feeds, search and the static build treat it exactly like a pack story.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlmodel import Session, select

from ..content_pack import slugify
from ..models import ArticleContent, NewsroomArticle, StaffAccount, Story
from ..taxonomy import BREAKING_HOURS
from .content import search_text
from .doc import doc_text, safe_media, to_blocks, word_count
from .rebuild import request_rebuild

# ------------------------------------------------------------ Hindi -> Latin for web addresses

_VOWELS = {"अ": "a", "आ": "a", "इ": "i", "ई": "i", "उ": "u", "ऊ": "u", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o"}
_MATRAS = {"ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॅ": "e", "ॉ": "o"}
_CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
    "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "sh", "ष": "sh", "स": "s", "ह": "h",
}
_NUKTA = {"क": "q", "ख": "kh", "ग": "g", "ज": "z", "ड": "r", "ढ": "rh", "फ": "f"}
_PRECOMPOSED = {"क़": "क़", "ख़": "ख़", "ग़": "ग़", "ज़": "ज़", "ड़": "ड़", "ढ़": "ढ़", "फ़": "फ़"}
_DIGITS = {chr(0x0966 + i): str(i) for i in range(10)}


def _romanize_word(word: str) -> str:
    # Units of (letters, vowel, kind) with kind: "inherent" | "explicit" | "none" | "vowel"
    units: list[list[str]] = []
    i = 0
    while i < len(word):
        ch = word[i]
        if ch in _CONSONANTS:
            letters = _CONSONANTS[ch]
            if i + 1 < len(word) and word[i + 1] == "़":
                letters = _NUKTA.get(ch, letters)
                i += 1
            nxt = word[i + 1] if i + 1 < len(word) else ""
            if nxt in _MATRAS:
                units.append([letters, _MATRAS[nxt], "explicit"])
                i += 1
            elif nxt == "्":
                units.append([letters, "", "none"])
                i += 1
            else:
                units.append([letters, "a", "inherent"])
        elif ch in _VOWELS:
            units.append(["", _VOWELS[ch], "vowel"])
        elif ch in ("ं", "ँ"):
            units.append(["n", "", "none"])
        elif ch == "ः":
            units.append(["h", "", "none"])
        elif ch in _DIGITS:
            units.append([_DIGITS[ch], "", "none"])
        elif ch.isascii():
            units.append([ch, "", "none"])
        i += 1
    # Schwa deletion: the inherent "a" is silent at the end of a word, and between a vowel and a
    # consonant that carries its own vowel sign (पहली -> pahli, सड़कें -> sarken).
    for n, u in enumerate(units):
        if u[2] != "inherent" or n == 0:
            continue
        final = not any(x[1] for x in units[n + 1:])
        prev_voiced = bool(units[n - 1][1])
        nxt = units[n + 1] if n + 1 < len(units) else None
        if final:
            u[1] = ""
        elif prev_voiced and nxt and nxt[2] == "explicit":
            u[1] = ""
    return "".join(letters + vowel for letters, vowel, _ in units)


def romanize(text: str) -> str:
    for composed, decomposed in _PRECOMPOSED.items():
        text = text.replace(composed, decomposed)
    return " ".join(_romanize_word(w) for w in re.split(r"\s+", text) if w)


def slug_for(text: str) -> str:
    return slugify(text) or slugify(romanize(text))


def unique_slug(db: Session, wanted: str, story_id: str) -> str:
    base = slug_for(wanted) or slugify(story_id) or "story"
    slug, n = base, 2
    while (other := db.exec(select(Story).where(Story.slug == slug)).first()) and other.id != story_id:
        slug, n = f"{base}-{n}", n + 1
    return slug


# ------------------------------------------------------------ publishing


def story_id_for(article: NewsroomArticle) -> str:
    return f"nr-{article.id}"


def languages_of(article: NewsroomArticle) -> list[str]:
    """Languages the story is written in, primary first."""
    have = [lang for lang in ("en", "hi") if getattr(article, f"headline_{lang}").strip()]
    return sorted(have, key=lambda lang: lang != article.primary_language)


def publish(db: Session, article: NewsroomArticle, author: StaffAccount | None) -> Story:
    """Create or refresh the public story. Commits."""
    langs = languages_of(article)
    if not langs:
        raise ValueError("Write a headline first.")
    now = datetime.now(timezone.utc)
    story_id = story_id_for(article)
    first = langs[0] if "en" not in langs else "en"
    other = "hi" if first == "en" and "hi" in langs else ""
    body_first = article.body_en if first == "en" else article.body_hi
    plain_first = doc_text(body_first)
    top = db.exec(select(func.min(Story.position))).one() or 0
    story = db.get(Story, story_id) or Story(id=story_id, section=article.section, title="", author="", read_minutes=1, position=top - 1)
    story.title = getattr(article, f"headline_{first}").strip()
    story.deck = getattr(article, f"standfirst_{first}").strip()
    story.title_hi = article.headline_hi.strip() if other else ""
    story.deck_hi = article.standfirst_hi.strip() if other else ""
    story.language = article.primary_language if other else first
    story.slug = unique_slug(db, article.slug or article.headline_en or article.headline_hi, story_id)
    story.section = article.section
    story.scope = article.scope
    story.state = article.state if article.scope in ("local", "state") else ""
    story.district = article.district if article.scope == "local" else ""
    story.author = author.display_name if author else "News APP Desk"
    story.read_minutes = max(1, round(word_count(plain_first) / (180 if first == "hi" else 220)))
    story.urgency = 5 if article.priority == "breaking" else 2
    if article.priority == "breaking":
        story.breaking_until = story.breaking_until or now + timedelta(hours=BREAKING_HOURS)
    else:
        story.breaking_until = None
    hero = article.hero or {}
    story.image_url = safe_media(hero.get("poster") or hero.get("src")) if hero.get("kind") == "video" else safe_media(hero.get("src"))
    story.caption = str(hero.get("caption", ""))[:400]
    story.source_name = "News APP"
    story.source_url = ""
    story.origin = "newsroom"
    story.published_at = story.published_at or now
    story.updated_at = now
    plain_hi = doc_text(article.body_hi) if other else ""
    story.search_text = search_text(story.title, story.deck, story.title_hi, story.deck_hi, plain_first, plain_hi, " ".join(article.tags))
    db.add(story)
    db.flush()
    content = db.get(ArticleContent, story_id) or ArticleContent(story_id=story_id)
    content.blocks = to_blocks(body_first, "b")
    content.blocks_hi = to_blocks(article.body_hi, "h") if other else []
    content.media = {k: hero.get(k, "") for k in ("kind", "src", "poster", "alt", "caption", "credit")} if hero.get("src") else {}
    content.updated_at = now
    db.add(content)
    article.story_id = story_id
    article.slug = story.slug
    db.add(article)
    db.commit()
    request_rebuild()
    return story


def unpublish(db: Session, story_id: str) -> bool:
    content = db.get(ArticleContent, story_id)
    if content:
        db.delete(content)
    story = db.get(Story, story_id)
    if story:
        db.delete(story)
    db.commit()
    request_rebuild()
    return bool(story)
