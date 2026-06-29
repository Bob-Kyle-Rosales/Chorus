# db/database.py
# SQLAlchemy 2.0 async engine, session factory, and FastAPI dependency.
#
# The engine is created once from settings.database_url and shared across the app.
# Each request gets its own AsyncSession via the get_db dependency, which is
# automatically committed on success and rolled back on exception.
#
# Dialect-agnostic:
#   Local dev  → sqlite+aiosqlite:///./chorus.db (no infrastructure needed)
#   Production → postgresql+asyncpg://... (set via DATABASE_URL env var)
# SQLAlchemy translates the same ORM models and queries to each dialect.

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from chorus.config import settings


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models (see db/models.py)."""
    pass


# create_async_engine builds the connection pool.
# echo=False keeps SQL out of the logs; flip to True to debug queries.
engine = create_async_engine(settings.database_url, echo=False, future=True)

# Session factory. expire_on_commit=False lets us keep using ORM objects
# after commit (e.g. reading model fields in the response) without a re-fetch.
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """
    Create all tables that don't yet exist. Called once at startup (lifespan).

    Import models here (not at module top) so that Base.metadata is populated
    with every table before create_all runs — avoids circular imports between
    database.py and models.py.

    For schema migrations in a real deployment, use Alembic instead of
    create_all. create_all is sufficient for this project's additive schema.
    """
    from chorus.db import models  # noqa: F401 — registers models on Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding a request-scoped AsyncSession.

    Commits if the request handler returns normally; rolls back if it raises.
    The session is always closed afterwards.

    Usage:
        @router.get("/x")
        async def handler(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
