"""Runtime configuration. Every value can be set through environment variables prefixed with NEWS_."""
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = API_ROOT / "data"
MEDIA_DIR = API_ROOT / "media"

_DEV_ONLY_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEWS_", env_file=".env", extra="ignore")

    app_env: str = Field(default="development", validation_alias="APP_ENV")
    database_url: str = f"sqlite:///{(DATA_DIR / 'news.db').as_posix()}"
    cors_origins: list[str] = []
    jwt_secret: str = Field(default=_DEV_ONLY_SECRET, validation_alias="JWT_SECRET")
    cookie_samesite: str = "lax"

    supabase_url: str = Field(default="", validation_alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", validation_alias="SUPABASE_ANON_KEY")

    # Shared secret the Newsroom uses to publish into the reader feed.
    newsroom_api_key: str = Field(default="", validation_alias="NEWSROOM_API_KEY")

    # AI providers. Add a key and the matching features switch on. Nothing is called without one.
    ai_provider: str = Field(default="", validation_alias="AI_PROVIDER")
    groq_api_key: str = Field(default="", validation_alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", validation_alias="GROQ_MODEL")
    nvidia_api_key: str = Field(default="", validation_alias="NVIDIA_API_KEY")
    nvidia_model: str = Field(default="meta/llama-3.3-70b-instruct", validation_alias="NVIDIA_MODEL")
    openai_compatible_base_url: str = Field(default="", validation_alias="AI_BASE_URL")
    openai_compatible_api_key: str = Field(default="", validation_alias="AI_API_KEY")
    openai_compatible_model: str = Field(default="", validation_alias="AI_MODEL")

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
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)

    def validate_for_runtime(self) -> None:
        if self.is_production and self.jwt_secret == _DEV_ONLY_SECRET:
            raise RuntimeError("JWT_SECRET must be set in production. Refusing to start with the development secret.")
        if self.is_production and not self.newsroom_api_key:
            raise RuntimeError("NEWSROOM_API_KEY must be set in production so only the Newsroom can publish.")


@lru_cache
def get_settings() -> Settings:
    return Settings()
