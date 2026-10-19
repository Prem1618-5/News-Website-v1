"""News APP Platform API: content, accounts, consent, events, publishing bridge and AI assistance.

Runs on its own. The Reader and the Newsroom are separate static apps that call it over HTTP and
keep working (from cache / local demo data) when it is unavailable.
"""
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from .config import get_settings

from .database import engine, init_db
from .routers import account, ai, auth, content, newsroom, privacy, staff_auth

settings = get_settings()
settings.validate_for_runtime()
STARTED_AT = time.time()


_bootstrapped = False


def bootstrap() -> None:
    """Create tables, sync sections and article packs, seed dev staff once per process. Safe to call more than once."""
    global _bootstrapped
    if _bootstrapped:
        return
    init_db()
    if not settings.is_production and not settings.supabase_enabled:
        try:
            with Session(engine) as db:
                staff_auth.seed_demo_staff(db)
        except IntegrityError:
            # Another cold-started instance seeded the shared database at the same moment.
            pass
    _bootstrapped = True


@asynccontextmanager
async def lifespan(_: FastAPI):
    bootstrap()
    yield


app = FastAPI(title="News APP Platform API", version="2.0.0", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(GZipMiddleware, minimum_size=1024)
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Legacy-Reader-Id", "X-Newsroom-Key", "X-Request-Id"],
    )


FIELD_LABELS = {"display_name": "Name", "email": "Email", "password": "Password", "job_title": "Job title"}


def _friendly(err: dict) -> str:
    field = str(err.get("loc", ["", ""])[-1])
    label = FIELD_LABELS.get(field, field.replace("_", " ").capitalize() or "This field")
    ctx = err.get("ctx") or {}
    kind = err.get("type", "")
    if kind == "string_too_short":
        n = ctx.get("min_length", 1)
        return f"{label} is required." if n <= 1 else f"{label} must be at least {n} characters."
    if kind == "string_too_long":
        return f"{label} must be {ctx.get('max_length')} characters or fewer."
    if kind == "missing":
        return f"{label} is required."
    return f"{label}: {err.get('msg', 'is not valid')}."


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    """Return one readable message plus per-field messages instead of Pydantic's raw error list."""
    fields: dict[str, str] = {}
    for err in exc.errors():
        loc = err.get("loc") or []
        key = str(loc[-1]) if loc and loc[0] == "body" and len(loc) > 1 else "_"
        fields.setdefault(key, _friendly(err))
    message = next(iter(fields.values()), "Check the form and try again.")
    return JSONResponse(status_code=422, content={"detail": message, "fields": fields})


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:16]
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    response.headers["Server-Timing"] = f"app;dur={(time.perf_counter() - started) * 1000:.1f}"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000"
    path = request.url.path
    if path.startswith(("/api/reader", "/api/account", "/api/auth", "/api/staff-auth", "/api/me")):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "platform-api", "uptime_s": round(time.time() - STARTED_AT)}


@app.get("/")
def index():
    return {"service": "News APP Platform API", "docs": "/api/docs", "health": "/api/health"}


for module in (auth, staff_auth, account, content, privacy, newsroom, ai):
    app.include_router(module.router)
