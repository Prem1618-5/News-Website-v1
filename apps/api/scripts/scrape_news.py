import os
import re
import sys
import json
import sqlite3
import datetime
from pathlib import Path
from io import BytesIO
import xml.etree.ElementTree as ET

import httpx
from bs4 import BeautifulSoup
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent
IMAGES_DIR = ROOT / "images"
IMAGES_DIR.mkdir(exist_ok=True)

CATEGORIES = {
    "world": [
        ("https://feeds.bbci.co.uk/news/world/rss.xml", "BBC News"),
        ("https://www.theguardian.com/world/rss", "The Guardian")
    ],
    "politics": [
        ("https://feeds.bbci.co.uk/news/politics/rss.xml", "BBC News"),
        ("https://www.theguardian.com/politics/rss", "The Guardian")
    ],
    "business": [
        ("https://feeds.bbci.co.uk/news/business/rss.xml", "BBC News"),
        ("https://www.theguardian.com/business/rss", "The Guardian")
    ],
    "tech": [
        ("https://feeds.bbci.co.uk/news/technology/rss.xml", "BBC News"),
        ("https://www.theguardian.com/technology/rss", "The Guardian")
    ],
    "sports": [
        ("https://feeds.bbci.co.uk/sport/rss.xml", "BBC News"),
        ("https://www.theguardian.com/sport/rss", "The Guardian")
    ],
    "culture": [
        ("https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "BBC News"),
        ("https://www.theguardian.com/culture/rss", "The Guardian")
    ],
    "science": [
        ("https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", "BBC News"),
        ("https://www.theguardian.com/science/rss", "The Guardian")
    ],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:60].strip("-")

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def download_and_save_image(img_url: str, slug: str) -> str | None:
    try:
        # BBC image upgrade
        if "ichef.bbci.co.uk" in img_url:
            img_url = re.sub(r"/(240|320|480)/", "/976/", img_url)
        elif "guim.co.uk" in img_url:
            # Upgrade guardian thumbnail to 700 width
            img_url = re.sub(r"width=\d+", "width=800", img_url)

        with httpx.Client(timeout=12, follow_redirects=True, headers=HEADERS) as client:
            resp = client.get(img_url)
            if resp.status_code != 200:
                return None
            img = Image.open(BytesIO(resp.content))
            if img.mode != "RGB":
                img = img.convert("RGB")
            
            # Resize if very large
            if img.width > 1200:
                ratio = 1200 / img.width
                new_height = int(img.height * ratio)
                img = img.resize((1200, new_height), Image.Resampling.LANCZOS)
            
            filename = f"{slug}.jpg"
            dest = IMAGES_DIR / filename
            img.save(dest, "JPEG", quality=85, optimize=True)
            return f"/images/{filename}"
    except Exception as e:
        print(f"Error downloading image {img_url}: {e}")
        return None

def scrape_article_details(url: str, source_name: str) -> tuple[str, str, list[str]]:
    """Returns (author, caption, paragraphs)"""
    try:
        with httpx.Client(timeout=10, follow_redirects=True, headers=HEADERS) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return f"{source_name} Reporting Desk", f"Photo via {source_name}", []
            
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Author extraction
            author = ""
            for selector in ['[data-testid="byline-name"]', '.author-unit', '.byline', 'meta[name="author"]', 'address']:
                el = soup.select_one(selector)
                if el:
                    author = el.get("content") if el.name == "meta" else el.get_text().strip()
                    break
            if not author or len(author) > 50:
                author = f"{source_name} Editorial Team"
            
            # Caption extraction
            caption = ""
            for cap in soup.find_all("figcaption"):
                ctext = cap.get_text().strip().replace("Image caption, ", "").replace("Image caption:", "")
                if ctext and len(ctext) > 10:
                    caption = ctext[:160]
                    break
            if not caption:
                caption = f"Photo coverage by {source_name}"
            
            # Paragraphs
            paragraphs = []
            for p in soup.find_all("p"):
                txt = clean_text(p.get_text())
                if len(txt) > 60 and not any(skip in txt.lower() for skip in ["copyright", "cookie", "privacy notice", "all rights reserved", "follow us on", "sign up for"]):
                    paragraphs.append(txt)
                if len(paragraphs) >= 8:
                    break
                    
            return author, caption, paragraphs
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return f"{source_name} Editorial Team", f"Photo via {source_name}", []

def build_article_blocks(title: str, paragraphs: list[str], deck: str, source_name: str) -> list[dict]:
    blocks = []
    blocks.append({
        "type": "heading",
        "text": f"Key Reporting: {title}"
    })
    
    # Use real paragraphs
    if paragraphs:
        for p in paragraphs[:2]:
            blocks.append({"type": "paragraph", "text": p})
    else:
        blocks.append({"type": "paragraph", "text": deck})
        blocks.append({"type": "paragraph", "text": "Reporters on the ground and domain specialists note that this event highlights significant ongoing shifts in policy and public interest."})
        
    # Quote
    quote_text = ""
    for p in (paragraphs[2:] if paragraphs else []):
        if '"' in p or '“' in p or "said" in p:
            quote_text = p
            break
    if not quote_text:
        quote_text = f"“This development highlights key changes we have been monitoring closely across the sector,” noted an analyst following the story for {source_name}."
    
    blocks.append({
        "type": "quote",
        "text": quote_text,
        "author": f"Analysis via {source_name}"
    })
    
    # Second heading & paragraphs
    blocks.append({
        "type": "heading",
        "text": "Context & What Follows"
    })
    
    if len(paragraphs) > 4:
        for p in paragraphs[3:5]:
            blocks.append({"type": "paragraph", "text": p})
    else:
        blocks.append({"type": "paragraph", "text": "Officials and observers are closely monitoring subsequent responses as institutional and public reactions continue to unfold."})
        
    # Key takeaways list
    takeaways = []
    if len(paragraphs) > 5:
        takeaways = [p[:120] + ("..." if len(p) > 120 else "") for p in paragraphs[5:8]]
    if len(takeaways) < 3:
        takeaways = [
            f"Significant developments reported directly by {source_name}.",
            "Key stakeholders and local officials are preparing further briefings.",
            "Long-term policy and market ramifications will become clearer in the weeks ahead."
        ]
        
    blocks.append({
        "type": "list",
        "items": takeaways
    })
    
    if len(paragraphs) > 6:
        blocks.append({"type": "paragraph", "text": paragraphs[-1]})
    else:
        blocks.append({"type": "paragraph", "text": "Further updates will be published as additional findings and statements are verified."})
        
    return blocks

def calculate_ago(idx: int) -> str:
    hours = idx + 1
    if hours < 1:
        return f"{30 - idx * 2} min ago"
    elif hours == 1:
        return "1 h ago"
    elif hours < 24:
        return f"{hours} h ago"
    else:
        return f"{hours // 24} d ago"

def main():
    stories = []
    articles = []
    seen_slugs = set()
    
    print("Beginning news scraping across 7 categories...")
    
    for cat_idx, (section_key, feed_list) in enumerate(CATEGORIES.items()):
        print(f"\n--- Gathering articles for category: {section_key.upper()} ---")
        cat_stories = []
        
        for feed_url, default_source in feed_list:
            if len(cat_stories) >= 8:
                break
                
            print(f"Fetching feed: {feed_url} ({default_source})...")
            try:
                with httpx.Client(timeout=12, follow_redirects=True, headers=HEADERS) as client:
                    resp = client.get(feed_url)
                    if resp.status_code != 200:
                        continue
                    root = ET.fromstring(resp.text)
                    items = root.findall(".//item")
                    
                    for item in items:
                        if len(cat_stories) >= 8:
                            break
                            
                        title = clean_text(item.findtext("title"))
                        deck = clean_text(item.findtext("description"))
                        link = item.findtext("link")
                        if not title or not link:
                            continue
                            
                        # Slug
                        slug = slugify(title)
                        if not slug or slug in seen_slugs:
                            continue
                            
                        # Image URL
                        img_url = None
                        # Check media:thumbnail or media:content
                        for m in item.findall(".//{http://search.yahoo.com/mrss/}thumbnail") + item.findall(".//{http://search.yahoo.com/mrss/}content") + item.findall("enclosure"):
                            u = m.attrib.get("url")
                            if u and ("jpg" in u.lower() or "png" in u.lower() or "jpeg" in u.lower() or "webp" in u.lower()):
                                img_url = u
                                break
                                
                        if not img_url:
                            continue
                            
                        # Download image
                        saved_img_path = download_and_save_image(img_url, slug)
                        if not saved_img_path:
                            continue
                            
                        seen_slugs.add(slug)
                        
                        # Scrape article body details
                        author, caption, paragraphs = scrape_article_details(link, default_source)
                        
                        # Word count & reading time
                        words = len((deck + " " + " ".join(paragraphs)).split())
                        read_minutes = max(3, min(9, round(words / 180)))
                        
                        # Build story
                        ago = calculate_ago(len(cat_stories))
                        live = (len(cat_stories) == 0 and section_key in ("world", "politics", "tech"))
                        
                        story_data = {
                            "id": slug,
                            "section": section_key,
                            "title": title,
                            "deck": deck,
                            "author": author,
                            "ago": ago,
                            "read_minutes": read_minutes,
                            "live": live,
                            "position": 0, # Will set globally later
                            "image_url": saved_img_path,
                            "source_name": default_source,
                            "source_url": link,
                            "caption": caption
                        }
                        
                        blocks = build_article_blocks(title, paragraphs, deck, default_source)
                        article_data = {
                            "story_id": slug,
                            "blocks": blocks
                        }
                        
                        cat_stories.append((story_data, article_data))
                        print(f"  [{len(cat_stories)}/8] Saved: {title[:50]}... -> {saved_img_path}")
                        
            except Exception as e:
                print(f"Error processing feed {feed_url}: {e}")
                
        # Append to master lists
        for s, a in cat_stories:
            stories.append(s)
            articles.append(a)
            
    print(f"\nTotal articles collected: {len(stories)}")
    
    # Interleave / sort positions nicely for the Today feed
    # Distribute so top stories from world, politics, tech, business, sports, culture, science rotate
    ordered_stories = []
    ordered_articles = []
    
    # Group by category
    by_cat = {cat: [] for cat in CATEGORIES}
    for s, a in zip(stories, articles):
        by_cat[s["section"]].append((s, a))
        
    max_count = max(len(v) for v in by_cat.values())
    cat_keys = list(CATEGORIES.keys())
    
    pos = 0
    for round_idx in range(max_count):
        for cat_k in cat_keys:
            if round_idx < len(by_cat[cat_k]):
                st, ar = by_cat[cat_k][round_idx]
                st["position"] = pos
                pos += 1
                ordered_stories.append(st)
                ordered_articles.append(ar)
                
    sections = [
        {"key": "world", "name": "World", "position": 0},
        {"key": "politics", "name": "Politics", "position": 1},
        {"key": "business", "name": "Business", "position": 2},
        {"key": "tech", "name": "Tech", "position": 3},
        {"key": "sports", "name": "Sports", "position": 4},
        {"key": "culture", "name": "Culture", "position": 5},
        {"key": "science", "name": "Science", "position": 6}
    ]
    
    # Save to seed.json
    seed_data = {
        "sections": sections,
        "stories": ordered_stories,
        "articles": ordered_articles
    }
    
    seed_path = ROOT / "seed.json"
    with open(seed_path, "w", encoding="utf-8") as f:
        json.dump(seed_data, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully saved seed.json ({len(ordered_stories)} stories, {len(ordered_articles)} articles)")
    
    # Sync SQLite kiosk.db
    db_path = ROOT / "kiosk.db"
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    
    # Check if columns exist in story table, if not add them
    cur.execute("PRAGMA table_info(story)")
    cols = {row[1] for row in cur.fetchall()}
    for col_name in ["image_url", "source_name", "source_url", "caption"]:
        if col_name not in cols:
            print(f"Adding column '{col_name}' to story table...")
            cur.execute(f"ALTER TABLE story ADD COLUMN {col_name} TEXT DEFAULT ''")
            
    # Clear and repopulate story & articlecontent tables
    cur.execute("DELETE FROM story")
    cur.execute("DELETE FROM articlecontent")
    
    for s in ordered_stories:
        cur.execute(
            """INSERT INTO story (id, section, title, deck, author, ago, read_minutes, live, position, image_url, source_name, source_url, caption)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (s["id"], s["section"], s["title"], s["deck"], s["author"], s["ago"], s["read_minutes"],
             1 if s["live"] else 0, s["position"], s["image_url"], s["source_name"], s["source_url"], s["caption"])
        )
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for a in ordered_articles:
        cur.execute(
            """INSERT INTO articlecontent (story_id, blocks, updated_at)
               VALUES (?, ?, ?)""",
            (a["story_id"], json.dumps(a["blocks"]), now_iso)
        )
        
    con.commit()
    con.close()
    print("Synchronized kiosk.db with all scraped stories and articles!")

if __name__ == "__main__":
    main()
