# Defines all the data shapes (contracts) used across the Chorus backend.
# Every piece of data that flows between agents, gets stored, or gets sent
# to the frontend is defined here as a Pydantic model.
#
# Pydantic automatically validates data — if you try to create a Finding
# with confidence="maybe" (not in the allowed values), it raises an error
# immediately instead of silently passing bad data through the system.

from __future__ import annotations  # allows forward references in type hints (e.g. list[Citation] before Citation is defined)
from datetime import datetime        # used to timestamp citations and reports
from typing import Literal           # restricts a field to a fixed set of allowed string values
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    """Request body for POST /auth/register."""
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Request body for POST /auth/login."""
    email: str
    password: str


class TokenResponse(BaseModel):
    """Returned by register and login. The refresh token is set as an httpOnly cookie."""
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    """Public user info — never includes the hashed password."""
    id: str
    email: str


# ---------------------------------------------------------------------------
# SESSIONS
# ---------------------------------------------------------------------------

class SessionPreviewRequest(BaseModel):
    """Request body for POST /sessions/preview — runs planner only."""
    question: str = Field(min_length=3, max_length=2000)


class SessionPreviewOut(BaseModel):
    """
    Returned by POST /sessions/preview.
    The frontend shows the angles to the user before committing to a full run.
    preview_id is a short-lived token the client passes to POST /sessions to confirm.
    """
    preview_id: str
    angles: list["AnglePlan"]


class SessionCreateRequest(BaseModel):
    """
    Request body for POST /sessions.
    preview_id must match a recent preview — proves the user reviewed the angles.
    """
    preview_id: str


class SessionOut(BaseModel):
    """Public representation of a session returned by GET /sessions and GET /sessions/{id}."""
    id: str
    name: str | None
    question: str
    created_at: datetime
    last_active: datetime


class StoreReportRequest(BaseModel):
    """Request body for PATCH /sessions/{id}/report — stores the finished report for follow-up routing."""
    report: dict  # raw Report JSON from the frontend


class FollowUpRequest(BaseModel):
    """Request body for POST /sessions/{id}/followup."""
    question: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    """One persisted conversation message returned in a session's detail view."""
    id: str
    role: str                 # "user" | "chorus"
    type: str                 # "user" | "reasoning" | "pipeline"
    content: str | None       # text for user / reasoning messages
    report: dict | None       # report JSON for pipeline follow-up messages
    created_at: datetime


class SessionDetailOut(SessionOut):
    """
    Full session view returned by GET /sessions/{id}.
    Extends SessionOut with the stored report and the conversation thread so the
    frontend can rehydrate a session after a page refresh.
    """
    report: dict | None
    messages: list[MessageOut]


class AppendMessageRequest(BaseModel):
    """
    Request body for POST /sessions/{id}/messages.
    Used by the frontend to persist pipeline follow-up messages (user question
    + resulting report), which arrive over the WebSocket rather than via HTTP.
    """
    id: str
    role: str = Field(pattern="^(user|chorus)$")
    type: str = Field(pattern="^(user|reasoning|pipeline)$")
    content: str | None = None
    report: dict | None = None


class CreditBalance(BaseModel):
    """Returned by GET /credits and POST /credits/deduct."""
    balance: int       # credits remaining today
    limit: int         # daily limit (from config)
    resets_at: str     # ISO 8601 UTC timestamp of next midnight reset


class DeductRequest(BaseModel):
    """Request body for POST /credits/deduct."""
    amount: int = Field(gt=0, le=20)  # must be positive, max one day's worth


# ---------------------------------------------------------------------------
# INPUT
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    """
    The request body when a user submits a question via POST /run.

    Field(...) adds validation rules:
    - min_length=3  : rejects empty or very short questions
    - max_length=2000: prevents a massive question from being sent to the LLM
                       (cost control + security — see SECURITY.md T5)
    """
    question: str = Field(min_length=3, max_length=2000)


# ---------------------------------------------------------------------------
# PLANNER OUTPUT
# ---------------------------------------------------------------------------

class AnglePlan(BaseModel):
    """
    One investigative angle produced by the Planner agent.
    Each Researcher agent receives one AnglePlan and investigates only that angle.

    Example:
        angle_id    = "technical"
        brief       = "Examine the technical limitations of quantum computing today."
        search_seeds = ["quantum computing hardware limitations", "qubit error rates"]
    """
    angle_id: str          # short identifier e.g. "technical", "historical", "impact"
    brief: str             # 1-2 sentence instruction for the researcher
    search_seeds: list[str]  # initial search queries to kick off web research


# ---------------------------------------------------------------------------
# RESEARCHER OUTPUT
# ---------------------------------------------------------------------------

class Citation(BaseModel):
    """
    A single source that backs up a claim.
    Researchers attach citations to every Finding they produce.
    """
    url: str               # the web page URL
    title: str             # page title
    snippet: str           # relevant excerpt from the page
    retrieved_at: datetime # when it was fetched (for freshness tracking)


class Finding(BaseModel):
    """
    One verifiable claim made by a Researcher, with supporting evidence.
    A ResearcherOutput contains a list of these.

    confidence reflects how well-supported the claim is:
    - "high"   : multiple strong citations
    - "medium" : some support but gaps exist
    - "low"    : weak or speculative (stub findings use this)
    """
    claim: str                               # the assertion being made
    support: str                             # explanation of why this claim is believed
    citations: list[Citation]                # sources backing the claim
    confidence: Literal["low", "medium", "high"]  # how well-supported the claim is


class ResearcherOutput(BaseModel):
    """
    Everything one Researcher agent produces after investigating its assigned angle.
    Three of these get collected into GraphState.researcher_outputs (one per researcher).
    """
    angle_id: str                  # which angle this output belongs to (matches AnglePlan.angle_id)
    findings: list[Finding]        # the claims this researcher discovered
    open_questions: list[str]      # things the researcher couldn't answer — passed to the Critic


# ---------------------------------------------------------------------------
# CRITIC OUTPUT
# ---------------------------------------------------------------------------

class ContradictionRef(BaseModel):
    """
    Points to two specific claims from different researchers that contradict each other.
    The Critic surfaces these so the Synthesizer can reconcile or flag them.
    """
    claim_a: str      # first conflicting claim
    claim_b: str      # second conflicting claim
    explanation: str  # why these two claims conflict


class ClaimRef(BaseModel):
    """
    A specific claim the Critic flagged as weak or under-supported.
    """
    claim: str   # the claim in question
    reason: str  # why the Critic considers it weak (e.g. "only one low-quality source")


class FollowupRequest(BaseModel):
    """
    A request from the Critic for a Researcher to do additional investigation.
    Used in Phase 2 when the Critic can loop back to researchers.
    """
    angle_id: str      # which researcher should follow up
    instruction: str   # what specifically to investigate


class Critique(BaseModel):
    """
    The full output of the Critic agent after reviewing all researcher outputs.
    This is architecturally required — the Synthesizer cannot run without it.

    Even if no problems are found, an empty Critique is still produced,
    which confirms the Critic ran and found nothing to flag.
    """
    contradictions: list[ContradictionRef]  # claims from different researchers that conflict
    weak_claims: list[ClaimRef]             # claims that lack sufficient support
    gaps: list[str]                         # topics none of the researchers covered
    needs_followup: list[FollowupRequest]   # requests for additional research (Phase 2)


# ---------------------------------------------------------------------------
# SYNTHESIZER OUTPUT (the final report)
# ---------------------------------------------------------------------------

class ContestedPoint(BaseModel):
    """
    A topic where researchers disagreed — both sides are shown with sources.
    This is a key differentiator: Chorus surfaces disagreement explicitly
    rather than picking one side or averaging them out.
    """
    topic: str               # what the disagreement is about
    positions: list[str]     # the different positions held
    sources: list[Citation]  # sources supporting each side


class Report(BaseModel):
    """
    The final structured output of a Chorus run.
    Produced by the Synthesizer after receiving and reconciling all
    researcher findings and the critic's assessment.

    This is what the frontend renders in the report section.
    """
    question: str                                      # the original question asked by the user
    tl_dr: str                                         # one-paragraph summary of the findings
    key_findings: list[Finding]                        # the most important verified claims
    contested_points: list[ContestedPoint]             # areas where researchers disagreed
    sources: list[Citation]                            # all sources cited across all findings
    confidence_overall: Literal["low", "medium", "high"]  # overall confidence in the report
    generated_at: datetime                             # when the report was produced
