"""Runtime configuration. Every value can be set through environment variables prefixed with NEWS_."""
import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = API_ROOT / "data"
# Photos and clips. Point NEWS_MEDIA_DIR at a persistent volume in production (Railway: mount one at /srv/media).
MEDIA_DIR = Path(os.environ.get("NEWS_MEDIA_DIR") or API_ROOT / "media")

_DEV_ONLY_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEWS_", env_file=".env", extra="ignore")

    # Fail closed: an unset APP_ENV is production, so demo accounts and the dev secret never leak onto a public deploy.
    app_env: str = Field(default="production", validation_alias="APP_ENV")
    # Trust X-Forwarded-For only behind a proxy that sets it (Vercel/Render/Railway); otherwise clients could spoof it.
    trust_proxy: bool = Field(
        default_factory=lambda: any(os.environ.get(k) for k in ("VERCEL", "RENDER", "RAILWAY_ENVIRONMENT")),
        validation_alias="TRUST_PROXY",
    )
    database_url: str = f"sqlite:///{(DATA_DIR / 'news.db').as_posix()}"
    cors_origins: list[str] = []
    jwt_secret: str = Field(default=_DEV_ONLY_SECRET, validation_alias="JWT_SECRET")
    cookie_samesite: str = "lax"

    supabase_url: str = Field(default="", validation_alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", validation_alias="SUPABASE_ANON_KEY")

    # Static host deploy hook, called (debounced) after the Newsroom publishes so the prerendered Reader refreshes.
    deploy_hook_url: str = Field(default="", validation_alias="NEWS_DEPLOY_HOOK_URL")

    # Shared secret the Newsroom uses to publish into the reader feed.
    newsroom_api_key: str = Field(default="", validation_alias="NEWSROOM_API_KEY")

    # Public addresses, used to build links in emails (invites, password resets).
    reader_url: str = Field(default="http://localhost:3000", validation_alias="READER_URL")
    newsroom_url: str = Field(default="http://localhost:5174/newsroom", validation_alias="NEWSROOM_URL")

    # Email through Resend (https://resend.com). Without a key, links are logged instead of sent.
    resend_api_key: str = Field(default="", validation_alias="RESEND_API_KEY")
    email_from: str = Field(default="News APP <onboarding@resend.dev>", validation_alias="EMAIL_FROM")

    # First admin, created on start when no admin exists yet. Change the password after the first sign-in.
    admin_email: str = Field(default="", validation_alias="NEWSROOM_ADMIN_EMAIL")
    admin_password: str = Field(default="", validation_alias="NEWSROOM_ADMIN_PASSWORD")
    admin_name: str = Field(default="Managing editor", validation_alias="NEWSROOM_ADMIN_NAME")

    # AI providers. Add a key and the matching features switch on. Nothing is called without one.
    ai_provider: str = Field(default="", validation_alias="AI_PROVIDER")
    gemini_api_key: str = Field(default="", validation_alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-3.5-flash", validation_alias="GEMINI_MODEL")
    groq_api_key: str = Field(default="", validation_alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", validation_alias="GROQ_MODEL")
    nvidia_api_key: str = Field(default="", validation_alias="NVIDIA_API_KEY")
    nvidia_model: str = Field(default="meta/llama-3.3-70b-instruct", validation_alias="NVIDIA_MODEL")
    openai_compatible_base_url: str = Field(default="", validation_alias="AI_BASE_URL")
    openai_compatible_api_key: str = Field(default="", validation_alias="AI_API_KEY")
    openai_compatible_model: str = Field(default="", validation_alias="AI_MODEL")

    # Neon Auth (managed Better Auth): readers may sign in there as well as with the local login. Empty = off.
    neon_auth_url: str = Field(default="", validation_alias="NEON_AUTH_URL")
    neon_auth_jwks_url: str = Field(default="", validation_alias="NEON_AUTH_JWKS_URL")
    neon_auth_issuer: str = Field(default="", validation_alias="NEON_AUTH_ISSUER")

    # Set by Neon / Vercel Postgres integrations. Takes precedence over NEWS_DATABASE_URL's SQLite default.
    platform_database_url: str = Field(default="", validation_alias="DATABASE_URL")

    @property
    def resolved_database_url(self) -> str:
        url = self.platform_database_url or self.database_url
        # SQLAlchemy needs the driver named explicitly; psycopg (v3) is the one installed.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def email_enabled(self) -> bool:
        return bool(self.resend_api_key)

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)

    @property
    def neon_auth_enabled(self) -> bool:
        return bool(self.neon_auth_url)

    @property
    def neon_jwks_url(self) -> str:
        return self.neon_auth_jwks_url or f"{self.neon_auth_url.rstrip('/')}/.well-known/jwks.json"

    @property
    def neon_issuer(self) -> str:
        # Neon Auth (Better Auth) signs tokens with the origin of its own base URL as issuer.
        if self.neon_auth_issuer:
            return self.neon_auth_issuer
        parts = urlsplit(self.neon_auth_url)
        return f"{parts.scheme}://{parts.netloc}"

    def validate_for_runtime(self) -> None:
        if self.is_production and self.jwt_secret == _DEV_ONLY_SECRET:
            raise RuntimeError("JWT_SECRET must be set in production. Refusing to start with the development secret.")
        if self.is_production and not self.newsroom_api_key:
            raise RuntimeError("NEWSROOM_API_KEY must be set in production so only the Newsroom can publish.")


@lru_cache
def get_settings() -> Settings:
    return Settings()
