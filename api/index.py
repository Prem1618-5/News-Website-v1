"""Vercel Python function entry for the Platform API (FastAPI, ASGI)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "apps" / "api"))

from app.main import app, bootstrap  # noqa: E402

# Serverless runtimes may not emit ASGI lifespan events; make sure tables and seeds exist on cold start.
bootstrap()

__all__ = ["app"]
