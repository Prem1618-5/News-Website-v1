import re
import uuid
from typing import Annotated

from fastapi import APIRouter, Cookie, Header, HTTPException, Request, Response
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from ..config import get_settings
from ..database import DB
from ..models import LocalUser
from ..ratelimit import Limiter, client_ip
from ..schemas import AuthCredentials, RefreshRequest, SignupRequest
from ..security import (
    CurrentUser, bearer, clear_auth_cookies, create_access_token, hash_password, local_user_from_token,
    provider_error, set_auth_cookies, supabase_request, verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()
EMAIL = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
_login_failures = Limiter(8)
_signups = Limiter(5, "Too many accounts created from this network. Try again in a few minutes.")


def _local_session(user: LocalUser, response: Response) -> dict:
    token = create_access_token(user.id)
    set_auth_cookies(response, {"access_token": token, "refresh_token": token, "expires_in": 604800})
    return {"authenticated": True, "user": {"id": user.id, "email": user.email, "user_metadata": {"display_name": user.display_name}}}


@router.get("/config")
def auth_config():
    return {"configured": True, "provider": "supabase" if settings.supabase_enabled else "local"}


@router.get("/session")
async def auth_session(
    response: Response,
    db: DB,
    access_cookie: Annotated[str | None, Cookie(alias="news_access")] = None,
    refresh_cookie: Annotated[str | None, Cookie(alias="news_refresh")] = None,
):
    if access_cookie:
        local = local_user_from_token(db, access_cookie)
        if local:
            return {"authenticated": True, "user": local}
    if not settings.supabase_enabled:
        return {"authenticated": False, "user": None}
    if access_cookie:
        status, user = await supabase_request("GET", "/auth/v1/user", access_token=access_cookie)
        if status == 200 and user.get("id"):
            return {"authenticated": True, "user": user}
    if refresh_cookie:
        status, payload = await supabase_request("POST", "/auth/v1/token?grant_type=refresh_token", body={"refresh_token": refresh_cookie})
        if status == 200 and payload.get("access_token"):
            set_auth_cookies(response, payload)
            return {"authenticated": True, "user": payload.get("user") or {}}
    return {"authenticated": False, "user": None}


@router.post("/signup")
async def signup(body: SignupRequest, request: Request, response: Response, db: DB):
    email = body.email
    if not EMAIL.fullmatch(email):
        raise HTTPException(422, "Enter a valid email address.")
    key = f"signup:{client_ip(request)}"
    _signups.check(key)
    if not settings.supabase_enabled:
        if db.exec(select(LocalUser).where(LocalUser.email == email)).first():
            raise HTTPException(409, "An account with this email already exists. Sign in instead.")
        user = LocalUser(id=str(uuid.uuid4()), email=email, password_hash=hash_password(body.password), display_name=body.display_name)
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "An account with this email already exists. Sign in instead.")
        db.refresh(user)
        _signups.hit(key)
        return {**_local_session(user, response), "confirmation_required": False}
    status, payload = await supabase_request(
        "POST", "/auth/v1/signup", body={"email": email, "password": body.password, "data": {"display_name": body.display_name}},
    )
    if status not in (200, 201):
        raise provider_error(status, payload)
    session = payload.get("session") if isinstance(payload.get("session"), dict) else payload
    authenticated = bool(session.get("access_token") and session.get("refresh_token"))
    if authenticated:
        set_auth_cookies(response, payload)
    return {"authenticated": authenticated, "confirmation_required": not authenticated, "user": payload.get("user") or session.get("user") or {}}


@router.post("/login")
async def login(body: AuthCredentials, request: Request, response: Response, db: DB):
    email = body.email
    if not EMAIL.fullmatch(email):
        raise HTTPException(422, "Enter a valid email address.")
    key = f"{client_ip(request)}:{email}"
    _login_failures.check(key)
    if not settings.supabase_enabled:
        user = db.exec(select(LocalUser).where(LocalUser.email == email)).first()
        if not user or not verify_password(body.password, user.password_hash):
            _login_failures.hit(key)
            raise HTTPException(401, "Email or password is incorrect.")
        _login_failures.reset(key)
        return _local_session(user, response)
    status, payload = await supabase_request("POST", "/auth/v1/token?grant_type=password", body={"email": email, "password": body.password})
    if status != 200:
        if status in (400, 401):
            _login_failures.hit(key)
        raise provider_error(status, payload)
    _login_failures.reset(key)
    set_auth_cookies(response, payload)
    return {"authenticated": True, "user": payload.get("user") or {}}


@router.post("/refresh")
async def refresh_session(
    response: Response,
    db: DB,
    refresh_cookie: Annotated[str | None, Cookie(alias="news_refresh")] = None,
    body: RefreshRequest | None = None,
):
    token = refresh_cookie or (body.refresh_token if body else None)
    if not token:
        raise HTTPException(401, "Your session has expired. Sign in again.")
    local = local_user_from_token(db, token)
    if local:
        return {"authenticated": True, "user": local}
    if not settings.supabase_enabled:
        clear_auth_cookies(response)
        raise HTTPException(401, "Your session has expired. Sign in again.")
    status, payload = await supabase_request("POST", "/auth/v1/token?grant_type=refresh_token", body={"refresh_token": token})
    if status != 200:
        clear_auth_cookies(response)
        raise provider_error(status, payload)
    set_auth_cookies(response, payload)
    return {"authenticated": True, "user": payload.get("user") or {}}


@router.post("/logout")
async def logout(
    response: Response,
    access_cookie: Annotated[str | None, Cookie(alias="news_access")] = None,
    authorization: Annotated[str | None, Header()] = None,
):
    token = access_cookie or bearer(authorization)
    try:
        if token and settings.supabase_enabled:
            await supabase_request("POST", "/auth/v1/logout", access_token=token)
    finally:
        clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
def auth_me(user: CurrentUser):
    return {
        "id": str(user["id"]),
        "email": str(user.get("email") or ""),
        "display_name": str((user.get("user_metadata") or {}).get("display_name") or ""),
    }
