"""Reads bilingual article packs (one `article.md` per story) into plain dicts.

Standard library only, so the Reader's static build can run it without installing the API's dependencies:

    python apps/api/app/content_pack.py --snapshot > snapshot.json

Pack layout (one folder per pack, one folder per story, folder = desk):

    Ranchi_News_Bilingual/Sports/<story>/article.md

    # English headline
    # हिंदी शीर्षक
    ## English standfirst
    ## हिंदी उपशीर्षक
    **Image / video reference | ...:** where the source's image lives (never hotlinked)
    ---
    ## English            <- body, paragraphs / "- " bullets / "1) " numbered items
    ---
    ## हिंदी
    ---
    *Source | स्रोत:* https://...
    *Compiled | संकलन:* 19 October 2026 / ...
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

IST = timezone(timedelta(hours=5, minutes=30))
CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"

# Pack folder -> (section, default coverage). Folders are desks of the source pack, not our sections.
FOLDERS: dict[str, tuple[str, str]] = {
    "business_infrastructure": ("business", "local"),
    "crime_accidents": ("safety", "local"),
    "culture_durga_puja": ("culture", "local"),
    "education": ("education", "local"),
    "environment_civic": ("environment", "local"),
    "health_public_services": ("health", "local"),
    "sports": ("sports", "local"),
    "national": ("politics", "india"),
    "world": ("world", "world"),
    "technology": ("tech", "world"),
    "science": ("science", "world"),
    "entertainment": ("entertainment", "world"),
}

# Title keywords that move a story out of its folder's default desk. First match wins.
SECTION_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(fraud|scam|cheat\w*|theft|robbery|arrest\w*)\b", re.I), "safety"),
    (re.compile(r"\b(ipl|cricket|t20i?|odi|fifa|football|olympic\w*|stadium|auction)\b", re.I), "sports"),
    (re.compile(r"\b(exports?|imports?|gdp|inflation|sensex|nifty|rbi|budget|trade deficit|market|rent)\b", re.I), "business"),
    (re.compile(r"\b(court|high court|supreme court|verdict|bail|judge|tribunal)\b", re.I), "justice"),
    (re.compile(r"\b(hospital|ambulance|doctor|vaccine|disease|health)\b", re.I), "health"),
    (re.compile(r"\b(electoral roll|voter|election|sir)\b", re.I), "politics"),
)
INDIA_HINT = re.compile(r"\b(india\w*|airtel|jio|trai|rajinikanth|jailer|bollywood|delhi|mumbai)\b", re.I)
JHARKHAND_HINT = re.compile(r"\bjharkhand\b", re.I)
RANCHI_HINT = re.compile(r"\branchi\b", re.I)

REVIEW_FLAG = re.compile(
    r"please verify|cannot confirm|could not be retrieved|was not retrieved|were not retrieved|not in the text|not retrievable|"
    r"only (?:the )?(?:opening|headline)|caution:",
    re.I,
)
IMAGE_URL = re.compile(r"\.(?:avif|webp|jpe?g|png|gif|svg)(?:\?|$)", re.I)
URL = re.compile(r"https?://[^\s;,)<>\"']+")

OUTLETS = {
    "thecsrjournal.in": "The CSR Journal",
    "etvbharat.com": "ETV Bharat",
    "prabhatkhabar.com": "Prabhat Khabar",
    "amarujala.com": "Amar Ujala",
    "theweek.in": "The Week",
    "outlookindia.com": "Outlook India",
    "deccanchronicle.com": "Deccan Chronicle",
    "dtnext.in": "DT Next",
    "uniindia.com": "UNI",
    "dailypioneer.com": "The Pioneer",
    "iimranchi.ac.in": "IIM Ranchi",
    "sciencedaily.com": "ScienceDaily",
    "science.org": "Science",
    "aip.org": "AIP FYI",
    "jems.com": "JEMS",
    "khaleejtimes.com": "Khaleej Times",
    "letsdatascience.com": "Let's Data Science",
    "starlust.org": "Starlust",
    "hindutone.com": "Hindu Tone",
    "msmunify.com": "mSMUnify",
    "itv.com": "ITV News",
    "freepressjournal.in": "Free Press Journal",
}
MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}


def slugify(text: str, max_len: int = 72) -> str:
    text = re.sub(r"[’'`]", "", text.lower())
    words = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    if len(words) <= max_len:
        return words
    cut = words[:max_len]
    return cut[: cut.rfind("-")] if "-" in cut else cut


def outlet_name(url: str) -> str:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    for domain, name in OUTLETS.items():
        if host == domain or host.endswith("." + domain):
            return name
    base = host.split(".")[0] if host else "Source"
    return base.replace("-", " ").title() or "Source"


def _block(kind: str, text: str, n: int, lang: str) -> dict:
    return {"id": f"{lang}{n}", "type": kind, "props": {}, "content": [{"type": "text", "text": text, "styles": {}}], "children": []}


def to_blocks(lines: list[str], lang: str) -> list[dict]:
    """Paragraphs, `- ` bullets and `1) ` / `1. ` numbered items -> BlockNote-style blocks."""
    blocks: list[dict] = []
    paragraph: list[str] = []

    def flush() -> None:
        if paragraph:
            blocks.append(_block("paragraph", " ".join(paragraph).strip(), len(blocks) + 1, lang))
            paragraph.clear()

    for raw in lines:
        line = raw.strip()
        if not line:
            flush()
            continue
        bullet = re.match(r"^[-*•]\s+(.*)$", line)
        number = re.match(r"^\d{1,2}[.)]\s+(.*)$", line)
        if bullet:
            flush()
            blocks.append(_block("bulletListItem", bullet.group(1).strip(), len(blocks) + 1, lang))
        elif number:
            flush()
            blocks.append(_block("numberedListItem", number.group(1).strip(), len(blocks) + 1, lang))
        else:
            paragraph.append(line)
    flush()
    return blocks


def blocks_text(blocks: list[dict]) -> str:
    return " ".join(
        str(c.get("text", "")) for b in blocks for c in (b.get("content") or []) if isinstance(c, dict)
    ).strip()


def parse_article(text: str, folder: str) -> dict:
    """One `article.md` -> normalised dict. Raises ValueError for files that are not articles."""
    lines = text.replace("\r\n", "\n").lstrip("﻿").split("\n")
    heads = [l[2:].strip() for l in lines if l.startswith("# ")]
    subs = [l[3:].strip() for l in lines if l.startswith("## ") and l[3:].strip().lower() not in ("english", "hindi", "हिंदी", "हिन्दी")]
    if len(heads) < 2:
        raise ValueError("expected an English and a Hindi '# ' headline")

    ref = next((l for l in lines if l.startswith("**Image")), "")
    primary = next((m.group(1) for l in lines if (m := re.match(r"^\*Source[^*]*\*\s*(\S+)", l))), "")
    compiled = next((l for l in lines if l.startswith("*Compiled")), "")
    date = None
    if m := re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", compiled):
        month = MONTHS.get(m.group(2).lower())
        if month:
            date = datetime(int(m.group(3)), month, int(m.group(1)), tzinfo=IST)

    bodies: dict[str, list[str]] = {"en": [], "hi": []}
    lang = ""
    local_only = True
    for line in lines:
        s = line.strip()
        if s.startswith("## "):
            name = s[3:].strip().lower()
            lang = "en" if name == "english" else "hi" if name in ("hindi", "हिंदी", "हिन्दी") else ""
            continue
        if s == "---":
            lang = ""
            continue
        if s.startswith("*Source") or s.startswith("*Compiled"):
            lang = ""
            continue
        if lang:
            if s.lower().startswith("not ranchi-specific") or s.startswith("रांची-विशिष्ट नहीं"):
                local_only = False
                continue
            bodies[lang].append(line)

    blocks_en, blocks_hi = to_blocks(bodies["en"], "e"), to_blocks(bodies["hi"], "h")
    if not blocks_en:
        raise ValueError("no English body")

    urls = [u.rstrip(".") for u in URL.findall(ref) if not IMAGE_URL.search(u)]
    if primary:
        urls.insert(0, primary)
    sources, seen = [], set()
    for u in urls:
        if u not in seen and len(sources) < 6:
            seen.add(u)
            sources.append({"name": outlet_name(u), "url": u})

    flags = sorted({m.group(0).lower() for m in REVIEW_FLAG.finditer(text)})
    return {
        "folder": folder,
        "title": heads[0],
        "title_hi": heads[1],
        "deck": subs[0] if subs else "",
        "deck_hi": subs[1] if len(subs) > 1 else "",
        "blocks": blocks_en,
        "blocks_hi": blocks_hi,
        "sources": sources,
        "source_name": sources[0]["name"] if sources else "",
        "source_url": sources[0]["url"] if sources else "",
        "compiled": date,
        "ranchi_specific": local_only,
        "review_flags": flags,
        "words": len(blocks_text(blocks_en).split()),
    }


def classify(folder: str, title: str, ranchi_specific: bool) -> tuple[str, str]:
    """(section, scope) for a story. Folder gives the default; clear title keywords refine it."""
    section, scope = FOLDERS.get(folder.lower(), ("world", "world"))
    for pattern, key in SECTION_RULES:
        if pattern.search(title):
            section = key
            break
    if scope == "local":
        if JHARKHAND_HINT.search(title) and not RANCHI_HINT.search(title):
            scope = "state"
    elif folder.lower() in ("technology", "science", "entertainment") and INDIA_HINT.search(title):
        scope = "india"
    if not ranchi_specific and scope in ("local", "state"):
        scope = "india" if INDIA_HINT.search(title) else "world"
    return section, scope


def place_of(scope: str) -> tuple[str, str]:
    """(state, district) for a pack story: the pack covers Ranchi, Jharkhand."""
    return {"local": ("JH", "ranchi"), "state": ("JH", "")}.get(scope, ("", ""))


def discover(root: Path = CONTENT_DIR) -> list[Path]:
    return sorted(root.rglob("article.md")) if root.exists() else []


def load_pack(root: Path = CONTENT_DIR) -> list[dict]:
    """Every story under `root`, classified, slugged and dated. Most detailed stories are newest."""
    items: list[dict] = []
    for path in discover(root):
        folder = path.parent.parent.name
        try:
            item = parse_article(path.read_text("utf-8"), folder)
        except ValueError as exc:
            print(f"skip {path}: {exc}", file=sys.stderr)
            continue
        item["section"], item["scope"] = classify(folder, item["title"], item["ranchi_specific"])
        item["state"], item["district"] = place_of(item["scope"])
        item["path"] = path
        items.append(item)

    used: set[str] = set()
    for item in items:
        slug = base = slugify(item["title"]) or "story"
        n = 2
        while slug in used:
            slug, n = f"{base}-{n}", n + 1
        used.add(slug)
        item["slug"] = slug

    items.sort(key=lambda i: (-i["words"], i["slug"]))
    for rank, item in enumerate(items):
        day = item["compiled"] or datetime.now(IST)
        item["published_at"] = day.replace(hour=12, minute=0, second=0, microsecond=0) - timedelta(minutes=7 * rank)
        item["read_minutes"] = max(1, round(item["words"] / 220))
    return items


def snapshot(root: Path = CONTENT_DIR) -> dict:
    """The same JSON shape as GET /api/snapshot, built straight from the content folder (offline builds)."""
    from .taxonomy import SECTION_DEFS  # local import keeps `python content_pack.py` runnable standalone

    stories = []
    for it in load_pack(root):
        stories.append({
            "id": it["slug"], "slug": it["slug"], "section": it["section"], "scope": it["scope"],
            "state": it["state"], "district": it["district"], "breaking": False,
            "title": it["title"], "title_hi": it["title_hi"], "deck": it["deck"], "deck_hi": it["deck_hi"],
            "author": "News APP Desk", "author_slug": "news-app-desk",
            "read_minutes": it["read_minutes"], "live": False, "urgency": 2, "image_url": "", "caption": "",
            "source_name": it["source_name"], "source_url": it["source_url"], "language": "en", "has_hi": bool(it["blocks_hi"]),
            "published_at": it["published_at"].isoformat(), "updated_at": it["published_at"].isoformat(),
            "body": it["blocks"], "body_hi": it["blocks_hi"], "sources": it["sources"],
        })
    counts: dict[str, int] = {}
    for s in stories:
        counts[s["section"]] = counts.get(s["section"], 0) + 1
    sections = [{"key": s.key, "name": s.name, "name_hi": s.name_hi, "color": s.color, "about": s.about, "about_hi": s.about_hi,
                 "position": i, "count": counts.get(s.key, 0)} for i, s in enumerate(SECTION_DEFS)]
    return {"generated_at": datetime.now(timezone.utc).isoformat(), "sections": sections, "stories": stories}


if __name__ == "__main__":
    if "--snapshot" in sys.argv:
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from app.content_pack import snapshot as _snapshot  # noqa: E402

        sys.stdout.reconfigure(encoding="utf-8")
        print(json.dumps(_snapshot(), ensure_ascii=False))
    else:
        for it in load_pack():
            flag = f"  [review: {', '.join(it['review_flags'])}]" if it["review_flags"] else ""
            print(f"{it['section']:<14}{it['scope']:<10}{it['slug']}{flag}")
