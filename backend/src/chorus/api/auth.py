# api/auth.py
# Authentication endpoints.
#
#   POST /auth/register  — create account, receive tokens
#   POST /auth/login     — sign in, receive tokens
#   POST /auth/refresh   — exchange refresh cookie for a new access token
#   GET  /auth/me        — return current user info (access token required)
#
# Token delivery:
#   access_token  → JSON response body (frontend stores in Zustand memory)
#   refresh_token → httpOnly cookie (invisible to JavaScript — XSS protection)
#
# The httpOnly cookie is set with SameSite=Lax so it is sent on same-origin
# navigations but not on cross-site requests (CSRF protection).

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from chorus.auth import (
    create_access_token,
    create_refresh_token,
    create_user,
    get_current_user,
    get_refresh_token_from_cookie,
    get_user_by_email,
    get_user_by_id,
    verify_password,
    _decode,
)
from chorus.config import settings
from chorus.db.database import get_db
from chorus.schemas import TokenResponse, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

# How long the refresh cookie lives in the browser (seconds).
_REFRESH_COOKIE_MAX_AGE = settings.refresh_expire_days * 24 * 60 * 60


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Attaches the refresh token as an httpOnly, SameSite=Lax cookie."""
    response.set_cookie(
        key="refresh_token",
        value=token,
        max_age=_REFRESH_COOKIE_MAX_AGE,
        httponly=True,      # not accessible via JavaScript
        samesite="lax",     # sent on same-origin navigations, not cross-site POSTs
        secure=False,       # set to True in production (HTTPS only)
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Create a new account.

    - Validates that the email isn't already taken.
    - Hashes the password with bcrypt before storing it.
    - Returns an access token immediately so the user is logged in right away.
    - Sets a refresh token in an httpOnly cookie.
    """
    try:
        user = await create_user(db, body.email, body.password, body.first_name, body.last_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Sign in with email and password.

    Returns a generic error if either the email or password is wrong —
    never reveal which one failed (prevents user enumeration).
    """
    user = await get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    raw_token: str = Depends(get_refresh_token_from_cookie),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Exchange a valid refresh cookie for a new access token.

    Called by the frontend on page load when the access token is gone from
    memory (e.g. after a browser refresh). If the cookie is valid, the user
    gets a fresh access token without needing to log in again.
    """
    payload = _decode(raw_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Wrong token type.")

    user_id = payload["sub"]

    # Look up user to confirm account still exists.
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    new_access = create_access_token(user.id, user.email)
    new_refresh = create_refresh_token(user.id)
    _set_refresh_cookie(response, new_refresh)

    return TokenResponse(access_token=new_access)

@router.get("/me", response_model=UserOut)
async def me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Return the currently authenticated user's public info (fresh from DB)."""
    user = await get_user_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return UserOut(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
    )


@router.post("/logout")
async def logout(response: Response) -> dict:
    """Clear the refresh token cookie."""
    response.delete_cookie("refresh_token")
    return {"ok": True}
