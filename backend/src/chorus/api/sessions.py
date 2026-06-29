# Session management endpoints.
#
# A session is one research thread — it begins with a question, goes through
# the angle preview step, and then runs the full pipeline. In later milestones
# a session will also hold follow-up messages. For now it stores the question,
# the generated name, and timestamps.
#
# Endpoints:
#   POST /sessions/preview        — run planner only, return angles for user review
#   POST /sessions                — confirm angles, create session record, return session_id
#   GET  /sessions                — list all sessions for the current user (newest first)
#   GET  /sessions/{id}           — get one session's metadata
#   PATCH /sessions/{id}/name     — generate a short name via fast_llm (called after report)
#
# In-memory stores: replaced by Postgres in Milestone 7.
#   _previews — short-lived; holds angles between preview and confirm steps
#   _sessions — persistent for the lifetime of the server process

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from langchain_core.messages import HumanMessage, SystemMessage

from chorus.auth import get_current_user
from chorus.graph.nodes.planner import planner_node
from chorus.graph.state import GraphState
from chorus.llm import fast_llm, smart_llm
from chorus.schemas import (
    AnglePlan,
    FollowUpRequest,
    SessionCreateRequest,
    SessionOut,
    SessionPreviewOut,
    SessionPreviewRequest,
    StoreReportRequest,
)
from chorus.services.followup_router import route_followup

router = APIRouter(prefix="/sessions", tags=["sessions"])

# ---------------------------------------------------------------------------
# In-memory stores (Milestone 7 → Postgres)
# ---------------------------------------------------------------------------

# preview_id → { "question": str, "angles": list[AnglePlan], "user_id": str }
_previews: dict[str, dict] = {}

# session_id → { "id", "user_id", "name", "question", "angles", "created_at", "last_active" }
_sessions: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# POST /sessions/preview
# ---------------------------------------------------------------------------

@router.post("/preview", response_model=SessionPreviewOut)
async def preview_session(
    body: SessionPreviewRequest,
    current_user: dict = Depends(get_current_user),
) -> SessionPreviewOut:
    """
    Run the Planner node in isolation — no researchers, no pipeline.

    Returns 3 investigative angles the user can review before committing
    to a full 5-credit pipeline run. Takes 2-4 seconds (one fast_llm call).

    The returned preview_id must be passed to POST /sessions within the same
    server session to confirm the run. Previews are not persisted across restarts.
    """
    preview_id = str(uuid.uuid4())

    # Build a minimal GraphState — planner_node only reads "question"
    state: GraphState = {
        "question": body.question,
        "run_id": preview_id,
        "angles": [],
        "researcher_outputs": [],
        "critique": None,
        "report": None,
    }

    result = await planner_node(state)
    angles: list[AnglePlan] = result.get("angles", [])

    _previews[preview_id] = {
        "question": body.question,
        "angles": angles,
        "user_id": current_user["user_id"],
    }

    return SessionPreviewOut(preview_id=preview_id, angles=angles)


# ---------------------------------------------------------------------------
# POST /sessions
# ---------------------------------------------------------------------------

@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreateRequest,
    current_user: dict = Depends(get_current_user),
) -> SessionOut:
    """
    Confirm a previewed angle plan and create the session record.

    The session_id returned here doubles as the run_id for the WebSocket
    endpoint — the frontend opens WS /ws/{session_id}?question=... immediately
    after this call to start the pipeline.

    Deletes the preview record once consumed (each preview is single-use).
    """
    preview = _previews.get(body.preview_id)
    if not preview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preview not found or already used.",
        )
    if preview["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your preview.")

    now = datetime.now(timezone.utc)
    session_id = str(uuid.uuid4())

    session: dict = {
        "id": session_id,
        "user_id": current_user["user_id"],
        "name": None,
        "question": preview["question"],
        "angles": preview["angles"],
        "created_at": now,
        "last_active": now,
    }
    _sessions[session_id] = session

    # Preview consumed — remove it so it can't be reused
    del _previews[body.preview_id]

    return _to_session_out(session)


# ---------------------------------------------------------------------------
# GET /sessions
# ---------------------------------------------------------------------------

@router.get("", response_model=list[SessionOut])
async def list_sessions(
    current_user: dict = Depends(get_current_user),
) -> list[SessionOut]:
    """
    Return all sessions for the current user, newest first.
    Used by the session sidebar to populate the session list.
    """
    user_sessions = [
        s for s in _sessions.values()
        if s["user_id"] == current_user["user_id"]
    ]
    user_sessions.sort(key=lambda s: s["last_active"], reverse=True)
    return [_to_session_out(s) for s in user_sessions]


# ---------------------------------------------------------------------------
# GET /sessions/{session_id}
# ---------------------------------------------------------------------------

@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
) -> SessionOut:
    """Return one session's metadata."""
    session = _get_owned_session(session_id, current_user["user_id"])
    return _to_session_out(session)


# ---------------------------------------------------------------------------
# PATCH /sessions/{session_id}/name
# ---------------------------------------------------------------------------

@router.patch("/{session_id}/name")
async def name_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Generate a short 3-5 word name for the session using fast_llm.

    Called by the frontend immediately after report.ready is received.
    Uses Llama 3.1 8B (fast_llm) — the naming task is simple enough
    that the small model handles it reliably and quickly.

    Returns: { "name": "Generated session name" }
    """
    session = _get_owned_session(session_id, current_user["user_id"])

    response = await fast_llm.ainvoke([
        HumanMessage(
            content=(
                "Extract the main research topic from this question in 3 to 5 words. "
                "Return ONLY the topic — no punctuation, no explanation:\n\n"
                f"{session['question']}"
            )
        )
    ])

    name = response.content.strip().strip(".,!?")[:80]
    session["name"] = name
    session["last_active"] = datetime.now(timezone.utc)

    return {"name": name}


# ---------------------------------------------------------------------------
# PATCH /sessions/{session_id}/report
# ---------------------------------------------------------------------------

@router.patch("/{session_id}/report")
async def store_report(
    session_id: str,
    body: StoreReportRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Store the finished report in the session record for follow-up routing context.

    Called by the frontend immediately after report.ready is received (alongside
    PATCH /sessions/{id}/name). The stored report lets the follow-up endpoint
    route questions deterministically — keyword matching runs against the
    findings text without needing the frontend to re-send it every time.
    """
    session = _get_owned_session(session_id, current_user["user_id"])

    report_data = body.report
    # Pre-join all finding claims + support into one string for fast keyword matching
    session["findings_text"] = " ".join(
        f"{f.get('claim', '')} {f.get('support', '')}"
        for f in report_data.get("key_findings", [])
    )
    session["report_data"] = report_data
    session["last_active"] = datetime.now(timezone.utc)

    return {"ok": True}


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/followup
# ---------------------------------------------------------------------------

_REASONING_SYSTEM = """You are a research assistant answering a follow-up question \
about completed research findings.
Answer based ONLY on the provided findings. Be concise and specific.
If the findings do not contain enough information, say so clearly."""


@router.post("/{session_id}/followup")
async def followup(
    session_id: str,
    body: FollowUpRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Handle a follow-up question for a completed research session.

    Routing (deterministic — no LLM):
      "reasoning" → answer from existing findings (fast, 1 credit)
      "pipeline"  → new full research run (thorough, 5 credits)

    Reasoning path: calls smart_llm with the original findings as context.
    Pipeline path:  generates a new run_id and returns it — the frontend
                    opens a WebSocket to /ws/{run_id}?question=... to start
                    the pipeline (same mechanism as the original run).

    Returns:
      { "type": "reasoning", "answer": "..." }
      { "type": "pipeline",  "run_id": "..." }
    """
    session = _get_owned_session(session_id, current_user["user_id"])
    findings_text: str = session.get("findings_text", "")
    report_data: dict = session.get("report_data", {})

    decision = route_followup(body.question, findings_text)

    if decision == "reasoning":
        findings_summary = "\n".join(
            f"- [{f.get('confidence', 'medium')}] {f.get('claim', '')}: "
            f"{f.get('support', '')[:300]}"
            for f in report_data.get("key_findings", [])
        )
        messages = [
            SystemMessage(content=_REASONING_SYSTEM),
            HumanMessage(
                content=(
                    f"Original research question: {session['question']}\n\n"
                    f"Research summary: {report_data.get('tl_dr', '')}\n\n"
                    f"Key findings:\n{findings_summary}\n\n"
                    f"Follow-up question: {body.question}"
                )
            ),
        ]
        response = await smart_llm.ainvoke(messages)
        return {"type": "reasoning", "answer": response.content.strip()}

    # Pipeline — return a new run_id; frontend opens WebSocket
    return {"type": "pipeline", "run_id": str(uuid.uuid4())}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_owned_session(session_id: str, user_id: str) -> dict:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    if session["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session.")
    return session


def _to_session_out(session: dict) -> SessionOut:
    return SessionOut(
        id=session["id"],
        name=session.get("name"),
        question=session["question"],
        created_at=session["created_at"],
        last_active=session["last_active"],
    )
