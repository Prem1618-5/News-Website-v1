"""Engine, sessions and first-run seeding."""
import json
import os
import shutil
from pathlib import Path
from typing import Annotated, Iterator

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine, select

from .config import DATA_DIR, get_settings
from .models import ArticleContent, Section, Story

settings = get_settings()


def _database_url() -> str:
    url = settings.resolved_database_url
    bundled = DATA_DIR / "news.db"
    # Serverless bundles are read-only. Without a real database, run on a writable copy in /tmp
    # (ephemeral: fine for previews, use DATABASE_URL for anything that must persist).
    if url.startswith("sqlite") and os.environ.get("VERCEL") and str(bundled) in url:
        scratch = Path("/tmp/news.db")
        if not scratch.exists() and bundled.exists():
            shutil.copyfile(bundled, scratch)
        return f"sqlite:///{scratch.as_posix()}"
    if url.startswith("sqlite"):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    return url


DATABASE_URL = _database_url()
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)


def get_db() -> Iterator[Session]:
    with Session(engine) as db:
        yield db


DB = Annotated[Session, Depends(get_db)]


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as db:
        if db.exec(select(Section)).first():
            return
        seed = json.loads((DATA_DIR / "seed.json").read_text("utf-8"))
        db.add_all(Section(**s) for s in seed["sections"])
        db.flush()
        db.add_all(Story(**s) for s in seed["stories"])
        db.flush()
        for article in seed.get("articles", []):
            db.add(ArticleContent(**article))
        db.commit()
