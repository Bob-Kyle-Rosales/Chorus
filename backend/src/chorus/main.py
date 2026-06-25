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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # handles browser cross-origin requests

from chorus.config import settings      # centralized config (API keys, limits, allowed origins)
from chorus.api.routes import router

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

    # Compile the LangGraph pipeline once and attach it to the app.
    # The compiled graph is stateless — it's safe to share across all concurrent runs.
    # Each run passes its own fresh GraphState, so there's no data leakage between users.
    app.state.graph = build_graph()

    # Create a semaphore that limits how many graph runs can happen simultaneously.
    # max_concurrent_runs = 4 means at most 4 users' runs execute at the same time.
    # The 5th user waits in a queue until one of the 4 finishes.
    # Without this, 50 users × 3 researchers = 150 simultaneous Groq API calls → rate limit crash.
    app.state.run_semaphore = asyncio.Semaphore(settings.max_concurrent_runs)

    yield  # server is now running and accepting requests

    # Shutdown logic would go here (e.g. close DB connections).
    # Nothing to clean up yet in Phase 1.


# Create the FastAPI app instance and pass in the lifespan context manager.
app = FastAPI(title="Chorus API", version="0.1.0", lifespan=lifespan)

# CORS (Cross-Origin Resource Sharing) middleware.
# Browsers block requests from one origin (e.g. localhost:3000) to a different
# origin (localhost:8000) by default. This middleware tells the browser it's allowed.
# allow_origins: only the listed URLs can make requests (from settings.allowed_origins)
# allow_methods=["*"]: allow GET, POST, OPTIONS, etc.
# allow_headers=["*"]: allow any request headers
#
# IMPORTANT: CORSMiddleware does NOT protect WebSocket connections.
# WebSocket origin validation is handled separately in routes.py.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
async def health() -> dict[str, str]:
    """
    Simple health check endpoint.
    Used by deployment platforms, Docker health checks, and the dev team
    to confirm the server is running and responsive.

    Returns: {"status": "ok"}
    """
    return {"status": "ok"}
