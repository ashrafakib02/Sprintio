from __future__ import annotations

import datetime as dt

import jwt
import pytest
from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import (
    Encoding,
    NoEncryption,
    PrivateFormat,
    PublicFormat,
)

from app.main import app

# ── Key pair shared across all tests ───────────────────────────

_PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())
_PUBLIC_KEY = _PRIVATE_KEY.public_key()

_PRIVATE_PEM: str = _PRIVATE_KEY.private_bytes(
    encoding=Encoding.PEM,
    format=PrivateFormat.PKCS8,
    encryption_algorithm=NoEncryption(),
).decode()

_PUBLIC_PEM: str = _PUBLIC_KEY.public_bytes(
    encoding=Encoding.PEM,
    format=PublicFormat.SubjectPublicKeyInfo,
).decode()


@pytest.fixture(autouse=True)
def _patch_jwt_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Point the security module at the test public key."""
    monkeypatch.setenv("JWT_ACCESS_PUBLIC_KEY", _PUBLIC_PEM)


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def make_access_token(
    payload: dict[str, object] | None = None,
    *,
    expired: bool = False,
    private_key: str = _PRIVATE_PEM,
) -> str:
    """Create a signed ES256 JWT for testing."""
    now = dt.datetime.now(dt.timezone.utc)
    claims: dict[str, object] = {
        "userId": "test-user-id",
        "email": "test@example.com",
        "role": "member",
        "jti": "test-jti",
        "deviceId": "test-device",
        "iat": int(now.timestamp()),
        "exp": int((now - dt.timedelta(hours=1)).timestamp()) if expired else int(
            (now + dt.timedelta(minutes=15)).timestamp()
        ),
    }
    if payload:
        claims.update(payload)

    return jwt.encode(claims, private_key, algorithm="ES256")
