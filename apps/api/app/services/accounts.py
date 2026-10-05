"""Reader profiles and reading streaks."""
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlmodel import Session, select

from ..models import AccountProfile, ReadingDay

DEFAULT_CONSENT = {"necessary": True, "preferences": True, "analytics": False, "personalization": False, "notifications": False}


def local_today(tz: str) -> date:
    try:
        return datetime.now(ZoneInfo(tz)).date()
    except ZoneInfoNotFoundError:
        return datetime.now(timezone.utc).date()


def ensure_profile(db: Session, user: dict) -> AccountProfile:
    user_id = str(user["id"])
    profile = db.get(AccountProfile, user_id)
    if profile is None:
        metadata = user.get("user_metadata") or {}
        profile = AccountProfile(user_id=user_id, email=str(user.get("email") or ""), display_name=str(metadata.get("display_name") or ""))
        db.add(profile)
        db.commit()
        db.refresh(profile)
    elif user.get("email") and profile.email != user["email"]:
        profile.email = str(user["email"])
        profile.updated_at = datetime.now(timezone.utc)
        db.add(profile)
        db.commit()
    return profile


def streak_for(db: Session, user_id: str, today: date) -> tuple[int, bool, int, int, list[str]]:
    rows = db.exec(select(ReadingDay).where(ReadingDay.user_id == user_id)).all()
    days = {row.read_date for row in rows}
    active_today = today in days
    cursor = today if active_today else today - timedelta(days=1)
    current = 0
    while cursor in days:
        current += 1
        cursor -= timedelta(days=1)
    longest = run = 0
    prev: date | None = None
    for d in sorted(days):
        run = run + 1 if prev is not None and d == prev + timedelta(days=1) else 1
        prev = d
        longest = max(longest, run)
    return current, active_today, max(current, longest), len(days), [d.isoformat() for d in sorted(days)]


def account_payload(db: Session, profile: AccountProfile) -> dict:
    streak, active_today, longest, total, active_dates = streak_for(db, profile.user_id, local_today(profile.timezone))
    return {
        "user_id": profile.user_id,
        "email": profile.email,
        "display_name": profile.display_name,
        "interests": profile.interests or [],
        "cookie_preferences": {**DEFAULT_CONSENT, **(profile.cookie_preferences or {})},
        "language": profile.language or "en",
        "timezone": profile.timezone,
        "onboarding_completed": profile.onboarding_completed,
        "streak_days": streak,
        "active_today": active_today,
        "longest_streak": longest,
        "total_active_days": total,
        "active_dates": active_dates,
    }


def mark_read(db: Session, profile: AccountProfile, story_id: str) -> date:
    today = local_today(profile.timezone)
    activity = db.get(ReadingDay, (profile.user_id, today))
    if activity is None:
        db.add(ReadingDay(user_id=profile.user_id, read_date=today, story_id=story_id))
    else:
        activity.story_id = story_id
        db.add(activity)
    db.commit()
    return today
