"""People in the newsroom: adding reporters and editors, invites, approvals, trust and suspension.

Admins add editors, reporters and other admins; editors add reporters, who then report to them. A new
person gets an invite link (emailed when Resend is set up, and always returned so it can be shared on
WhatsApp); opening it lets them choose a password and the account becomes active.
"""
from __future__ import annotations

import re
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from ..config import get_settings
from ..database import DB
from ..models import StaffAccount
from ..schemas import EmailText, NameText
from ..security import CurrentStaff, hash_password
from ..services import desk, email, tokens
from ..taxonomy import STATE_CODES, is_district
from .desk import staff_public

router = APIRouter(prefix="/api/desk/team", tags=["newsroom team"])
settings = get_settings()
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
Role = Literal["reporter", "editor", "admin"]


class NewPerson(BaseModel):
    name: NameText
    email: EmailText
    role: Role = "reporter"
    job_title: str = Field(default="", max_length=80)
    reports_to: str = Field(default="", max_length=60)
    home_state: str = Field(default="", max_length=4)
    home_district: str = Field(default="", max_length=40)
    trusted: bool = False


class PersonPatch(BaseModel):
    name: NameText | None = None
    job_title: str | None = Field(default=None, max_length=80)
    role: Role | None = None
    reports_to: str | None = Field(default=None, max_length=60)
    trusted: bool | None = None
    status: Literal["active", "suspended"] | None = None
    home_state: str | None = Field(default=None, max_length=4)
    home_district: str | None = Field(default=None, max_length=40)


def _visible(actor: StaffAccount, person: StaffAccount) -> dict:
    """Admins see everything; editors see contact details of their own reporters only."""
    full = actor.role == "admin" or actor.staff_id == person.staff_id or desk.can_manage(actor, person)
    out = staff_public(person, full=full)
    out["canManage"] = desk.can_manage(actor, person)
    return out


def _check_place(state: str, district: str) -> None:
    if state and state not in STATE_CODES:
        raise HTTPException(422, "Unknown state.")
    if district and not is_district(state, district):
        raise HTTPException(422, "Choose a district in the chosen state.")


def _editor(db: DB, staff_id: str) -> StaffAccount:
    editor = desk.staff_by_id(db, staff_id)
    if not editor or editor.role not in ("editor", "admin") or editor.status != "active":
        raise HTTPException(422, "Choose an active editor.")
    return editor


def _invite(db: DB, actor: StaffAccount, person: StaffAccount) -> dict:
    raw = tokens.issue(db, "staff", person.id, "invite", tokens.INVITE_HOURS)
    link = f"{settings.newsroom_url.rstrip('/')}/join?token={raw}"
    sent = email.send(
        person.email,
        "You're invited to the News APP Newsroom",
        f"{actor.display_name} added you to the newsroom",
        [f"You can now write and publish stories as {person.role}.", "Open the link to choose your password. It works for 3 days."],
        "Set up my account",
        link,
    )
    return {"invite_link": link, "emailed": sent}


@router.get("")
def team(db: DB, actor: CurrentStaff):
    rows = db.exec(select(StaffAccount).order_by(StaffAccount.display_name)).all()
    if actor.role == "reporter":
        # Reporters only need their editor and themselves.
        rows = [r for r in rows if r.staff_id in (actor.staff_id, actor.reports_to)]
    elif actor.role == "editor":
        rows = [r for r in rows if r.status != "pending"]
    return [_visible(actor, r) for r in rows]


@router.post("", status_code=201)
def add_person(body: NewPerson, db: DB, actor: CurrentStaff):
    desk.require(desk.can_create(actor, body.role), "You cannot add someone with this role.")
    if not EMAIL.fullmatch(body.email):
        raise HTTPException(422, "Enter a valid email address.")
    if db.exec(select(StaffAccount).where(StaffAccount.email == body.email)).first():
        raise HTTPException(409, "Someone with this email is already in the newsroom.")
    _check_place(body.home_state, body.home_district)
    reports_to = ""
    if body.role == "reporter":
        reports_to = actor.staff_id if actor.role == "editor" else body.reports_to
        if reports_to:
            _editor(db, reports_to)
    person = StaffAccount(
        id=str(uuid.uuid4()), staff_id=f"stf_{uuid.uuid4().hex[:8]}", email=body.email,
        # Unusable until the invite is accepted: nobody knows a random password's bcrypt preimage.
        password_hash=hash_password(uuid.uuid4().hex + uuid.uuid4().hex),
        display_name=body.name, role=body.role, job_title=body.job_title.strip() or body.role.capitalize(),
        status="invited", reports_to=reports_to, trusted=body.trusted and body.role == "reporter",
        home_state=body.home_state or actor.home_state, home_district=body.home_district or (actor.home_district if not body.home_state else ""),
        created_by=actor.staff_id,
    )
    db.add(person)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Someone with this email is already in the newsroom.")
    return {"person": _visible(actor, person), **_invite(db, actor, person)}


@router.patch("/{staff_id}")
def update_person(staff_id: str, body: PersonPatch, db: DB, actor: CurrentStaff):
    person = desk.staff_by_id(db, staff_id)
    if not person:
        raise HTTPException(404, "Person not found.")
    desk.require(desk.can_manage(actor, person), "You cannot change this person.")
    admin = actor.role == "admin"
    if body.role is not None and body.role != person.role:
        desk.require(admin, "Only an admin can change roles.")
        if person.role == "admin" and _admins(db) <= 1:
            raise HTTPException(422, "The newsroom needs at least one admin.")
        person.role = body.role
        if body.role != "reporter":
            person.reports_to, person.trusted = "", False
    if body.reports_to is not None:
        desk.require(admin, "Only an admin can move reporters between editors.")
        if person.role != "reporter":
            raise HTTPException(422, "Only reporters report to an editor.")
        if body.reports_to:
            _editor(db, body.reports_to)
        person.reports_to = body.reports_to
    if body.trusted is not None:
        if person.role != "reporter":
            raise HTTPException(422, "Editors and admins always publish directly.")
        person.trusted = body.trusted
    if body.status is not None and body.status != person.status:
        if person.status in ("invited", "pending") and body.status == "active":
            raise HTTPException(422, "This person has to accept their invite first.")
        if body.status == "suspended" and person.role == "admin" and _admins(db) <= 1:
            raise HTTPException(422, "The newsroom needs at least one admin.")
        person.status = body.status
        person.token_version += 1  # signs them out everywhere
    if body.name is not None:
        desk.require(admin, "Only an admin can rename people.")
        person.display_name = body.name
    if body.job_title is not None:
        person.job_title = body.job_title.strip()
    if body.home_state is not None or body.home_district is not None:
        state = body.home_state if body.home_state is not None else person.home_state
        district = body.home_district if body.home_district is not None else (person.home_district if body.home_state is None else "")
        _check_place(state, district)
        person.home_state, person.home_district = state, district
    db.add(person)
    db.commit()
    return _visible(actor, person)


def _admins(db: DB) -> int:
    return len(db.exec(select(StaffAccount).where(StaffAccount.role == "admin", StaffAccount.status == "active")).all())


@router.post("/{staff_id}/invite")
def resend_invite(staff_id: str, db: DB, actor: CurrentStaff):
    person = desk.staff_by_id(db, staff_id)
    if not person:
        raise HTTPException(404, "Person not found.")
    desk.require(desk.can_manage(actor, person) or person.created_by == actor.staff_id, "You cannot invite this person.")
    if person.status != "invited":
        raise HTTPException(422, "This person has already joined.")
    return _invite(db, actor, person)


@router.post("/{staff_id}/reset-link")
def reset_link(staff_id: str, db: DB, actor: CurrentStaff):
    """A password-reset link for someone you manage, to share when they cannot reach their email."""
    person = desk.staff_by_id(db, staff_id)
    if not person:
        raise HTTPException(404, "Person not found.")
    desk.require(desk.can_manage(actor, person), "You cannot reset this person's password.")
    if person.status != "active":
        raise HTTPException(422, "Only active accounts can reset a password.")
    raw = tokens.issue(db, "staff", person.id, "reset", 24)
    return {"reset_link": f"{settings.newsroom_url.rstrip('/')}/reset?token={raw}"}


class Approval(BaseModel):
    role: Literal["reporter", "editor"] = "reporter"
    reports_to: str = Field(default="", max_length=60)


@router.post("/{staff_id}/approve")
def approve(staff_id: str, body: Approval, db: DB, actor: CurrentStaff):
    """Let in someone who asked to join from the sign-in page."""
    desk.require(actor.role == "admin", "Only an admin can approve new people.")
    person = desk.staff_by_id(db, staff_id)
    if not person or person.status != "pending":
        raise HTTPException(404, "No request from this person.")
    person.role = body.role
    person.reports_to = body.reports_to if body.role == "reporter" else ""
    if person.reports_to:
        _editor(db, person.reports_to)
    person.status = "active"
    db.add(person)
    db.commit()
    email.send(
        person.email, "Your Newsroom account is ready", "You're in",
        [f"{actor.display_name} approved your account. Sign in with the password you chose."],
        "Open the Newsroom", settings.newsroom_url,
    )
    return _visible(actor, person)


@router.delete("/{staff_id}")
def remove(staff_id: str, db: DB, actor: CurrentStaff):
    """Withdraw an invite or decline a request. People who have joined are suspended instead, so their
    stories keep a byline."""
    person = desk.staff_by_id(db, staff_id)
    if not person:
        raise HTTPException(404, "Person not found.")
    if person.status == "pending":
        desk.require(actor.role == "admin", "Only an admin can decline requests.")
    else:
        desk.require(desk.can_manage(actor, person), "You cannot remove this person.")
        if person.status != "invited":
            raise HTTPException(422, "Suspend people who have already joined.")
    db.delete(person)
    db.commit()
    return {"ok": True}
