import time
from types import SimpleNamespace

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from app import neon_auth
from app.main import app
from app.routers import auth as auth_router
from app.security import create_access_token, settings

AUTH_URL = "https://ep-test.neonauth.example.neon.tech/neondb/auth"
ISSUER = "https://ep-test.neonauth.example.neon.tech"

client = TestClient(app)
_key = Ed25519PrivateKey.generate()


@pytest.fixture(autouse=True, scope="module")
def _lifespan():
    with TestClient(app):
        yield


@pytest.fixture
def neon_on(monkeypatch):
    monkeypatch.setattr(settings, "neon_auth_url", AUTH_URL)
    jwks_url = settings.neon_jwks_url
    fake = SimpleNamespace(get_signing_key_from_jwt=lambda token: SimpleNamespace(key=_key.public_key()))
    monkeypatch.setitem(neon_auth._clients, jwks_url, fake)
    assert auth_router.settings is settings


def token(**overrides) -> str:
    claims = {"sub": "neon-user-1", "email": "Reader@Example.com", "name": "Asha Verma", "iss": ISSUER, "exp": int(time.time()) + 600}
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return pyjwt.encode(claims, _key, algorithm="EdDSA", headers={"kid": "test"})


def bearer(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


def test_urls_come_from_the_auth_url(neon_on):
    assert settings.neon_jwks_url == f"{AUTH_URL}/.well-known/jwks.json"
    assert settings.neon_issuer == ISSUER


def test_config_reports_neon_flag(neon_on):
    assert client.get("/api/auth/config").json()["neon"] is True


def test_valid_neon_token_signs_in_and_maps_the_user(neon_on):
    me = client.get("/api/auth/me", headers=bearer(token()))
    assert me.status_code == 200
    assert me.json() == {"id": "neon-user-1", "email": "reader@example.com", "display_name": "Asha Verma"}
    session = client.get("/api/auth/session", headers=bearer(token())).json()
    assert session["authenticated"] is True and session["user"]["id"] == "neon-user-1"


def test_expired_token_is_rejected(neon_on):
    t = token(exp=int(time.time()) - 60)
    assert client.get("/api/auth/me", headers=bearer(t)).status_code == 401
    assert client.get("/api/auth/session", headers=bearer(t)).json()["authenticated"] is False


def test_wrong_issuer_is_rejected(neon_on):
    assert client.get("/api/auth/me", headers=bearer(token(iss="https://evil.example"))).status_code == 401


def test_missing_subject_or_expiry_is_rejected(neon_on):
    assert client.get("/api/auth/me", headers=bearer(token(sub=None))).status_code == 401
    assert client.get("/api/auth/me", headers=bearer(token(exp=None))).status_code == 401


def test_token_signed_with_another_key_is_rejected(neon_on):
    other = pyjwt.encode({"sub": "x", "iss": ISSUER, "exp": int(time.time()) + 600}, Ed25519PrivateKey.generate(), algorithm="EdDSA")
    assert client.get("/api/auth/me", headers=bearer(other)).status_code == 401


def test_hs256_token_with_the_neon_issuer_is_not_accepted(neon_on):
    forged = pyjwt.encode({"sub": "x", "iss": ISSUER, "exp": int(time.time()) + 600}, settings.jwt_secret, algorithm="HS256")
    assert client.get("/api/auth/me", headers=bearer(forged)).status_code == 401


def test_neon_token_is_not_a_staff_token(neon_on):
    assert client.get("/api/staff-auth/session", headers=bearer(token())).status_code == 401


def test_neon_off_ignores_neon_tokens(monkeypatch):
    monkeypatch.setattr(settings, "neon_auth_url", "")
    assert client.get("/api/auth/me", headers=bearer(token())).status_code == 401
    assert client.get("/api/auth/config").json()["neon"] is False


def test_local_login_still_works_with_neon_on(neon_on):
    assert client.get("/api/auth/me", headers=bearer(create_access_token("someone-local"))).status_code == 401  # unknown local user
    signup = client.post("/api/auth/signup", json={"email": "local.reader@example.com", "password": "long-enough-pw", "display_name": "Local"})
    assert signup.status_code in (200, 201)
    assert client.get("/api/auth/me").json()["email"] == "local.reader@example.com"


def test_stale_local_cookie_does_not_hide_a_fresh_neon_token(neon_on):
    c = TestClient(app)
    c.cookies.set("news_access", "stale-garbage")
    assert c.get("/api/auth/me", headers=bearer(token())).status_code == 200
