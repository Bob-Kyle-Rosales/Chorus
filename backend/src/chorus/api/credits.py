# api/credits.py
# Credit ledger endpoints — backed by the credits_ledger table (db/models.py).
#
# Credits are a daily allowance that throttles expensive pipeline runs.
# One row per user per UTC day; the row's `used` counter accumulates spend.
# A new UTC day means no row exists yet → the user has the full allowance.
#
# Credit costs:
#   Full pipeline run (original or follow-up)  →  5 credits
#   Reasoning follow-up (LLM over findings)    →  1 credit
#   Angle preview (planner only)               →  0 credits
#   Viewing past sessions                      →  0 credits
#
# Reset: daily at UTC midnight (lazy — a fresh day simply has no ledger row).
# Enforcement: spend() raises HTTP 402 if the user has insufficient credits.
# sessions.py imports spend() and calls it (passing its request db session)
# at each credit-costing action so the check + deduction share one transaction.

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from chorus.auth import get_current_user
from chorus.config import settings
from chorus.db.database import get_db
from chorus.db.models import CreditLedger
from chorus.schemas import CreditBalance, DeductRequest

router = APIRouter(prefix="/credits", tags=["credits"])


async def _get_today_row(db: AsyncSession, user_id: str) -> CreditLedger | None:
    today = date.today().isoformat()
    result = await db.execute(
        select(CreditLedger).where(
            CreditLedger.user_id == user_id,
            CreditLedger.date == today,
        )
    )
    return result.scalar_one_or_none()


async def get_balance(db: AsyncSession, user_id: str) -> int:
    """Return credits remaining today. A new UTC day has no row → full allowance."""
    row = await _get_today_row(db, user_id)
    used = row.used if row else 0
    return max(0, settings.daily_credits_limit - used)


async def spend(db: AsyncSession, user_id: str, amount: int) -> int:
    """
    Deduct `amount` credits for a user and return the new balance.
    Raises HTTP 402 if the user has insufficient credits.

    The INSERT/UPDATE is flushed but not committed here — the request-scoped
    get_db dependency commits on success or rolls back on any exception, so a
    later failure in the same request won't leave a partial deduction.
    """
    today = date.today().isoformat()
    row = await _get_today_row(db, user_id)

    used = row.used if row else 0
    balance = settings.daily_credits_limit - used
    if balance < amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Insufficient credits. You have {balance} ◉ remaining "
                f"but this action costs {amount} ◉. "
                f"Your balance resets at midnight UTC."
            ),
        )

    if row is None:
        row = CreditLedger(user_id=user_id, date=today, used=amount)
        db.add(row)
    else:
        row.used += amount
    await db.flush()

    return settings.daily_credits_limit - (used + amount)


def _next_midnight_utc() -> str:
    """ISO 8601 UTC timestamp of the next UTC midnight."""
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return tomorrow.isoformat()


# ---------------------------------------------------------------------------
# GET /credits
# ---------------------------------------------------------------------------

@router.get("", response_model=CreditBalance)
async def get_credits(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreditBalance:
    """
    Return the current user's credit balance, daily limit, and next reset time.
    Called by the frontend on layout mount and after each credit-spending action.
    """
    return CreditBalance(
        balance=await get_balance(db, current_user["user_id"]),
        limit=settings.daily_credits_limit,
        resets_at=_next_midnight_utc(),
    )


# ---------------------------------------------------------------------------
# POST /credits/deduct
# ---------------------------------------------------------------------------

@router.post("/deduct", response_model=CreditBalance)
async def deduct_credits(
    body: DeductRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreditBalance:
    """
    Explicit credit deduction — used by the frontend for pipeline follow-up runs.

    Pipeline follow-up flow:
      1. POST /sessions/{id}/followup  → routes question, returns run_id (no deduction)
      2. Frontend shows CreditWarning  → user confirms
      3. POST /credits/deduct          → deducts 5 ◉, returns new balance
      4. Frontend opens WebSocket      → pipeline runs

    Credits are only charged after the user explicitly confirms the cost.
    """
    new_balance = await spend(db, current_user["user_id"], body.amount)
    return CreditBalance(
        balance=new_balance,
        limit=settings.daily_credits_limit,
        resets_at=_next_midnight_utc(),
    )
