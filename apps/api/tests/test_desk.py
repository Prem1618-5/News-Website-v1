"""Newsroom workflow end to end: people, invites, resets, writing, review, publishing, history and media."""
import io
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.staff_auth import DEMO_PASSWORD
from app.services.doc import clean_doc, to_blocks

client = TestClient(app)


@pytest.fixture(autouse=True, scope="module")
def _lifespan():
    with TestClient(app):
        yield


def auth(email: str, password: str = DEMO_PASSWORD) -> dict:
    r = client.post("/api/staff-auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


ADMIN = "rajiv.ranjan.sinha@newsapp.example"
EDITOR = "prabhat.singh@newsapp.example"
REPORTER = "ananya.kumari@newsapp.example"


def doc(*paragraphs: str, marks: list | None = None) -> dict:
    return {"type": "doc", "content": [
        {"type": "paragraph", "content": [{"type": "text", "text": p, **({"marks": marks} if marks and i == 0 else {})}]}
        for i, p in enumerate(paragraphs)
    ]}


BODY = doc("Heavy rain flooded Main Road in Ranchi on Sunday morning, and traffic was stopped for three hours near Firayalal Chowk.")


def new_person(by: dict, role: str = "reporter", **extra) -> tuple[dict, dict]:
    email = f"p.{uuid.uuid4().hex[:6]}@newsapp.example"
    r = client.post("/api/desk/team", headers=by, json={"name": "New Person", "email": email, "role": role, **extra})
    return r, {"email": email}


def join(invite_link: str, password: str = "joined-password") -> dict:
    token = invite_link.split("token=")[1]
    r = client.post("/api/staff-auth/reset", json={"token": token, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ------------------------------------------------------------ people


def test_admin_adds_editors_and_editors_add_only_their_reporters():
    admin, editor = auth(ADMIN), auth(EDITOR)
    r, _ = new_person(admin, "editor")
    assert r.status_code == 201 and r.json()["person"]["status"] == "invited" and "join?token=" in r.json()["invite_link"]
    r, _ = new_person(editor, "editor")
    assert r.status_code == 403
    r, _ = new_person(editor, "reporter", reports_to="someone-else")
    assert r.status_code == 201 and r.json()["person"]["reportsTo"] == "prabhat"
    reporter = auth(REPORTER)
    r, _ = new_person(reporter, "reporter")
    assert r.status_code == 403


def test_invite_link_sets_the_password_and_activates_once():
    r, who = new_person(auth(EDITOR), "reporter", home_state="JH", home_district="dhanbad")
    link = r.json()["invite_link"]
    assert client.post("/api/staff-auth/login", json={"email": who["email"], "password": "x" * 10}).status_code in (401, 403)
    info = client.get("/api/staff-auth/token", params={"token": link.split("token=")[1]}).json()
    assert info["purpose"] == "invite" and info["name"] == "New Person"
    headers = join(link)
    me = client.get("/api/desk/me", headers=headers).json()["staff"]
    assert me["status"] == "active" and me["reportsTo"] == "prabhat" and me["homeDistrict"] == "dhanbad"
    assert client.post("/api/staff-auth/reset", json={"token": link.split("token=")[1], "password": "again-password"}).status_code == 410


def test_forgot_password_resets_and_signs_out_old_sessions():
    r, who = new_person(auth(ADMIN), "reporter")
    old = join(r.json()["invite_link"], "before-reset-pw")
    answer = client.post("/api/staff-auth/forgot", json={"email": who["email"]}).json()
    assert answer["sent"] and "reset?token=" in answer["dev_link"]
    unknown = client.post("/api/staff-auth/forgot", json={"email": "nobody@newsapp.example"}).json()
    assert unknown["sent"] and "dev_link" not in unknown
    client.post("/api/staff-auth/reset", json={"token": answer["dev_link"].split("token=")[1], "password": "after-reset-pw"})
    assert client.get("/api/desk/me", headers=old).status_code == 401  # old session ended
    auth(who["email"], "after-reset-pw")


def test_editor_manages_own_reporters_only_and_admin_approves_requests():
    admin, editor = auth(ADMIN), auth(EDITOR)
    mine = next(p for p in client.get("/api/desk/team", headers=editor).json() if p["id"] == "ananya")
    assert mine["canManage"] and mine["email"]
    assert client.patch("/api/desk/team/ananya", headers=editor, json={"trusted": True}).json()["trusted"] is True
    assert client.patch("/api/desk/team/ananya", headers=editor, json={"trusted": False}).status_code == 200
    assert client.patch("/api/desk/team/ananya", headers=editor, json={"role": "editor"}).status_code == 403
    assert client.patch("/api/desk/team/rajiv", headers=editor, json={"status": "suspended"}).status_code == 403
    email = f"ask.{uuid.uuid4().hex[:6]}@newsapp.example"
    client.post("/api/staff-auth/signup", json={"display_name": "Asks To Join", "email": email, "password": "long-enough-pw"})
    pending = next(p for p in client.get("/api/desk/team", headers=admin).json() if p.get("email") == email)
    assert pending["status"] == "pending"
    assert client.post(f"/api/desk/team/{pending['id']}/approve", headers=admin, json={"role": "reporter", "reports_to": "prabhat"}).status_code == 200
    auth(email, "long-enough-pw")


def test_the_last_admin_cannot_be_removed():
    admin = auth(ADMIN)
    r = client.patch("/api/desk/team/rajiv", headers=admin, json={"status": "suspended"})
    assert r.status_code == 403  # nobody manages themselves


def test_suspending_someone_ends_their_session():
    admin = auth(ADMIN)
    r, _ = new_person(admin, "reporter")
    person = r.json()["person"]["id"]
    headers = join(r.json()["invite_link"])
    client.patch(f"/api/desk/team/{person}", headers=admin, json={"status": "suspended"})
    assert client.get("/api/desk/me", headers=headers).status_code == 401


# ------------------------------------------------------------ writing and review


def create(headers: dict, **fields) -> dict:
    r = client.post("/api/desk/articles", headers=headers, json={"headline_en": "Rain floods Main Road", "body_en": BODY, **fields})
    assert r.status_code == 201, r.text
    return r.json()


def test_full_review_cycle_with_highlights_and_senior_edits():
    reporter, editor = auth(REPORTER), auth(EDITOR)
    art = create(reporter, standfirst_en="Traffic stopped for hours")
    assert art["status"] == "draft" and art["state"] == "JH" and art["district"] == "ranchi" and art["can"]["submit"]
    # Other reporters' drafts are private.
    assert client.get(f"/api/desk/articles/{art['id']}", headers=editor).json()["status"] == "draft"
    assert client.patch(f"/api/desk/articles/{art['id']}", headers=editor, json={"headline_en": "x", "version": art["version"]}).status_code == 403

    sent = client.post(f"/api/desk/articles/{art['id']}/submit", headers=reporter, json={"scope": "local", "priority": "normal", "version": art["version"]})
    assert sent.status_code == 200 and sent.json()["status"] == "submitted"
    notices = client.get("/api/desk/notices", headers=editor).json()
    assert any(n["article_id"] == art["id"] and n["kind"] == "submitted" for n in notices)
    assert any(i["id"] == art["id"] for i in client.get("/api/desk/articles", headers=editor, params={"view": "review"}).json()["items"])

    # Editor highlights a problem, then fixes the headline directly.
    note = client.post(f"/api/desk/articles/{art['id']}/notes", headers=editor, json={
        "id": "note-1", "kind": "problem", "quote": "three hours", "message": "Check with traffic police",
    })
    assert note.status_code == 201
    current = client.get(f"/api/desk/articles/{art['id']}", headers=editor).json()
    marked = doc(BODY["content"][0]["content"][0]["text"], marks=[{"type": "note", "attrs": {"id": "note-1", "kind": "problem"}}])
    fixed = client.patch(f"/api/desk/articles/{art['id']}", headers=editor, json={
        "headline_en": "Rain floods Ranchi's Main Road", "body_en": marked, "version": current["version"],
    })
    assert fixed.status_code == 200
    back = client.post(f"/api/desk/articles/{art['id']}/return", headers=editor, json={"message": "Confirm the timing"})
    assert back.json()["status"] == "changes_requested"

    # The writer sees who changed it and what to fix.
    mine = client.get(f"/api/desk/articles/{art['id']}", headers=reporter).json()
    assert [c["id"] for c in mine["changed_by"]] == ["prabhat"] and mine["headline"] == "Rain floods Ranchi's Main Road"
    assert mine["notes"][0]["kind"] == "problem" and mine["notes"][0]["status"] == "open"
    assert mine["body_en"]["content"][0]["content"][0]["marks"][0]["type"] == "note"
    # It stays until the writer has looked at the changes.
    assert client.get(f"/api/desk/articles/{art['id']}", headers=reporter).json()["changed_by"]
    assert client.post(f"/api/desk/articles/{art['id']}/seen", headers=reporter).json()["changed_by"] == []
    # Fixing the problem is the writer's job; they mark it done and send it back.
    assert client.patch(f"/api/desk/articles/{art['id']}/notes/note-1", headers=reporter, json={"status": "done", "reply": "Confirmed"}).json()["status"] == "done"
    resent = client.post(f"/api/desk/articles/{art['id']}/submit", headers=reporter, json={"version": mine["version"]})
    assert resent.status_code == 200

    published = client.post(f"/api/desk/articles/{art['id']}/publish", headers=editor, json={"scope": "local", "message": "Good"})
    assert published.status_code == 200, published.text
    live = published.json()
    assert live["status"] == "published" and live["story_id"] == f"nr-{art['id']}"
    story = client.get(f"/api/stories/{live['slug']}").json()
    assert story["title"] == "Rain floods Ranchi's Main Road" and story["district"] == "ranchi" and story["author"] == "Ananya Kumari"
    assert "note" not in str(story["body"])  # review highlights never reach readers

    history = client.get(f"/api/desk/articles/{art['id']}/history", headers=reporter).json()["items"]
    kinds = [h["kind"] for h in history]
    assert kinds[0] == "create" and "request_changes" in kinds and kinds[-1] == "publish"
    assert {h["lane"] for h in history} == {"author", "desk"}


def test_breaking_news_goes_to_every_editor_and_tops_the_local_feed():
    reporter, admin = auth(REPORTER), auth(ADMIN)
    art = create(reporter, headline_en="Fire at Ranchi market", priority="breaking")
    client.post(f"/api/desk/articles/{art['id']}/submit", headers=reporter, json={"scope": "local", "priority": "breaking", "version": art["version"]})
    assert any(n["kind"] == "breaking" and n["article_id"] == art["id"] for n in client.get("/api/desk/notices", headers=admin).json())
    queue = client.get("/api/desk/articles", headers=admin, params={"view": "review"}).json()["items"]
    assert queue[0]["priority"] == "breaking"
    live = client.post(f"/api/desk/articles/{art['id']}/publish", headers=admin, json={}).json()
    feed = client.get("/api/stories", params={"near": "JH:ranchi", "limit": 5}).json()["items"]
    assert feed[0]["id"] == live["story_id"] and feed[0]["breaking"] is True


def test_trusted_reporter_publishes_directly_and_editor_checks_after():
    editor = auth(EDITOR)
    client.patch("/api/desk/team/mohit", headers=editor, json={"trusted": True})
    trusted = auth("mohit.oraon@newsapp.example")
    art = create(trusted, headline_en="Ranchi wins the state football final", section="sports")
    assert art["can"]["publish"] and not art["can"]["submit"]
    live = client.post(f"/api/desk/articles/{art['id']}/publish", headers=trusted, json={"scope": "state", "state": "JH"}).json()
    assert live["status"] == "published" and live["needs_check"]
    assert any(i["id"] == art["id"] for i in client.get("/api/desk/articles", headers=editor, params={"view": "checks"}).json()["items"])
    assert client.post(f"/api/desk/articles/{art['id']}/check", headers=editor).json()["needs_check"] is False
    client.patch("/api/desk/team/mohit", headers=editor, json={"trusted": False})


def test_untrusted_reporter_cannot_publish_and_reject_needs_a_reason():
    reporter, editor = auth(REPORTER), auth(EDITOR)
    art = create(reporter)
    assert client.post(f"/api/desk/articles/{art['id']}/publish", headers=reporter, json={}).status_code == 403
    client.post(f"/api/desk/articles/{art['id']}/submit", headers=reporter, json={"version": art["version"]})
    assert client.post(f"/api/desk/articles/{art['id']}/reject", headers=editor, json={"message": ""}).status_code == 422
    assert client.post(f"/api/desk/articles/{art['id']}/reject", headers=editor, json={"message": "Already covered"}).json()["status"] == "rejected"
    assert client.post(f"/api/desk/articles/{art['id']}/reopen", headers=reporter).json()["status"] == "draft"


def test_two_people_cannot_overwrite_each_other():
    reporter = auth(REPORTER)
    art = create(reporter)
    ok = client.patch(f"/api/desk/articles/{art['id']}", headers=reporter, json={"headline_en": "One", "version": art["version"]})
    assert ok.status_code == 200
    stale = client.patch(f"/api/desk/articles/{art['id']}", headers=reporter, json={"headline_en": "Two", "version": art["version"]})
    assert stale.status_code == 409


def test_hindi_only_story_publishes_with_a_readable_address():
    editor = auth(EDITOR)
    art = create(editor, primary_language="hi", headline_en="", headline_hi="पहली बारिश में रांची की सड़कें",
                 body_en={"type": "doc", "content": []}, body_hi=doc("रविवार सुबह भारी बारिश से मेन रोड पर पानी भर गया और तीन घंटे तक यातायात रुका रहा, लोगों को परेशानी हुई।"))
    live = client.post(f"/api/desk/articles/{art['id']}/publish", headers=editor, json={"scope": "local"}).json()
    assert live["slug"].startswith("pahli-barish")
    story = client.get(f"/api/stories/{live['slug']}").json()
    assert story["language"] == "hi" and story["title"].startswith("पहली") and not story["has_hi"]


def test_bilingual_story_keeps_both_languages():
    editor = auth(EDITOR)
    art = create(editor, headline_hi="मेन रोड पर बाढ़", body_hi=doc("रविवार को मेन रोड पर पानी भर गया।"))
    live = client.post(f"/api/desk/articles/{art['id']}/publish", headers=editor, json={"scope": "india"}).json()
    story = client.get(f"/api/stories/{live['slug']}").json()
    assert story["has_hi"] and story["title_hi"] == "मेन रोड पर बाढ़" and story["body_hi"] and story["state"] == ""


def test_delete_only_unpublished_drafts():
    reporter = auth(REPORTER)
    art = create(reporter)
    assert client.delete(f"/api/desk/articles/{art['id']}", headers=reporter).status_code == 200
    assert client.get(f"/api/desk/articles/{art['id']}", headers=reporter).status_code == 404


# ------------------------------------------------------------ bodies and media


def test_documents_are_cleaned_before_they_are_stored():
    dirty = {"type": "doc", "content": [
        {"type": "paragraph", "attrs": {"textAlign": "center", "onclick": "x"}, "content": [
            {"type": "text", "text": "click", "marks": [{"type": "link", "attrs": {"href": "javascript:alert(1)"}}]},
            {"type": "text", "text": " safe", "marks": [{"type": "link", "attrs": {"href": "https://example.com"}}, {"type": "textStyle", "attrs": {"color": "url(x)"}}]},
        ]},
        {"type": "image", "attrs": {"src": "https://other-site.example/photo.jpg"}},
        {"type": "image", "attrs": {"src": "/media/uploads/2026/10/a.jpg", "caption": "Main Road"}},
        {"type": "script", "content": [{"type": "text", "text": "x"}]},
    ]}
    clean = clean_doc(dirty)
    first = clean["content"][0]
    assert first["attrs"] == {"textAlign": "center"}
    assert "marks" not in first["content"][0] and first["content"][1]["marks"] == [{"type": "link", "attrs": {"href": "https://example.com"}}]
    assert [n["type"] for n in clean["content"]] == ["paragraph", "image"]  # hotlinked photo and script dropped
    blocks = to_blocks(clean)
    assert blocks[0]["props"] == {"textAlignment": "center"} and blocks[0]["content"][1] == {
        "type": "link", "href": "https://example.com", "content": [{"type": "text", "text": " safe", "styles": {}}],
    }
    assert blocks[1] == {"id": "b2", "type": "image", "props": {"url": "/media/uploads/2026/10/a.jpg", "caption": "Main Road", "credit": "", "name": ""}, "content": [], "children": []}


def test_lists_tables_and_fact_boxes_become_reader_blocks():
    d = {"type": "doc", "content": [
        {"type": "bulletList", "content": [{"type": "listItem", "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "one", "marks": [{"type": "bold"}]}]},
            {"type": "orderedList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "inner"}]}]}]},
        ]}]},
        {"type": "table", "content": [
            {"type": "tableRow", "content": [{"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Year"}]}]}]},
            {"type": "tableRow", "content": [{"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "2026"}]}]}]},
        ]},
        {"type": "factBox", "attrs": {"title": "Key facts"}, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Fact"}]}]},
    ]}
    blocks = to_blocks(d)
    assert blocks[0]["type"] == "bulletListItem" and blocks[0]["content"][0]["styles"] == {"bold": True}
    assert blocks[0]["children"][0]["type"] == "numberedListItem"
    assert blocks[1]["type"] == "table" and blocks[1]["props"]["header"] and blocks[1]["content"]["rows"][1]["cells"][0][0]["text"] == "2026"
    assert blocks[2]["type"] == "factbox" and blocks[2]["props"]["title"] == "Key facts" and blocks[2]["children"][0]["type"] == "paragraph"


def test_media_upload_checks_the_file_itself():
    reporter = auth(REPORTER)
    jpeg = b"\xff\xd8\xff\xe0" + b"0" * 200
    r = client.post("/api/desk/media", headers=reporter, files={"file": ("photo.jpg", io.BytesIO(jpeg), "image/jpeg")})
    assert r.status_code == 201 and r.json()["kind"] == "image" and r.json()["url"].startswith("/media/uploads/")
    served = client.get(r.json()["url"])
    assert served.status_code == 200 and served.content == jpeg
    fake = client.post("/api/desk/media", headers=reporter, files={"file": ("photo.jpg", io.BytesIO(b"<svg onload=alert(1)>"), "image/jpeg")})
    assert fake.status_code == 415
    assert client.post("/api/desk/media", files={"file": ("photo.jpg", io.BytesIO(jpeg), "image/jpeg")}).status_code == 401
    assert client.get("/media/../app/main.py").status_code == 404
