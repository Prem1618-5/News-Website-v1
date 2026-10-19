import os
import tempfile
from pathlib import Path

# Demo staff are seeded only outside production, and an unset APP_ENV now means production.
os.environ.setdefault("APP_ENV", "development")
# Every test run gets its own empty database; stories come from the real content folder on startup.
_tmp = Path(tempfile.mkdtemp(prefix="news-api-tests-"))
os.environ["NEWS_DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ.pop("DATABASE_URL", None)
os.environ["NEWS_MEDIA_DIR"] = (_tmp / "media").as_posix()
