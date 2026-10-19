import os

# Demo staff are seeded only outside production, and an unset APP_ENV now means production.
os.environ.setdefault("APP_ENV", "development")
