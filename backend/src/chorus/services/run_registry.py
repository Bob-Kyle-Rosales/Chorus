# run_registry.py
# Tracks which run_ids are authorized to open the pipeline WebSocket, and for
# which user and how much they paid — so a run that never delivers a report
# can be refunded (see credits.py:refund and SECURITY.md T13).
#
# Why this exists:
#   WS /ws/{run_id} is where the actual Groq + Tavily calls happen. Every REST
#   endpoint correctly checks auth and credits before that point, but nothing
#   tied those checks to the WebSocket itself — a run_id, once known, could be
#   used to open the socket directly. A run_id becomes "authorized" only at
#   the exact moment its cost has actually been paid for:
#     - POST /sessions creates the session (5 credits) — session.id is the run_id.
#     - POST /credits/deduct for a follow-up pipeline (5 credits) — the run_id
#       returned earlier by POST /sessions/{id}/followup.
#   The WebSocket handler consumes (single-use) the authorization for its
#   run_id and rejects the connection if none exists for that user.
#
# Why in-memory, not a DB table:
#   Authorization is only ever needed for the few seconds between "credits
#   were just deducted" and "the frontend opens the socket." A short TTL plus
#   pruning on every read keeps this from growing unbounded even if a client
#   never connects (the same failure mode flagged for the preview dict in
#   sessions.py) — nothing here needs to survive a server restart.

import time
from dataclasses import dataclass

_TTL_SECONDS = 300  # plenty of time for the frontend to open the socket

# run_id -> (user_id, amount, expires_at)
_authorized: dict[str, tuple[str, int, float]] = {}


@dataclass(frozen=True)
class RunAuthorization:
    user_id: str
    amount: int  # credits charged for this run — what to refund if it fails


def authorize(run_id: str, user_id: str, amount: int) -> None:
    """Marks run_id as paid-for (amount credits) and runnable by user_id, for a short window."""
    _authorized[run_id] = (user_id, amount, time.monotonic() + _TTL_SECONDS)


def consume(run_id: str, user_id: str) -> RunAuthorization | None:
    """
    Single-use check: returns the authorization if run_id was authorized for
    user_id and hasn't expired, else None. Removes the entry either way so
    it can't be reused.
    """
    _prune_expired()
    entry = _authorized.pop(run_id, None)
    if entry is None:
        return None
    owner_id, amount, expires_at = entry
    if owner_id != user_id or time.monotonic() >= expires_at:
        return None
    return RunAuthorization(user_id=owner_id, amount=amount)


def _prune_expired() -> None:
    now = time.monotonic()
    expired = [rid for rid, (_, _, expires_at) in _authorized.items() if expires_at < now]
    for rid in expired:
        _authorized.pop(rid, None)
