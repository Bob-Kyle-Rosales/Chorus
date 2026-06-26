# Backend Dockerfile
# Builds a production-ready container for the Chorus FastAPI server.
#
# Build stages:
#   Stage 1 (builder) — installs dependencies using uv
#   Stage 2 (runner)  — copies only what's needed to run the app
#
# Why two stages?
#   The builder stage needs uv and build tools. The final image only needs
#   the installed packages and the source code. Keeping them separate
#   produces a smaller, cleaner production image.

# ---------------------------------------------------------------------------
# Stage 1: builder — install dependencies
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

# Install uv — the fast Python package manager used by this project.
# We pin it via pip to ensure reproducible builds.
RUN pip install uv

# Copy dependency files first (before source code).
# Docker caches each layer — if pyproject.toml and uv.lock haven't changed,
# Docker reuses the cached layer and skips re-installing packages.
# This makes rebuilds much faster during development.
# README.md is referenced in pyproject.toml — hatchling requires it to exist
COPY pyproject.toml uv.lock* README.md ./

# Install all dependencies into the project's .venv.
# --frozen: use exact versions from uv.lock (no upgrades)
# --no-dev: skip dev dependencies (pytest, etc.) in production
RUN uv sync --frozen --no-dev

# ---------------------------------------------------------------------------
# Stage 2: runner — minimal production image
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runner

WORKDIR /app

# Copy the installed virtual environment from the builder stage.
# This includes all the installed packages (fastapi, langgraph, etc.)
# without needing uv itself in the final image.
COPY --from=builder /app/.venv /app/.venv

# Copy the application source code.
COPY src/ ./src/
COPY pyproject.toml ./

# Add the .venv's bin directory to PATH so Python and all commands
# (uvicorn, etc.) can be found without activating the venv manually.
ENV PATH="/app/.venv/bin:$PATH"

# Tell Python where to find the chorus package (src layout).
ENV PYTHONPATH="/app/src"

# The port uvicorn will listen on inside the container.
# docker-compose maps this to port 8000 on the host.
EXPOSE 8000

# Start the FastAPI server.
# --host 0.0.0.0: listen on all interfaces (required in containers —
#   127.0.0.1 would only be reachable from inside the container itself)
# --port 8000: match the EXPOSE above
CMD ["uvicorn", "chorus.main:app", "--host", "0.0.0.0", "--port", "8000"]
