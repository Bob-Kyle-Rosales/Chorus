# rate_limit.py
# A small per-key sliding-window rate limiter, in-process and in-memory.
#
# Why this exists:
#   A couple of endpoints (angle preview, session naming) are authenticated
#   but intentionally free — no credit cost, by design (see credits.py).
#   "Free" isn't the same as "unlimited": nothing stopped a registered user
#   (registration itself is free and instant) from calling either in a loop
#   forever, each one a real Groq call. This bounds call *frequency* per user
#   without touching the pricing decision those endpoints already made.
#
# Why in-memory, not Redis or a library:
#   Single-process, portfolio-scale deployment — matches the same tradeoff
#   already made for run_registry.py and the preview store in sessions.py.
#   Won't coordinate across multiple instances; fine until this app needs to
#   scale beyond one.

import time

# key -> timestamps of calls still inside the window
_calls: dict[str, list[float]] = {}


def check_and_record(key: str, max_calls: int, window_seconds: float) -> bool:
    """
    Returns True and records this call if the key has made fewer than
    max_calls within the trailing window_seconds. Returns False (and does
    NOT record) if the caller is over the limit.
    """
    now = time.monotonic()
    cutoff = now - window_seconds
    timestamps = _calls.setdefault(key, [])

    # Drop anything outside the window — keeps each key's list bounded to
    # at most max_calls entries, so this can't grow unbounded either.
    while timestamps and timestamps[0] < cutoff:
        timestamps.pop(0)

    if len(timestamps) >= max_calls:
        return False

    timestamps.append(now)
    return True
