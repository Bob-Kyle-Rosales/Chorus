# Session management endpoints (Milestone 7 — persisted to the database).
#
# A session is one research thread — it begins with a question, goes through
# the angle preview step, runs the full pipeline, and then accumulates follow-up
# messages. Sessions and messages live in the database (db/models.py); only the
# short-lived angle previews remain in-memory (single-use, fine to lose on restart).
#
# Endpoints:
#   POST  /sessions/preview        — run planner only, return angles for review
#   POST  /sessions                — confirm angles, create session row (5 ◉)
#   GET   /sessions                — list the user's sessions (newest first)
#   GET   /sessions/{id}           — full detail: metadata + report + messages
#   PATCH /sessions/{id}/name      — generate a short name via fast_llm
#   PATCH /sessions/{id}/report    — store the finished report on the session
#   POST  /sessions/{id}/messages  — append a conversation message (frontend-driven)
#   POST  /sessions/{id}/followup  — route + answer a follow-up question

import uuid
from chorus.db.models import _utcnow as _db_utcnow

from fastapi import APIRouter, Depends, HTTPException, status
from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from chorus.auth import get_current_user
from chorus.db.database import get_db
from chorus.db.models import Message, ResearchSession
from chorus.graph.nodes.planner import planner_node
from chorus.graph.state import GraphState
from chorus.llm import fast_llm, smart_llm
from chorus.schemas import (
    AnglePlan,
    AppendMessageRequest,
    FollowUpRequest,
    MessageOut,
    SessionCreateRequest,
    SessionDetailOut,
    SessionOut,
    SessionPreviewOut,
    SessionPreviewRequest,
    StoreReportRequest,
)
from chorus.services.followup_router import route_followup
from chorus.api.credits import spend as spend_credits

router = APIRouter(prefix="/sessions", tags=["sessions"])

# ---------------------------------------------------------------------------
# In-memory preview store (transient — intentionally NOT persisted).
# A preview only needs to live between "Plan research" and "Start research".
# preview_id → { "question": str, "angles": list[AnglePlan], "user_id": str }
# ---------------------------------------------------------------------------
_previews: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# POST /sessions/preview
# ---------------------------------------------------------------------------

@router.post("/preview", response_model=SessionPreviewOut)
async def preview_session(
    body: SessionPreviewRequest,
    current_user: dict = Depends(get_current_user),
) -> SessionPreviewOut:
    """
    Run the Planner node in isolation — no researchers, no pipeline, 0 credits.
    Returns 3 angles the user reviews before committing to a full run.
    """
    preview_id = str(uuid.uuid4())

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
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    """
    Confirm a previewed angle plan and create the persisted session row.

    The session_id doubles as the run_id for the WebSocket — the frontend opens
    WS /ws/{session_id}?question=... right after this call to start the pipeline.
    Deducts 5 credits (raises 402 if insufficient). Preview is single-use.
    """
    preview = _previews.get(body.preview_id)
    if not preview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preview not found or already used.",
        )
    if preview["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your preview.")

    # Deduct 5 credits for the full pipeline run (402 if insufficient).
    await spend_credits(db, current_user["user_id"], 5)

    session = ResearchSession(
        id=str(uuid.uuid4()),
        user_id=current_user["user_id"],
        name=None,
        question=preview["question"],
        angles=[a.model_dump() for a in preview["angles"]],
        report=None,
        findings_text=None,
    )
    db.add(session)
    await db.flush()

    # Preview consumed — remove so it can't be reused.
    del _previews[body.preview_id]

    return _to_session_out(session)


# ---------------------------------------------------------------------------
# GET /sessions
# ---------------------------------------------------------------------------

@router.get("", response_model=list[SessionOut])
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    """Return all sessions for the current user, newest first (for the sidebar)."""
    result = await db.execute(
        select(ResearchSession)
        .where(ResearchSession.user_id == current_user["user_id"])
        .order_by(ResearchSession.last_active.desc())
    )
    return [_to_session_out(s) for s in result.scalars().all()]


# ---------------------------------------------------------------------------
# GET /sessions/{session_id}
# ---------------------------------------------------------------------------

@router.get("/{session_id}", response_model=SessionDetailOut)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionDetailOut:
    """
    Full session detail: metadata + stored report + conversation messages.
    The frontend uses this to rehydrate a session after a page refresh.
    """
    session = await _get_owned_session(db, session_id, current_user["user_id"])

    msg_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    messages = [
        MessageOut(
            id=m.id,
            role=m.role,
            type=m.type,
            content=m.content,
            report=m.report,
            created_at=m.created_at,
        )
        for m in msg_result.scalars().all()
    ]

    return SessionDetailOut(
        id=session.id,
        name=session.name,
        question=session.question,
        created_at=session.created_at,
        last_active=session.last_active,
        report=session.report,
        messages=messages,
    )


# ---------------------------------------------------------------------------
# PATCH /sessions/{session_id}/name
# ---------------------------------------------------------------------------

@router.patch("/{session_id}/name")
async def name_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Generate a short 3-5 word name for the session using fast_llm.
    Called by the frontend right after the report arrives. Returns { "name": ... }.
    """
    session = await _get_owned_session(db, session_id, current_user["user_id"])

    response = await fast_llm.ainvoke([
        HumanMessage(
            content=(
                "Extract the main research topic from this question in 3 to 5 words. "
                "Return ONLY the topic — no punctuation, no explanation:\n\n"
                f"{session.question}"
            )
        )
    ])

    name = response.content.strip().strip(".,!?")[:80]
    session.name = name
    session.last_active = _db_utcnow()
    await db.flush()

    return {"name": name}


# ---------------------------------------------------------------------------
# PATCH /sessions/{session_id}/report
# ---------------------------------------------------------------------------

@router.patch("/{session_id}/report")
async def store_report(
    session_id: str,
    body: StoreReportRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Persist the finished report on the session row.

    Stores both the full report JSON (for rehydration on return) and a
    pre-joined findings_text string (for deterministic follow-up routing).
    """
    session = await _get_owned_session(db, session_id, current_user["user_id"])

    report_data = body.report
    session.report = report_data
    session.findings_text = " ".join(
        f"{f.get('claim', '')} {f.get('support', '')}"
        for f in report_data.get("key_findings", [])
    )
    session.last_active = _db_utcnow()
    await db.flush()

    return {"ok": True}


# ---------------------------------------------------------------------------
# POST /sessions/{session_id}/messages
# ---------------------------------------------------------------------------

@router.post("/{session_id}/messages", status_code=status.HTTP_201_CREATED)
async def append_message(
    session_id: str,
    body: AppendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Append a conversation message to the session.

    Frontend-driven: the frontend persists each message as it is added to the
    thread (user questions, reasoning replies, pipeline reports). Because the
    frontend supplies the message id, the persisted ids match the live ids,
    so rehydrating after a refresh produces the same thread.
    """
    session = await _get_owned_session(db, session_id, current_user["user_id"])

    db.add(Message(
        id=body.id,
        session_id=session.id,
        role=body.role,
        type=body.type,
        content=body.content,
        report=body.report,
    ))
    session.last_active = _db_utcnow()
    await db.flush()

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
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Route + answer a follow-up question for a completed session.

    Routing is deterministic (no LLM):
      "reasoning" → answer from existing findings (1 credit, deducted here)
      "pipeline"  → new full run (5 credits, deducted later via /credits/deduct
                    after the user confirms CreditWarning)

    Returns { "type": "reasoning", "answer": ... } or { "type": "pipeline", "run_id": ... }.
    Message persistence is handled separately by POST /sessions/{id}/messages.
    """
    session = await _get_owned_session(db, session_id, current_user["user_id"])
    findings_text = session.findings_text or ""
    report_data = session.report or {}

    decision = route_followup(body.question, findings_text)

    if decision == "reasoning":
        # Deduct 1 credit before the LLM call (avoids double-charge on retry).
        await spend_credits(db, current_user["user_id"], 1)

        findings_summary = "\n".join(
            f"- [{f.get('confidence', 'medium')}] {f.get('claim', '')}: "
            f"{f.get('support', '')[:300]}"
            for f in report_data.get("key_findings", [])
        )
        messages = [
            SystemMessage(content=_REASONING_SYSTEM),
            HumanMessage(
                content=(
                    f"Original research question: {session.question}\n\n"
                    f"Research summary: {report_data.get('tl_dr', '')}\n\n"
                    f"Key findings:\n{findings_summary}\n\n"
                    f"Follow-up question: {body.question}"
                )
            ),
        ]
        response = await smart_llm.ainvoke(messages)
        return {"type": "reasoning", "answer": response.content.strip()}

    # Pipeline follow-up — return a run_id; credits deducted on user confirmation.
    return {"type": "pipeline", "run_id": str(uuid.uuid4())}


# ---------------------------------------------------------------------------
# DELETE /sessions/{session_id}
# ---------------------------------------------------------------------------

@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a session owned by the current user. Returns 204 on success."""
    session = await db.get(ResearchSession, session_id)
    if not session or session.user_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    await db.delete(session)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_owned_session(
    db: AsyncSession, session_id: str, user_id: str
) -> ResearchSession:
    session = await db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    if session.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session.")
    return session


def _to_session_out(session: ResearchSession) -> SessionOut:
    return SessionOut(
        id=session.id,
        name=session.name,
        question=session.question,
        created_at=session.created_at,
        last_active=session.last_active,
    )
