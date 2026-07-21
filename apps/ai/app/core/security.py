import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

security = HTTPBearer()

ALGORITHM = "ES256"


def _get_jwt_public_key() -> str:
    """Return the ES256 public key used to verify JWT tokens.

    In production this should be loaded from an environment variable or
    fetched from a JWKS endpoint.  For development we fall back to
    ``settings.jwt_access_public_key`` which can be an inline PEM string
    or a file path.
    """
    key: str = settings.jwt_access_public_key
    # If the value does not look like an inline PEM, treat it as a file path.
    if key and not key.startswith("-----"):
        from pathlib import Path

        key_path = Path(key)
        if key_path.is_file():
            return key_path.read_text()
    return key


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    """Verify a Bearer JWT signed with ES256 and return the user ID."""
    token: str = credentials.credentials

    try:
        payload: dict[str, str | None] = jwt.decode(
            token,
            _get_jwt_public_key(),
            algorithms=[ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # The Node.js backend puts the user ID in a custom ``userId`` claim.
    user_id: str | None = payload.get("userId")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing userId claim",
        )

    return user_id
