import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.staff_auth import DEMO_PASSWORD

client = TestClient(app)


def login(email: str, password: str = DEMO_PASSWORD):
    return client.post("/api/staff-auth/login", json={"email": email, "password": password})


@pytest.fixture(autouse=True, scope="module")
def _lifespan():
    with TestClient(app):
        yield


def test_login_wrong_password_is_401():
    assert login("prabhat.singh@newsapp.example", "nope-nope").status_code == 401


def test_login_and_session_roundtrip():
    r = login("prabhat.singh@newsapp.example")
    assert r.status_code == 200
    token = r.json()["token"]
    me = client.get("/api/staff-auth/session", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["staff"]["role"] == "editor"


def test_session_rejects_garbage_token():
    assert client.get("/api/staff-auth/session", headers={"Authorization": "Bearer abc"}).status_code == 401


def test_signup_asks_to_join_and_blocks_duplicates():
    email = f"new.{uuid.uuid4().hex[:6]}@newsapp.example"
    body = {"display_name": "New Person", "email": email, "password": "long-enough-pw"}
    r = client.post("/api/staff-auth/signup", json=body)
    assert r.status_code == 200 and r.json()["pending"] is True and "token" not in r.json()
    assert login(email, "long-enough-pw").status_code == 403  # waiting for an admin
    assert client.post("/api/staff-auth/signup", json={**body, "email": f"  {email.upper()} "}).status_code == 409


def test_signup_rejects_short_password():
    r = client.post("/api/staff-auth/signup", json={"display_name": "Short Pw", "email": "s@newsapp.example", "password": "short"})
    assert r.status_code == 422
    assert r.json()["fields"]["password"]


def test_signup_rejects_blank_name():
    r = client.post("/api/staff-auth/signup", json={"display_name": "    ", "email": "blank@newsapp.example", "password": "long-enough-pw"})
    assert r.status_code == 422 and "display_name" in r.json()["fields"]


def test_successful_logins_do_not_lock_the_account():
    for _ in range(12):
        assert login("rajiv.ranjan.sinha@newsapp.example").status_code == 200


def test_repeated_failures_are_throttled():
    codes = [login("mohit.oraon@newsapp.example", "wrong-password").status_code for _ in range(9)]
    assert codes[:8] == [401] * 8 and codes[8] == 429


def test_reporter_token_cannot_use_editor_routes():
    token = login("ananya.kumari@newsapp.example").json()["token"]
    r = client.post("/api/newsroom/articles", headers={"Authorization": f"Bearer {token}"}, json={})
    assert r.status_code == 403


def test_editor_token_passes_newsroom_guard():
    token = login("prabhat.singh@newsapp.example").json()["token"]
    r = client.post("/api/newsroom/articles", headers={"Authorization": f"Bearer {token}"}, json={})
    assert r.status_code != 403


def test_ai_status_is_public_and_assist_needs_sign_in():
    status = client.get("/api/ai/status").json()
    assert "enabled" in status and "provider" not in status and "model" not in status
    assert client.post("/api/ai/assist", json={"task": "headline", "text": "x"}).status_code == 401


def test_reader_token_is_not_a_staff_token():
    from app.security import create_access_token

    staff = client.get("/api/staff-auth/session", headers={"Authorization": f"Bearer {create_access_token('anyone')}"})
    assert staff.status_code == 401


def test_reporter_can_call_ai_assist_but_gets_503_without_key():
    token = login("ananya.kumari@newsapp.example").json()["token"]
    r = client.post("/api/ai/assist", headers={"Authorization": f"Bearer {token}"}, json={"task": "headline", "text": "A story"})
    assert r.status_code in (200, 503)
