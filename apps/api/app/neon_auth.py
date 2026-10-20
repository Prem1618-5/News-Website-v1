"""Verify Neon Auth (managed Better Auth) tokens so readers can sign in there as well as with the local login.

Neon signs its JWTs with EdDSA (Ed25519), publishes the keys at `<auth url>/.well-known/jwks.json`, sets the
issuer to the origin of the auth URL and expires them after about 15 minutes. Staff and local reader tokens are
HS256, so a Neon token can never pass as one of those, and the algorithm is pinned here so the reverse is
impossible too.
"""
import asyncio

import jwt as pyjwt
from jwt import PyJWKClient, PyJWTError

from .config import Settings

_clients: dict[str, PyJWKClient] = {}


def _client(jwks_url: str) -> PyJWKClient:
    # One client per URL: it caches the keys for an hour and re-fetches when a token names an unknown key id.
    if jwks_url not in _clients:
        _clients[jwks_url] = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600, timeout=8)
    return _clients[jwks_url]


def looks_like_neon_token(token: str) -> bool:
    try:
        return pyjwt.get_unverified_header(token).get("alg") == "EdDSA"
    except PyJWTError:
        return False


def _verify(settings: Settings, token: str) -> dict | None:
    try:
        key = _client(settings.neon_jwks_url).get_signing_key_from_jwt(token)
        claims = pyjwt.decode(
            token,
            key.key,
            algorithms=["EdDSA"],
            issuer=settings.neon_issuer,
            options={"require": ["exp", "sub", "iss"]},
        )
    except PyJWTError:
        return None
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        return None
    email = claims.get("email")
    name = claims.get("name")
    return {
        "id": sub,
        "email": email.strip().lower() if isinstance(email, str) else "",
        "user_metadata": {"display_name": name.strip()[:120] if isinstance(name, str) else ""},
    }


async def user_from_token(settings: Settings, token: str) -> dict | None:
    """The same shape the other providers return, so every router keeps working unchanged."""
    if not settings.neon_auth_enabled:
        return None
    # Fetching the keys is a blocking network call the first time, so keep it off the event loop.
    return await asyncio.to_thread(_verify, settings, token)
