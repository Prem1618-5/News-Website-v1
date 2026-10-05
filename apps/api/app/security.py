"""Sessions: Supabase Auth when configured, local accounts otherwise. Cookies are HttpOnly."""
import hmac
from datetime import datetime, timedelta, timezone
from typing import Annotated

import httpx
from fastapi import Cookie, Depends, Header, HTTPException, Response
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from .config import get_settings
from .database import get_db
from .models import LocalUser

settings = get_settings()
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, days: int = 7) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=days)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm=ALGORITHM)


def local_user_from_token(db: Session, token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.exec(select(LocalUser).where(LocalUser.id == user_id)).first()
    if not user:
        return None
    return {"id": user.id, "email": user.email, "user_metadata": {"display_name": user.display_name}}


async def supabase_request(method: str, path: str, *, body: dict | None = None, access_token: str | None = None) -> tuple[int, dict]:
    if not settings.supabase_enabled:
        raise HTTPException(503, "Account services are not configured yet.")
    headers = {"apikey": settings.supabase_anon_key, "Content-Type": "application/json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.request(method, f"{settings.supabase_url.rstrip('/')}{path}", headers=headers, json=body)
    except httpx.RequestError:
        raise HTTPException(503, "Could not reach the account provider. Try again shortly.")
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    return response.status_code, payload if isinstance(payload, dict) else {}


def provider_error(status: int, payload: dict) -> HTTPException:
    if status == 401:
        return HTTPException(401, "Email or password is incorrect, or the session has expired.")
    if status == 429:
        return HTTPException(429, "Too many attempts. Wait a moment and try again.")
    message = payload.get("msg") or payload.get("message") or payload.get("error_description")
    if status in (400, 422) and message:
        return HTTPException(400, str(message)[:240])
    return HTTPException(502, "The account provider could not complete this request.")


def bearer(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


async def current_user(
    authorization: Annotated[str | None, Header()] = None,
    access_cookie: Annotated[str | None, Cookie(alias="news_access")] = None,
    db: Session = Depends(get_db),
) -> dict:
    token = access_cookie or bearer(authorization)
    if not token:
        raise HTTPException(401, "Sign in to continue.")
    local = local_user_from_token(db, token)
    if local:
        return local
    if not settings.supabase_enabled:
        raise HTTPException(401, "Your session has expired. Sign in again.")
    status, user = await supabase_request("GET", "/auth/v1/user", access_token=token)
    if status != 200 or not user.get("id"):
        if status >= 500:
            raise HTTPException(503, "Could not verify the account session.")
        raise HTTPException(401, "Your session has expired. Sign in again.")
    return user


async def optional_user(
    authorization: Annotated[str | None, Header()] = None,
    access_cookie: Annotated[str | None, Cookie(alias="news_access")] = None,
    db: Session = Depends(get_db),
) -> dict | None:
    try:
        return await current_user(authorization, access_cookie, db)
    except HTTPException:
        return None


CurrentUser = Annotated[dict, Depends(current_user)]
OptionalUser = Annotated[dict | None, Depends(optional_user)]


def _cookie_args() -> dict:
    samesite = settings.cookie_samesite.lower()
    secure = settings.is_production or samesite == "none"
    return {"httponly": True, "secure": secure, "samesite": samesite}


def set_auth_cookies(response: Response, payload: dict) -> None:
    session = payload.get("session") if isinstance(payload.get("session"), dict) else payload
    access_token = session.get("access_token")
    refresh_token = session.get("refresh_token")
    if not access_token or not refresh_token:
        return
    args = _cookie_args()
    response.set_cookie("news_access", str(access_token), path="/", max_age=max(60, int(session.get("expires_in", 3600))), **args)
    response.set_cookie("news_refresh", str(refresh_token), path="/api/auth", max_age=60 * 60 * 24 * 30, **args)


def clear_auth_cookies(response: Response) -> None:
    args = _cookie_args()
    response.delete_cookie("news_access", path="/", **args)
    response.delete_cookie("news_refresh", path="/api/auth", **args)


STAFF_AUDIENCE = "newsroom-staff"


def staff_from_token(db: Session, token: str):
    """Return the active StaffAccount for a newsroom bearer token, else None."""
    from .models import StaffAccount
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM], audience=STAFF_AUDIENCE)
    except JWTError:
        return None
    subject = payload.get("sub")
    if not subject:
        return None
    account = db.get(StaffAccount, subject)
    return account if account and account.status == "active" else None


def require_newsroom(
    authorization: Annotated[str | None, Header()] = None,
    x_newsroom_key: Annotated[str | None, Header(alias="X-Newsroom-Key")] = None,
    db: Session = Depends(get_db),
) -> None:
    """Editors and admins signed in to the Newsroom, or the machine key, may publish."""
    if authorization and authorization.lower().startswith("bearer "):
        account = staff_from_token(db, authorization[7:])
        if account and account.role in ("editor", "admin"):
            return
        if account:
            raise HTTPException(403, "Your role cannot do this.")
    expected = settings.newsroom_api_key
    if not expected:
        if settings.is_production:
            raise HTTPException(503, "Publishing is not configured.")
        return
    if not x_newsroom_key or not hmac.compare_digest(x_newsroom_key, expected):
        raise HTTPException(403, "This key cannot publish.")


def require_staff(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> None:
    """Any active, signed-in Newsroom staff member (reporters included)."""
    account = staff_from_token(db, authorization[7:]) if authorization and authorization.lower().startswith("bearer ") else None
    if not account:
        raise HTTPException(401, "Sign in to the Newsroom to use this.")
