"""Newsroom staff sign-in and sign-up. Stateless bearer tokens, separate from reader accounts."""
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Request
from jose import jwt
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..config import get_settings
from ..database import DB
from ..models import StaffAccount
from ..ratelimit import Limiter, client_ip
from ..schemas import StaffLogin, StaffSignup
from ..security import STAFF_AUDIENCE, ALGORITHM, bearer, hash_password, staff_from_token, verify_password

router = APIRouter(prefix="/api/staff-auth", tags=["staff-auth"])
settings = get_settings()
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
DEMO_PASSWORD = "Newsroom#2026"
DEMO_STAFF = [
    ("jane", "Jane Black", "admin", "Managing editor"),
    ("mary", "Mary Metcalfe", "editor", "Politics & World editor"),
    ("landon", "Landon Shepherd", "editor", "Business & Tech editor"),
    ("alice", "Alice Chen", "reporter", "Business reporter"),
    ("anthony", "Anthony Buteo", "reporter", "City hall reporter"),
]
_login_failures = Limiter(8)
_signups = Limiter(5, "Too many accounts created from this network. Try again in a few minutes.")


def _email_for(name: str) -> str:
    return f"{re.sub(r'[^a-z]+', '.', name.lower())}@newsapp.example"


def seed_demo_staff(db: Session) -> None:
    for staff_id, name, role, title in DEMO_STAFF:
        email = _email_for(name)
        if db.exec(select(StaffAccount).where(StaffAccount.staff_id == staff_id)).first():
            continue
        db.add(StaffAccount(
            id=str(uuid.uuid4()), staff_id=staff_id, email=email, password_hash=hash_password(DEMO_PASSWORD),
            display_name=name, role=role, job_title=title,
        ))
    db.commit()


def _public(a: StaffAccount) -> dict:
    return {"id": a.staff_id, "name": a.display_name, "email": a.email, "role": a.role, "jobTitle": a.job_title, "status": a.status}


def _token(a: StaffAccount) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=12)
    return jwt.encode({"sub": a.id, "aud": STAFF_AUDIENCE, "exp": exp}, settings.jwt_secret, algorithm=ALGORITHM)


def _session(a: StaffAccount) -> dict:
    return {"authenticated": True, "token": _token(a), "staff": _public(a)}


def _require_active(a: StaffAccount) -> None:
    if a.status == "pending":
        raise HTTPException(403, "Your account is awaiting approval from the managing editor.")
    if a.status != "active":
        raise HTTPException(403, "This account is suspended. Contact the managing editor.")


@router.get("/config")
def config():
    demo = not settings.is_production
    return {
        "demo_accounts": [
            {"email": _email_for(n), "role": r, "name": n, "password": DEMO_PASSWORD} for _, n, r, _t in DEMO_STAFF
        ] if demo else [],
        "signup_requires_approval": settings.is_production,
    }


@router.post("/login")
def login(body: StaffLogin, request: Request, db: DB):
    email = body.email
    key = f"{client_ip(request)}:{email}"
    _login_failures.check(key)
    account = db.exec(select(StaffAccount).where(StaffAccount.email == email)).first()
    if not account or not verify_password(body.password, account.password_hash):
        _login_failures.hit(key)
        raise HTTPException(401, "Email or password is incorrect.")
    _login_failures.reset(key)
    _require_active(account)
    return _session(account)


@router.post("/signup")
def signup(body: StaffSignup, request: Request, db: DB):
    email = body.email
    if not EMAIL.fullmatch(email):
        raise HTTPException(422, "Enter a valid email address.")
    key = f"signup:{client_ip(request)}"
    _signups.check(key)
    if db.exec(select(StaffAccount).where(StaffAccount.email == email)).first():
        raise HTTPException(409, "An account with this email already exists. Sign in instead.")
    pending = settings.is_production
    account = StaffAccount(
        id=str(uuid.uuid4()), staff_id=f"stf_{uuid.uuid4().hex[:8]}", email=email, password_hash=hash_password(body.password),
        display_name=body.display_name, role="reporter", job_title=body.job_title or "Reporter",
        status="pending" if pending else "active",
    )
    db.add(account)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists. Sign in instead.")
    _signups.hit(key)
    if pending:
        return {"authenticated": False, "pending": True, "message": "Request received. The managing editor will approve your account."}
    return _session(account)


@router.get("/session")
def session(db: DB, authorization: Annotated[str | None, Header()] = None):
    token = bearer(authorization)
    account = staff_from_token(db, token) if token else None
    if not account:
        raise HTTPException(401, "Your session has expired. Sign in again.")
    return {"authenticated": True, "staff": _public(account)}
