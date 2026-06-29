# auth.py
# JWT utilities, password hashing, and the user store (Postgres/SQLite via SQLAlchemy).
#
# Milestone 7: the user store now reads and writes the `users` table through an
# AsyncSession instead of an in-memory dict. The store functions are async and
# take a session argument; the JWT/password helpers are unchanged.
#
# Token model:
#   Access token  — short-lived (15 min), sent as JSON, stored in JS memory
#   Refresh token — long-lived (7 days), sent as httpOnly cookie only
#   The two-token model means stolen access tokens expire quickly and the
#   refresh token is invisible to JavaScript (no XSS access).

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from chorus.config import settings
from chorus.db.models import User

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# User store — backed by the `users` table (db/models.py)
# ---------------------------------------------------------------------------

async def create_user(db: AsyncSession, email: str, password: str) -> User:
    """Create and persist a new user. Raises ValueError if the email exists."""
    email = email.lower().strip()
    existing = await get_user_by_email(db, email)
    if existing:
        raise ValueError("Email already registered.")
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        hashed_password=hash_password(password),
    )
    db.add(user)
    await db.flush()  # assign/validate row before the request-level commit
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email.lower().strip()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# JWT token creation / verification
# ---------------------------------------------------------------------------

def _make_token(payload: dict, expires_in: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload["iat"] = now
    payload["exp"] = now + expires_in
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_access_token(user_id: str, email: str) -> str:
    return _make_token(
        {"sub": user_id, "email": email, "type": "access"},
        timedelta(minutes=settings.token_expire_minutes),
    )


def create_refresh_token(user_id: str) -> str:
    return _make_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=settings.refresh_expire_days),
    )


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")


# ---------------------------------------------------------------------------
# FastAPI dependency — protects endpoints that require a logged-in user
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """
    Dependency injected into protected endpoints.
    Validates the Bearer access token and returns the decoded user payload.

    Usage:
        @router.get("/me")
        async def me(user: dict = Depends(get_current_user)):
            return user
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    payload = _decode(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type.")
    return {"user_id": payload["sub"], "email": payload["email"]}


def get_refresh_token_from_cookie(request: Request) -> str:
    """Extracts the refresh token from the httpOnly cookie set at login."""
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token.")
    return token
