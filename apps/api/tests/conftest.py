import os
import tempfile
from pathlib import Path

# Demo staff are seeded only outside production, and an unset APP_ENV now means production.
os.environ.setdefault("APP_ENV", "development")
# Every test run gets its own empty database; stories come from the real content folder on startup.
_tmp = Path(tempfile.mkdtemp(prefix="news-api-tests-"))
os.environ["NEWS_DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
# Blank (not just unset) so a developer's apps/api/.env can never point tests at a live database or paid AI.
for _name in ("DATABASE_URL", "GEMINI_API_KEY", "GROQ_API_KEY", "NVIDIA_API_KEY", "AI_API_KEY", "AI_BASE_URL", "AI_MODEL", "AI_PROVIDER", "NEON_AUTH_URL"):
    os.environ[_name] = ""
os.environ["NEWS_MEDIA_DIR"] = (_tmp / "media").as_posix()
