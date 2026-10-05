"""Consent ledger, consent-gated analytics events and the aggregate view used by the Newsroom admin space."""
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from ..database import DB
from ..models import AnalyticsEvent, ConsentRecord
from ..schemas import ConsentChoice, EventBatch
from ..security import OptionalUser, require_newsroom

router = APIRouter(prefix="/api", tags=["privacy"])
K_ANONYMITY_FLOOR = 10


def latest_consent(db, subject_id: str) -> ConsentRecord | None:
    return db.exec(
        select(ConsentRecord).where(ConsentRecord.subject_id == subject_id).order_by(ConsentRecord.created_at.desc())
    ).first()


@router.post("/consent")
def record_consent(body: ConsentChoice, db: DB, user: OptionalUser):
    choices = body.choices.model_dump()
    choices["necessary"] = True
    if body.gpc:
        choices["analytics"] = False
        choices["personalization"] = False
    record = ConsentRecord(
        subject_id=body.subject_id, user_id=str(user["id"]) if user else "", version=body.version,
        choices=choices, source=body.source, gpc=body.gpc,
    )
    db.add(record)
    db.commit()
    return {"ok": True, "choices": choices, "version": body.version}


@router.get("/consent/{subject_id}")
def get_consent(subject_id: str, db: DB):
    record = latest_consent(db, subject_id)
    if not record:
        return {"choices": None, "version": None}
    return {"choices": record.choices, "version": record.version, "at": record.created_at.isoformat()}


@router.post("/events", status_code=202)
def ingest_events(batch: EventBatch, db: DB):
    consent = latest_consent(db, batch.subject_id)
    if not consent or not consent.choices.get("analytics"):
        return {"accepted": 0, "reason": "no analytics consent"}
    for event in batch.events:
        db.add(AnalyticsEvent(subject_id=batch.subject_id, **event.model_dump()))
    db.commit()
    return {"accepted": len(batch.events)}


@router.get("/admin/audience", dependencies=[Depends(require_newsroom)])
def audience_summary(db: DB, days: int = 30):
    """Aggregates for the Newsroom admin space. Slices under the k-anonymity floor are suppressed."""
    if days < 1 or days > 90:
        raise HTTPException(422, "days must be between 1 and 90")
    since = datetime.now(timezone.utc) - timedelta(days=days)

    latest: dict[str, ConsentRecord] = {}
    for record in db.exec(select(ConsentRecord).order_by(ConsentRecord.created_at)).all():
        latest[record.subject_id] = record
    subjects = len(latest)
    tiers = ["necessary", "preferences", "analytics", "personalization", "notifications"]
    consent_rates = {
        tier: (round(100 * sum(1 for r in latest.values() if r.choices.get(tier)) / subjects) if subjects else None) for tier in tiers
    }

    events = db.exec(select(AnalyticsEvent).where(AnalyticsEvent.created_at >= since)).all()
    readers = {e.subject_id for e in events}
    by_day: Counter[str] = Counter()
    devices: Counter[str] = Counter()
    sources: Counter[str] = Counter()
    languages: Counter[str] = Counter()
    sections: Counter[str] = Counter()
    for e in events:
        if e.name == "page_view":
            by_day[e.created_at.date().isoformat()] += 1
            if e.device:
                devices[e.device] += 1
            if e.referrer_kind:
                sources[e.referrer_kind] += 1
        if e.name == "article_open" and e.section:
            sections[e.section] += 1
        if e.language:
            languages[e.language] += 1

    def safe(counter: Counter[str]) -> dict[str, int]:
        return {k: v for k, v in counter.items() if v >= K_ANONYMITY_FLOOR} if len(readers) >= K_ANONYMITY_FLOOR else {}

    return {
        "window_days": days,
        "consent_subjects": subjects,
        "consent_rates": consent_rates,
        "gpc_signals": sum(1 for r in latest.values() if r.gpc),
        "readers": len(readers),
        "events": len(events),
        "page_views_by_day": dict(sorted(by_day.items())),
        "devices": safe(devices),
        "sources": safe(sources),
        "languages": safe(languages),
        "sections": safe(sections),
        "k_floor": K_ANONYMITY_FLOOR,
    }
