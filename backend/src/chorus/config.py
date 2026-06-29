# config.py
# Centralizes all configuration for the Chorus backend.
#
# pydantic-settings reads values from environment variables and .env files
# automatically. You don't need to manually call os.getenv() anywhere —
# just import `settings` and access settings.groq_api_key, etc.
#
# Priority order (highest to lowest):
#   1. Real environment variables (set on the server / in CI)
#   2. Values in the .env file (local development)
#   3. Default values defined here (safe fallbacks)

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All runtime configuration for the Chorus API.

    BaseSettings automatically reads matching environment variables.
    For example, if GROQ_API_KEY=abc123 is set in the environment,
    settings.groq_api_key will be "abc123" without any extra code.

    SettingsConfigDict(env_file=".env") looks for .env relative to where
    uvicorn is launched from — backend/.env when running from backend/.
    extra="ignore" means unknown env vars are silently skipped
    instead of causing an error.
    """
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ------------------------------------------------------------------
    # API Keys (external services)
    # Default to empty string so the app starts without crashing even
    # if keys aren't set yet. Real calls will fail, but the server boots.
    # ------------------------------------------------------------------
    groq_api_key: str = ""       # Groq API — primary LLM inference (fast, cheap)
    tavily_api_key: str = ""     # Tavily — web search API designed for LLM agents
    together_api_key: str = ""   # Together AI — fallback LLM if Groq is unavailable
    langsmith_api_key: str = ""  # LangSmith — traces and debugs LangGraph runs
    langsmith_tracing: bool = False  # set to True to enable LangSmith trace logging

    # ------------------------------------------------------------------
    # Security & CORS
    # allowed_origins controls which frontend URLs are allowed to connect.
    # In production this should be your deployed frontend URL.
    # ------------------------------------------------------------------
    allowed_origins: list[str] = ["http://localhost:3000"]

    # ------------------------------------------------------------------
    # Concurrency controls (see SECURITY.md T4)
    # max_concurrent_runs: how many graph runs can execute at the same time.
    #   Each run fans out to 3 researcher agents, so 4 runs = 12 agent calls.
    #   Keeps us within Groq/Tavily rate limits.
    # run_timeout_seconds: maximum time a single run is allowed to take.
    #   If a run exceeds this, it's cancelled and the user gets an error.
    #   Prevents hung runs from holding their semaphore slot forever.
    # ------------------------------------------------------------------
    max_concurrent_runs: int = 4
    run_timeout_seconds: int = 120

    # ------------------------------------------------------------------
    # Authentication (JWT)
    # jwt_secret signs and verifies access + refresh tokens.
    # Change this in production — any string works, longer is more secure.
    # token_expire_minutes: short-lived access token (15 min is standard).
    # refresh_expire_days: long-lived refresh token stored in httpOnly cookie.
    # ------------------------------------------------------------------
    jwt_secret: str = "dev-secret-change-in-production-please"
    token_expire_minutes: int = 15
    refresh_expire_days: int = 7

    # ------------------------------------------------------------------
    # Credit system
    # daily_credits_limit: how many credits each user gets per calendar day (UTC).
    # Credits reset to this value at UTC midnight.
    # ------------------------------------------------------------------
    daily_credits_limit: int = 20

    # ------------------------------------------------------------------
    # Database (Milestone 7 — persistence)
    # SQLAlchemy async URL. Defaults to a local SQLite file so the app runs
    # with no infrastructure. In production set DATABASE_URL to Postgres, e.g.
    #   postgresql+asyncpg://user:pass@host:5432/chorus
    # SQLAlchemy abstracts the dialect — the same models/queries work on both.
    # ------------------------------------------------------------------
    database_url: str = "sqlite+aiosqlite:///./chorus.db"

    # ------------------------------------------------------------------
    # Fetch safety (see SECURITY.md T3)
    # Maximum bytes to read from a fetched web page.
    # Prevents a single huge page from consuming excessive memory.
    # ------------------------------------------------------------------
    max_fetch_bytes: int = 2_000_000  # 2MB


# Create a single shared instance that the rest of the app imports.
# All modules do: from chorus.config import settings
settings = Settings()
