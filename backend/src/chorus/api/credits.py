# api/credits.py
# Credit ledger endpoints.
#
# Credits are a daily allowance that throttles expensive pipeline runs.
# The ledger is in-memory for Milestones 1-6; Milestone 7 moves it to Postgres.
#
# Credit costs:
#   Full pipeline run (original or follow-up)  →  5 credits
#   Reasoning follow-up (LLM over findings)    →  1 credit
#   Angle preview (planner only)               →  0 credits
#   Viewing past sessions                      →  0 credits
#
# Reset: daily at UTC midnight.
# Enforcement: spend() raises HTTP 402 if the user has insufficient credits.
# The sessions router imports spend() and calls it at each credit-costing action.
#
# Endpoints:
#   GET  /credits        — return current balance + reset timestamp
#   POST /credits/deduct — explicit deduction (used by frontend for pipeline follow-ups)

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from chorus.auth import get_current_user
from chorus.config import settings
from chorus.schemas import CreditBalance, DeductRequest

router = APIRouter(prefix="/credits", tags=["credits"])

# ---------------------------------------------------------------------------
# In-memory ledger (Milestone 7 → Postgres credits_ledger table)
# { user_id: { "date": "YYYY-MM-DD", "used": int } }
# ---------------------------------------------------------------------------
_ledger: dict[str, dict] = {}


def get_balance(user_id: str) -> int:
    """Return credits remaining today. Automatically resets on a new UTC date."""
    today = date.today().isoformat()
    record = _ledger.get(user_id)
    if not record or record["date"] != today:
        return settings.daily_credits_limit   # fresh day — full allowance
    return max(0, settings.daily_credits_limit - record["used"])


def spend(user_id: str, amount: int) -> int:
    """
    Deduct `amount` credits for a user and return the new balance.
    Raises HTTP 402 if the user has insufficient credits.

    Called directly by sessions.py at each credit-costing action so that
    the check and deduction happen atomically within the same request.
    """
    today = date.today().isoformat()
    record = _ledger.get(user_id, {"date": today, "used": 0})
    if record["date"] != today:
        record = {"date": today, "used": 0}   # new day — reset

    balance = settings.daily_credits_limit - record["used"]
    if balance < amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Insufficient credits. You have {balance} ◉ remaining "
                f"but this action costs {amount} ◉. "
                f"Your balance resets at midnight UTC."
            ),
        )

    record["used"] += amount
    _ledger[user_id] = record
    return settings.daily_credits_limit - record["used"]


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
) -> CreditBalance:
    """
    Return the current user's credit balance, daily limit, and next reset time.
    Called by the frontend on layout mount and after each credit-spending action.
    """
    return CreditBalance(
        balance=get_balance(current_user["user_id"]),
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
) -> CreditBalance:
    """
    Explicit credit deduction — used by the frontend for pipeline follow-up runs.

    Pipeline follow-up flow:
      1. POST /sessions/{id}/followup  → routes question, returns run_id (no deduction)
      2. Frontend shows CreditWarning  → user confirms
      3. POST /credits/deduct          → deducts 5 ◉, returns new balance
      4. Frontend opens WebSocket      → pipeline runs

    This two-step design means credits are only charged after the user
    explicitly confirms they want to start a new pipeline run.
    """
    new_balance = spend(current_user["user_id"], body.amount)
    return CreditBalance(
        balance=new_balance,
        limit=settings.daily_credits_limit,
        resets_at=_next_midnight_utc(),
    )
