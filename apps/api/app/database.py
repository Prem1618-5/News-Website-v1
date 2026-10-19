"""Engine, sessions and first-run seeding."""
import os
import shutil
from pathlib import Path
from typing import Annotated, Iterator

from fastapi import Depends
from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from .config import DATA_DIR, get_settings
from .services import content
from .taxonomy import LEGACY_SCOPES

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


# Columns added after the first release. create_all() never alters an existing table, so add them in place.
# (table, column) -> SQL type and default; portable between SQLite and Postgres.
_ADDED_COLUMNS: dict[str, dict[str, str]] = {
    "section": {
        "name_hi": "VARCHAR NOT NULL DEFAULT ''", "color": "VARCHAR NOT NULL DEFAULT ''",
        "about": "VARCHAR NOT NULL DEFAULT ''", "about_hi": "VARCHAR NOT NULL DEFAULT ''",
    },
    "story": {
        "slug": "VARCHAR NOT NULL DEFAULT ''", "scope": "VARCHAR NOT NULL DEFAULT 'world'",
        "title_hi": "VARCHAR NOT NULL DEFAULT ''", "deck_hi": "VARCHAR NOT NULL DEFAULT ''",
        "search_text": "VARCHAR NOT NULL DEFAULT ''",
        "state": "VARCHAR NOT NULL DEFAULT ''", "district": "VARCHAR NOT NULL DEFAULT ''", "breaking_until": "TIMESTAMP",
    },
    "staffaccount": {
        "reports_to": "VARCHAR NOT NULL DEFAULT ''", "trusted": "BOOLEAN NOT NULL DEFAULT FALSE",
        "home_state": "VARCHAR NOT NULL DEFAULT ''", "home_district": "VARCHAR NOT NULL DEFAULT ''",
        "writing_language": "VARCHAR NOT NULL DEFAULT 'en'", "created_by": "VARCHAR NOT NULL DEFAULT ''",
        "token_version": "INTEGER NOT NULL DEFAULT 0", "last_login_at": "TIMESTAMP",
    },
    "articlecontent": {"blocks_hi": "JSON NOT NULL DEFAULT '[]'", "sources": "JSON NOT NULL DEFAULT '[]'"},
}
_ADDED_INDEXES = (
    "CREATE INDEX IF NOT EXISTS ix_story_slug ON story (slug)",
    "CREATE INDEX IF NOT EXISTS ix_story_scope ON story (scope)",
    "CREATE INDEX IF NOT EXISTS ix_story_published_at ON story (published_at)",
    "CREATE INDEX IF NOT EXISTS ix_story_state ON story (state)",
)


def migrate_columns(target=None) -> None:
    with (target or engine).begin() as conn:
        present = inspect(conn)
        for table, columns in _ADDED_COLUMNS.items():
            if not present.has_table(table):
                continue
            have = {c["name"] for c in present.get_columns(table)}
            for name, ddl in columns.items():
                if name not in have:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))
        for statement in _ADDED_INDEXES:
            conn.execute(text(statement))
        if present.has_table("story"):
            # Scopes used to be place names; they are now a level plus a place.
            for legacy, (level, state, district) in LEGACY_SCOPES.items():
                conn.execute(
                    text("UPDATE story SET scope = :level, state = :state, district = :district WHERE scope = :legacy"),
                    {"level": level, "state": state, "district": district, "legacy": legacy},
                )


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    migrate_columns()
    with Session(engine) as db:
        content.sync_sections(db)
        content.purge_legacy_demo(db)
        content.sync_content(db)
