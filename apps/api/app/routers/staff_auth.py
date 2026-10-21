"""Newsroom staff accounts: sign-in, asking to join, invites, forgotten passwords. Separate from reader accounts.

Tokens are stateless bearer JWTs carrying the account's token_version, so a password reset, a suspension
or "sign out everywhere" ends every older session at once.
"""
import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..config import get_settings
from ..database import DB
from ..models import StaffAccount
from ..ratelimit import Limiter, client_ip
from ..schemas import EmailText, LoginPassword, NewPassword, StaffLogin, StaffSignup
from ..security import CurrentStaff, bearer, create_staff_token, hash_password, staff_from_token, verify_password
from ..services import desk, email, tokens

router = APIRouter(prefix="/api/staff-auth", tags=["staff-auth"])
settings = get_settings()
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
DEMO_PASSWORD = "Newsroom#2026"
# Local development only (never seeded in production): one of each role, already linked.
DEMO_STAFF = [
    ("rajiv", "Rajiv Ranjan Sinha", "admin", "Managing editor", ""),
    ("prabhat", "Prabhat Singh", "editor", "City editor", ""),
    ("sunita", "Sunita Mahto", "editor", "State desk editor", ""),
    ("ananya", "Ananya Kumari", "reporter", "City reporter", "prabhat"),
    ("mohit", "Mohit Oraon", "reporter", "Sports reporter", "prabhat"),
    ("shabnam", "Shabnam Ansari", "reporter", "Jamshedpur correspondent", "sunita"),
    ("deepak", "Deepak Munda", "reporter", "Dhanbad correspondent", "sunita"),
]
DEMO_HOME = {"shabnam": "east-singhbhum", "deepak": "dhanbad"}
_login_failures = Limiter(8)
_signups = Limiter(5, "Too many requests from this network. Try again in a few minutes.")
_forgot = Limiter(5, "Too many reset requests. Check your inbox, or try again in a few minutes.")


def _email_for(name: str) -> str:
    return f"{re.sub(r'[^a-z]+', '.', name.lower())}@newsapp.example"


def seed_demo_staff(db: Session) -> None:
    for staff_id, name, role, title, reports_to in DEMO_STAFF:
        if db.exec(select(StaffAccount).where(StaffAccount.staff_id == staff_id)).first():
            continue
        db.add(StaffAccount(
            id=str(uuid.uuid4()), staff_id=staff_id, email=_email_for(name), password_hash=hash_password(DEMO_PASSWORD),
            display_name=name, role=role, job_title=title, reports_to=reports_to, home_state="JH", home_district=DEMO_HOME.get(staff_id, "ranchi"),
        ))
    db.commit()


def seed_first_admin(db: Session) -> None:
    """Create the admin named in NEWSROOM_ADMIN_EMAIL / NEWSROOM_ADMIN_PASSWORD when the newsroom has none."""
    if not (settings.admin_email and settings.admin_password):
        return
    if db.exec(select(StaffAccount).where(StaffAccount.role == "admin")).first():
        return
    address = settings.admin_email.strip().lower()
    existing = db.exec(select(StaffAccount).where(StaffAccount.email == address)).first()
    if existing:
        existing.role, existing.status = "admin", "active"
        db.add(existing)
    else:
        db.add(StaffAccount(
            id=str(uuid.uuid4()), staff_id=f"stf_{uuid.uuid4().hex[:8]}", email=address,
            password_hash=hash_password(settings.admin_password), display_name=settings.admin_name, role="admin",
            job_title="Managing editor", home_state="JH", home_district="ranchi",
        ))
    db.commit()


def _public(a: StaffAccount) -> dict:
    from .desk import staff_public

    return staff_public(a)


def _session(db: Session, a: StaffAccount, remember: bool = True) -> dict:
    a.last_login_at = desk.now()
    db.add(a)
    db.commit()
    return {"authenticated": True, "token": create_staff_token(a, 24 * 30 if remember else 12), "staff": _public(a)}


def _require_active(a: StaffAccount) -> None:
    if a.status == "pending":
        raise HTTPException(403, "Your request to join is waiting for the managing editor.")
    if a.status == "invited":
        raise HTTPException(403, "Finish setting up your account from the invite link first. Ask for a new one if it expired.")
    if a.status != "active":
        raise HTTPException(403, "This account is suspended. Contact the managing editor.")


@router.get("/config")
def config():
    demo = not settings.is_production
    return {
        "demo_accounts": [
            {"email": _email_for(n), "role": r, "name": n, "password": DEMO_PASSWORD} for _, n, r, _t, _e in DEMO_STAFF
        ] if demo else [],
        "signup_requires_approval": True,
        "email_enabled": settings.email_enabled,
    }


@router.post("/login")
def login(body: StaffLogin, request: Request, db: DB):
    key = f"{client_ip(request)}:{body.email}"
    _login_failures.check(key)
    account = db.exec(select(StaffAccount).where(StaffAccount.email == body.email)).first()
    if not account or not verify_password(body.password, account.password_hash):
        _login_failures.hit(key)
        raise HTTPException(401, "Email or password is incorrect.")
    _login_failures.reset(key)
    _require_active(account)
    return _session(db, account, body.remember)


@router.post("/signup")
def signup(body: StaffSignup, request: Request, db: DB):
    """Ask to join. An admin approves the request; until then the account cannot sign in."""
    if not EMAIL.fullmatch(body.email):
        raise HTTPException(422, "Enter a valid email address.")
    key = f"signup:{client_ip(request)}"
    _signups.check(key)
    if db.exec(select(StaffAccount).where(StaffAccount.email == body.email)).first():
        raise HTTPException(409, "An account with this email already exists. Sign in instead.")
    account = StaffAccount(
        id=str(uuid.uuid4()), staff_id=f"stf_{uuid.uuid4().hex[:8]}", email=body.email, password_hash=hash_password(body.password),
        display_name=body.display_name, role="reporter", job_title=body.job_title or "Reporter", status="pending",
    )
    db.add(account)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists. Sign in instead.")
    _signups.hit(key)
    admins = db.exec(select(StaffAccount).where(StaffAccount.role == "admin", StaffAccount.status == "active")).all()
    desk.notify(db, list(admins), "request", f"{account.display_name} asked to join the newsroom.")
    db.commit()
    return {"authenticated": False, "pending": True, "message": "Request sent. You can sign in once the managing editor approves it."}


@router.get("/session")
def session(db: DB, authorization: Annotated[str | None, Header()] = None):
    token = bearer(authorization)
    account = staff_from_token(db, token) if token else None
    if not account:
        raise HTTPException(401, "Your session has expired. Sign in again.")
    return {"authenticated": True, "staff": _public(account)}


class Forgot(BaseModel):
    email: EmailText


class Reset(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: NewPassword


class ChangePassword(BaseModel):
    current: LoginPassword
    password: NewPassword


@router.post("/forgot")
def forgot(body: Forgot, request: Request, db: DB):
    """Email a reset link. The answer is the same whether or not the address is known."""
    key = f"forgot:{client_ip(request)}"
    _forgot.check(key)
    _forgot.hit(key)
    account = db.exec(select(StaffAccount).where(StaffAccount.email == body.email)).first()
    answer = {"sent": True, "message": "If that email belongs to a newsroom account, a reset link is on its way."}
    if not account or account.status not in ("active", "invited"):
        return answer
    if account.status == "invited":
        raw = tokens.issue(db, "staff", account.id, "invite", tokens.INVITE_HOURS)
        link = f"{settings.newsroom_url.rstrip('/')}/join?token={raw}"
        email.send(account.email, "Set up your Newsroom account", "Finish setting up your account",
                   ["You were invited but have not chosen a password yet."], "Choose my password", link)
    else:
        raw = tokens.issue(db, "staff", account.id, "reset", tokens.RESET_HOURS)
        link = f"{settings.newsroom_url.rstrip('/')}/reset?token={raw}"
        email.send(account.email, "Reset your Newsroom password", "Reset your password",
                   ["Someone asked to reset the password for this account. If it was not you, ignore this email.",
                    "The link works for one hour."], "Choose a new password", link)
    if not settings.is_production and not settings.email_enabled:
        answer["dev_link"] = link  # local development without email: show the link instead
    return answer


@router.get("/token")
def check_token(token: str, db: DB):
    """What a reset or invite link is for, so the page can greet the person before they choose a password."""
    row = tokens.peek(db, token, "staff")
    account = db.get(StaffAccount, row.subject_id) if row else None
    if not row or not account:
        raise HTTPException(410, "This link has expired or was already used. Ask for a new one.")
    return {"purpose": row.purpose, "name": account.display_name, "email": account.email, "role": account.role}


@router.post("/reset")
def reset(body: Reset, db: DB):
    """Choose a password from an invite or reset link, then sign straight in."""
    row = tokens.consume(db, body.token, "staff")
    account = db.get(StaffAccount, row.subject_id) if row else None
    if not row or not account:
        raise HTTPException(410, "This link has expired or was already used. Ask for a new one.")
    if account.status == "suspended":
        raise HTTPException(403, "This account is suspended. Contact the managing editor.")
    if row.purpose == "invite" and account.status == "invited":
        account.status = "active"
        if account.created_by:
            desk.notify(db, [account.created_by], "joined", f"{account.display_name} joined the newsroom.")
    account.password_hash = hash_password(body.password)
    account.token_version += 1
    db.add(account)
    db.commit()
    _require_active(account)
    return _session(db, account)


@router.post("/password")
def change_password(body: ChangePassword, db: DB, account: CurrentStaff):
    if not verify_password(body.current, account.password_hash):
        raise HTTPException(400, "Your current password is not right.")
    account.password_hash = hash_password(body.password)
    account.token_version += 1
    db.add(account)
    db.commit()
    return _session(db, account)


@router.post("/logout-all")
def logout_everywhere(db: DB, account: CurrentStaff):
    account.token_version += 1
    db.add(account)
    db.commit()
    return {"ok": True}
