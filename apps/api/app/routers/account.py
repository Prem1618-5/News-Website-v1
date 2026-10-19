from datetime import datetime, timezone
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Header, HTTPException
from sqlmodel import select

from ..database import DB
from ..models import AccountProfile, ConsentRecord, LocalUser, Reader, ReadingDay, Story
from ..schemas import SECTION_KEYS, AccountUpdate, ReadActivity, ReaderState
from ..security import CurrentUser
from ..services.accounts import account_payload, ensure_profile, mark_read

router = APIRouter(prefix="/api", tags=["account"])


@router.get("/account")
def get_account(db: DB, user: CurrentUser):
    return account_payload(db, ensure_profile(db, user))


@router.put("/account")
def update_account(body: AccountUpdate, db: DB, user: CurrentUser):
    if set(body.interests) - SECTION_KEYS:
        raise HTTPException(422, "Choose interests from the available news sections.")
    if body.onboarding_completed and not body.interests:
        raise HTTPException(422, "Choose at least one interest to finish onboarding.")
    try:
        ZoneInfo(body.timezone)
    except ZoneInfoNotFoundError:
        raise HTTPException(422, "Choose a valid time zone.")
    profile = ensure_profile(db, user)
    profile.display_name = body.display_name.strip()
    profile.interests = list(dict.fromkeys(body.interests))
    profile.cookie_preferences = {**body.cookie_preferences.model_dump(), "necessary": True}
    profile.timezone = body.timezone
    profile.language = body.language
    profile.onboarding_completed = body.onboarding_completed
    profile.updated_at = datetime.now(timezone.utc)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return account_payload(db, profile)


@router.post("/activity/read")
def record_read(body: ReadActivity, db: DB, user: CurrentUser):
    if not db.get(Story, body.story_id):
        raise HTTPException(404, "Story not found.")
    today = mark_read(db, ensure_profile(db, user), body.story_id)
    return {"ok": True, "read_date": today.isoformat()}


@router.post("/activity/checkin")
def checkin_today(db: DB, user: CurrentUser):
    profile = ensure_profile(db, user)
    mark_read(db, profile, "daily-checkin")
    return account_payload(db, profile)


@router.get("/reader/state", response_model=ReaderState)
def get_state(db: DB, user: CurrentUser, x_legacy_reader_id: Annotated[str | None, Header(alias="X-Legacy-Reader-Id")] = None):
    user_id = str(user["id"])
    reader = db.get(Reader, user_id)
    if x_legacy_reader_id and x_legacy_reader_id != user_id:
        legacy = db.get(Reader, x_legacy_reader_id)
        # Only anonymous rows from the old build can be merged: a row keyed by a real account (local
        # or Supabase) belongs to that account, and merging it would copy and wipe someone else's data.
        owned = db.get(LocalUser, x_legacy_reader_id) or db.get(AccountProfile, x_legacy_reader_id)
        if legacy and not owned:
            mine, old = ReaderState(**(reader.state if reader else {})), ReaderState(**legacy.state)
            merged = ReaderState(
                saved=list(dict.fromkeys(mine.saved + old.saved)),
                liked=list(dict.fromkeys(mine.liked + old.liked)),
                follow=list(dict.fromkeys(mine.follow + old.follow)),
                hl=mine.hl + [h for h in old.hl if h not in mine.hl],
                cm={**old.cm, **mine.cm},
                theme=mine.theme or old.theme,
                sz=mine.sz or old.sz,
                lang=mine.lang or old.lang,
                place=mine.place or old.place,
            )
            db.merge(Reader(id=user_id, state=merged.model_dump()))
            db.delete(legacy)
            db.commit()
            return merged
    return ReaderState(**(reader.state if reader else {}))


@router.put("/reader/state", response_model=ReaderState)
def put_state(body: ReaderState, db: DB, user: CurrentUser):
    db.merge(Reader(id=str(user["id"]), state=body.model_dump()))
    db.commit()
    return body


@router.get("/me/export")
def export_my_data(db: DB, user: CurrentUser):
    """Right of access: everything we hold about the signed-in reader."""
    user_id = str(user["id"])
    profile = ensure_profile(db, user)
    reader = db.get(Reader, user_id)
    days = db.exec(select(ReadingDay).where(ReadingDay.user_id == user_id)).all()
    consent = db.exec(select(ConsentRecord).where(ConsentRecord.user_id == user_id)).all()
    return {
        "profile": account_payload(db, profile),
        "reader_state": reader.state if reader else {},
        "reading_days": [d.read_date.isoformat() for d in days],
        "consent_history": [{"version": c.version, "choices": c.choices, "source": c.source, "at": c.created_at.isoformat()} for c in consent],
    }
