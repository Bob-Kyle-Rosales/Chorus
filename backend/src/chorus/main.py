# main.py
# The entry point for the Chorus FastAPI application.
#
# This file does three things:
#   1. Defines startup/shutdown logic (lifespan) — compiles the graph once,
#      creates the concurrency semaphore
#   2. Configures middleware (CORS) so the frontend can talk to this server
#   3. Registers routes and exposes a /health endpoint
#
# To start the server:
#   uv run uvicorn chorus.main:app --reload --port 8000

import asyncio                          # Python's built-in async library — used for the Semaphore
from contextlib import asynccontextmanager  # decorator that turns a generator into a context manager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # handles browser cross-origin requests

from chorus.config import Settings, settings  # centralized config (API keys, limits, allowed origins)
from chorus.api.routes import router
from chorus.api.auth import router as auth_router
from chorus.api.sessions import router as sessions_router
from chorus.api.credits import router as credits_router

log = structlog.get_logger()

# Compared against the live setting at every boot — read from the Settings
# field itself (not retyped here) so this can't quietly drift out of sync
# with config.py.
_DEFAULT_JWT_SECRET = Settings.model_fields["jwt_secret"].default


def _warn_on_insecure_defaults() -> None:
    """
    Logs a loud, impossible-to-miss warning for config that's fine for local
    dev but unsafe once this is reachable from the internet. Doesn't refuse
    to boot — there's no reliable "is this actually production" signal here,
    and a hard failure would break the zero-config local dev workflow this
    project is built around. Never silent, though: this runs on every boot.
    """
    if settings.jwt_secret == _DEFAULT_JWT_SECRET:
        log.warning(
            "INSECURE CONFIG: JWT_SECRET is still the default dev value — "
            "every access/refresh token is signed with a secret sitting in "
            "public source. Set a real JWT_SECRET before this is reachable "
            "from the internet."
        )
    if not settings.cookie_secure:
        log.warning(
            "INSECURE CONFIG: COOKIE_SECURE is not set — the refresh-token "
            "cookie will be sent over plain HTTP. Set COOKIE_SECURE=true "
            "once this is served over HTTPS."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifecycle hook — runs setup before the server accepts requests,
    and teardown when the server shuts down.

    Everything BEFORE yield  → startup logic (runs once when server boots)
    Everything AFTER yield   → shutdown logic (runs when server stops)

    Why we set things up here instead of at module level:
    - build_graph() is imported lazily (inside the function) so that tests
      that import `app` don't fail just because graph.py doesn't exist yet
    - The Semaphore must be created inside an async context
    """
    # Import lazily so the app can be imported without graph.py existing yet.
    # This matters during early development when tasks are done incrementally.
    from chorus.graph.graph import build_graph
    from chorus.db.database import engine, init_db

    _warn_on_insecure_defaults()

    # Create all database tables that don't yet exist (users, sessions,
    # messages, credits_ledger). Safe to run on every boot — it only creates
    # missing tables. Uses SQLite locally, Postgres in production (DATABASE_URL).
    await init_db()

    # Compile the LangGraph pipeline once and attach it to the app.
    # The compiled graph is stateless — it's safe to share across all concurrent runs.
    # Each run passes its own fresh GraphState, so there's no data leakage between users.
    app.state.graph = build_graph()

    # Create a semaphore that limits how many graph runs can happen simultaneously.
    # max_concurrent_runs = 4 means at most 4 users' runs execute at the same time.
    # The 5th user waits in a queue until one of the 4 finishes.
    # Without this, 50 users × 3 researchers = 150 simultaneous Groq API calls → rate limit crash.
    #
    # This lives in process memory — it caps concurrent Groq load for THIS
    # instance only. Running more than one instance/worker behind a load
    # balancer gives each its own independent semaphore, so the real
    # concurrent Groq load becomes (instances × max_concurrent_runs) with no
    # error telling you the limit stopped meaning what it says. Fine at one
    # instance; revisit before scaling horizontally.
    app.state.run_semaphore = asyncio.Semaphore(settings.max_concurrent_runs)

    yield  # server is now running and accepting requests

    # Shutdown: dispose the connection pool so the process exits cleanly.
    await engine.dispose()


# Create the FastAPI app instance and pass in the lifespan context manager.
app = FastAPI(title="Chorus API", version="0.1.0", lifespan=lifespan)

# CORS (Cross-Origin Resource Sharing) middleware.
# Browsers block requests from one origin (e.g. localhost:3000) to a different
# origin (localhost:8000) by default. This middleware tells the browser it's allowed.
# allow_origins: only the listed URLs can make requests (from settings.allowed_origins)
# allow_methods=["*"]: allow GET, POST, OPTIONS, etc.
# allow_headers=["*"]: allow any request headers
# allow_credentials=True: lets the browser send/receive cookies (the refresh_token
#   httpOnly cookie) on cross-origin requests. Required because api.ts fetches with
#   credentials: "include". Note: when this is True, allow_origins CANNOT be "*" —
#   it must be an explicit list, which settings.allowed_origins already is.
#
# IMPORTANT: CORSMiddleware does NOT protect WebSocket connections.
# WebSocket origin validation is handled separately in routes.py.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(credits_router)

@app.get("/health")
async def health() -> dict[str, str]:
    """
    Simple health check endpoint.
    Used by deployment platforms, Docker health checks, and the dev team
    to confirm the server is running and responsive.

    Returns: {"status": "ok"}
    """
    return {"status": "ok"}
