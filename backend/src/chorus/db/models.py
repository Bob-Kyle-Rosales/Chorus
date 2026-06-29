# SQLAlchemy ORM models — the persistent schema for Chorus.
#
# Four tables:
#   users          — accounts (email + bcrypt hash)
#   sessions       — one research thread per row (question, name, stored report)
#   messages       — conversation thread entries (user questions + chorus replies)
#   credits_ledger — per-user daily credit usage (one row per user per day)
#
# JSON columns (angles, report) use SQLAlchemy's portable JSON type, which maps
# to JSONB on Postgres and a TEXT-backed JSON on SQLite — same Python API.
#
# IDs are stored as strings (UUID hex) for portability across SQLite/Postgres
# without needing a dialect-specific UUID column type.

from datetime import datetime, timezone

from sqlalchemy import JSON, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from chorus.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(64), nullable=False)
    last_name: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)

    sessions: Mapped[list["ResearchSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class ResearchSession(Base):
    # "sessions" is the table name; the class is ResearchSession to avoid
    # colliding with SQLAlchemy's own Session class.
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)

    # Planner output, stored as JSON so the angle preview survives a restart.
    angles: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # The finished report (full Report JSON) — used for follow-up routing context
    # and to rehydrate the report when the user returns to the session.
    report: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Pre-joined finding text for deterministic follow-up keyword routing.
    findings_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    last_active: Mapped[datetime] = mapped_column(default=_utcnow)

    user: Mapped["User"] = relationship(back_populates="sessions")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)   # "user" | "chorus"
    type: Mapped[str] = mapped_column(String(16), nullable=False)   # "user" | "reasoning" | "pipeline"
    content: Mapped[str | None] = mapped_column(Text, nullable=True)   # text for user/reasoning
    report: Mapped[dict | None] = mapped_column(JSON, nullable=True)   # report for pipeline followups
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)

    session: Mapped["ResearchSession"] = relationship(back_populates="messages")


class CreditLedger(Base):
    __tablename__ = "credits_ledger"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False)  # "YYYY-MM-DD" (UTC)
    used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
