"""The demo seeder drives the real desk API; this keeps it in step with the rules it has to pass."""
import runpy
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlmodel import Session, select

from app.database import engine
from app.main import app
from app.models import ArticleContent, ArticleRevision, NewsroomArticle, Notice, ReviewNote, Story, StaffAccount

SEEDER = Path(__file__).resolve().parent.parent / "scripts" / "seed_demo_newsroom.py"


@pytest.fixture
def clean_newsroom():
    yield
    # The seeder publishes stories and makes a reporter trusted: undo both so other modules see a fresh newsroom.
    with Session(engine) as db:
        ids = [s.id for s in db.exec(select(Story).where(Story.origin == "newsroom")).all()]
        for model in (ReviewNote, ArticleRevision, Notice, NewsroomArticle):
            db.exec(delete(model))
        if ids:
            db.exec(delete(ArticleContent).where(ArticleContent.story_id.in_(ids)))  # type: ignore[attr-defined]
            db.exec(delete(Story).where(Story.id.in_(ids)))  # type: ignore[attr-defined]
        for a in db.exec(select(StaffAccount).where(StaffAccount.trusted == True)).all():  # noqa: E712
            a.trusted = False
            db.add(a)
        db.commit()


def test_seeder_leaves_stories_in_every_stage_and_refuses_a_second_run(monkeypatch, clean_newsroom):
    with TestClient(app) as api:
        monkeypatch.setattr(httpx, "Client", lambda **_: api)
        monkeypatch.setattr(sys, "argv", ["seed_demo_newsroom.py", ""])
        runpy.run_path(str(SEEDER), run_name="__main__")
        token = api.post("/api/staff-auth/login", json={"email": "prabhat.singh@newsapp.example", "password": "Newsroom#2026"}).json()["token"]
        items = api.get("/api/desk/articles", headers={"Authorization": f"Bearer {token}"}, params={"view": "all", "limit": 100}).json()["items"]
        assert {i["status"] for i in items} >= {"published", "submitted", "changes_requested", "rejected"}
        full = [api.get(f"/api/desk/articles/{i['id']}", headers={"Authorization": f"Bearer {token}"}).json() for i in items[:3]]
        assert all("demo" in a["tags"] for a in full)
        with pytest.raises(SystemExit):
            runpy.run_path(str(SEEDER), run_name="__main__")
