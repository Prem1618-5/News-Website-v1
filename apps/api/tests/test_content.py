import pytest
from fastapi.testclient import TestClient

from app.content_pack import classify, discover, load_pack, parse_article, slugify
from app.main import app
from app.taxonomy import SECTION_KEYS


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_pack_has_every_story_with_both_languages():
    items = load_pack()
    assert len(items) == len(discover()) == 27
    assert all(i["blocks"] and i["blocks_hi"] and i["title_hi"] for i in items)
    assert all(i["section"] in SECTION_KEYS for i in items)
    assert len({i["slug"] for i in items}) == len(items)


def test_parser_handles_lists_and_hides_pack_notes():
    text = (
        "# Title\n# शीर्षक\n\n## Deck\n## उप\n\n**Image / video reference | x:** No image. Page: https://www.amarujala.com/x ; https://a.example/p.jpg\n\n---\n\n"
        "## English\n\nNot Ranchi-specific (world/national story).\n\nIntro line.\n\n- one\n- two\n\n1) first\n2) second\n\n---\n\n"
        "## हिंदी\n\nरांची-विशिष्ट नहीं (विश्व/राष्ट्रीय खबर)।\n\nपरिचय।\n\n---\n*Source | स्रोत:* https://www.etvbharat.com/y\n"
        "*Compiled | संकलन:* 19 October 2026 / 19 अक्टूबर 2026.\n"
    )
    a = parse_article(text, "World")
    assert [b["type"] for b in a["blocks"]] == ["paragraph", "bulletListItem", "bulletListItem", "numberedListItem", "numberedListItem"]
    assert "Not Ranchi" not in str(a["blocks"]) and "रांची-विशिष्ट" not in str(a["blocks_hi"])
    assert a["ranchi_specific"] is False and a["compiled"].day == 19
    assert [s["name"] for s in a["sources"]] == ["ETV Bharat", "Amar Ujala"] and not any("p.jpg" in s["url"] for s in a["sources"])


def test_classification_uses_plain_positive_desks():
    assert classify("Crime_Accidents", "Bus overturns on NH-33", True) == ("safety", "ranchi")
    assert classify("Business_Infrastructure", "Crores lost in fraud in Ranchi", True)[0] == "safety"
    assert classify("Health_Public_Services", "108 ambulance staff strike", True)[0] == "health"
    assert classify("National", "IPL auction in Goa", True) == ("sports", "india")
    assert classify("Business_Infrastructure", "28 market committees in Jharkhand raise rent", True) == ("business", "jharkhand")
    assert classify("Technology", "Robots in Hangzhou", False) == ("tech", "world")


def test_slug_is_ascii_and_short():
    s = slugify("Hurricane Simon Crawls Along Mexico's Pacific Coast As Rachel's Remnants Flood Baja California")
    assert s.startswith("hurricane-simon-crawls-along-mexicos") and len(s) <= 72 and s.isascii()


def test_demo_data_is_gone_and_real_stories_are_served(client):
    page = client.get("/api/stories", params={"limit": 100}).json()
    assert page["total"] == 27
    assert all(i["title_hi"] and i["author"] == "News APP Desk" for i in page["items"])
    assert not any("bbc.co.uk" in i["source_url"] for i in page["items"])
    assert not any(i["image_url"] for i in page["items"])  # third-party photos are never hotlinked
    dates = [i["published_at"] for i in page["items"]]
    assert dates == sorted(dates, reverse=True)


def test_sections_include_new_positive_desks(client):
    rows = client.get("/api/sections").json()
    assert {"health", "safety", "justice", "education", "environment", "entertainment"} <= {s["key"] for s in rows}
    assert sum(s["count"] for s in rows) == 27 and {s["key"]: s["count"] for s in rows}["justice"] == 0


def test_filters_and_hindi_search(client):
    assert client.get("/api/stories", params={"scope": "ranchi"}).json()["total"] > 5
    safety = client.get("/api/stories", params={"section": "safety"}).json()
    assert safety["total"] >= 2 and {i["section"] for i in safety["items"]} == {"safety"}
    assert client.get("/api/stories", params={"section": "justice"}).json()["total"] == 0
    assert client.get("/api/stories", params={"q": "ambulance"}).json()["total"] >= 1
    assert client.get("/api/stories", params={"q": "एम्बुलेंस"}).json()["total"] >= 0
    assert client.get("/api/stories", params={"q": "रांची"}).json()["total"] >= 5
    assert client.get("/api/stories", params={"scope": "mars"}).status_code == 422


def test_story_detail_has_both_bodies_and_sources(client):
    slug = client.get("/api/stories", params={"q": "airport"}).json()["items"][0]["slug"]
    detail = client.get(f"/api/stories/{slug}").json()
    assert detail["body"] and detail["body_hi"] and detail["sources"] and detail["has_hi"]
    assert client.get("/api/stories/does-not-exist").status_code == 404


def test_ids_filter_and_trending_fallback(client):
    first = client.get("/api/stories", params={"limit": 3}).json()["items"]
    got = client.get("/api/stories", params={"ids": ",".join(s["id"] for s in first)}).json()
    assert got["total"] == 3
    assert len(client.get("/api/trending", params={"limit": 5}).json()["items"]) == 5


def test_snapshot_carries_everything_the_build_needs(client):
    snap = client.get("/api/snapshot").json()
    assert len(snap["stories"]) == 27 and len(snap["sections"]) == 13
    assert all(s["body"] for s in snap["stories"])


def test_sync_is_idempotent(client):
    from sqlmodel import Session

    from app.database import engine
    from app.services.content import sync_content

    with Session(engine) as db:
        assert sync_content(db) == 0


def test_old_database_gains_new_columns_without_losing_rows(tmp_path):
    from sqlalchemy import create_engine, inspect, text

    from app.database import migrate_columns

    old = create_engine(f"sqlite:///{(tmp_path / 'old.db').as_posix()}")
    with old.begin() as c:
        c.execute(text("CREATE TABLE section (key VARCHAR PRIMARY KEY, name VARCHAR, position INTEGER)"))
        c.execute(text("CREATE TABLE story (id VARCHAR PRIMARY KEY, section VARCHAR, title VARCHAR, published_at DATETIME)"))
        c.execute(text("CREATE TABLE articlecontent (story_id VARCHAR PRIMARY KEY, blocks JSON)"))
        c.execute(text("INSERT INTO story (id, section, title) VALUES ('a', 'world', 'Kept')"))
    migrate_columns(old)
    migrate_columns(old)  # second run is a no-op
    cols = {c["name"] for c in inspect(old).get_columns("story")}
    assert {"slug", "scope", "title_hi", "deck_hi", "search_text"} <= cols
    assert {"blocks_hi", "sources"} <= {c["name"] for c in inspect(old).get_columns("articlecontent")}
    with old.connect() as c:
        assert c.execute(text("SELECT title, scope FROM story")).one() == ("Kept", "world")


def test_forgot_password_does_not_pretend_to_send_mail_without_a_provider(client):
    r = client.post("/api/auth/forgot", json={"email": "someone@example.com"})
    assert r.status_code == 200 and r.json() == {"sent": False}
