# routes.py
# Defines the endpoint that connects the frontend to the backend pipeline:
#
#   WS /ws/{run_id} — opens a live WebSocket connection, runs the graph,
#                     and streams typed events to the frontend in real time
#
# Run ids come from POST /sessions (session.id) or POST /sessions/{id}/followup
# (a fresh id for a follow-up pipeline) — both of those endpoints check auth
# and credits before minting one. This endpoint re-checks both: a valid access
# token, and that the token's user actually paid for this specific run_id (see
# services/run_registry.py). Without that second check, knowing any run_id
# would be enough to run the pipeline for free — the REST layer's auth and
# credit checks wouldn't matter, because the expensive work happens here.
#
# The access token and the question both travel as the first WebSocket
# message (a small JSON handshake) rather than as URL query params — a URL
# gets captured in access logs, proxies, and browser history (see
# SECURITY.md T6). This was already the plan for the question; the token
# needs the same treatment, since it's more sensitive than the question ever was.
#
# How events flow:
#   graph.astream_events() drives the LangGraph pipeline internally and emits
#   granular events as things happen inside nodes — including individual LLM tokens.
#   _stream_graph() listens to these events (Observer pattern) and translates
#   them into typed WebSocket events the frontend understands.
#   The frontend's Zustand store receives each event and updates the UI.

import asyncio   # Python's built-in async library — used for Semaphore and wait_for
import json      # converts Python dicts to JSON strings for WebSocket transmission

import structlog  # structured logging — logs key=value pairs instead of plain text strings
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from chorus.api.credits import refund as refund_credits
from chorus.auth import decode_token      # JWT decode/verify (shared with the REST auth dependency)
from chorus.config import settings        # centralized config (allowed origins, timeouts, limits)
from chorus.db.database import SessionLocal
from chorus.graph.state import GraphState # the shared state structure passed through the pipeline
from chorus.services.run_registry import consume as consume_run_authorization


# APIRouter groups related endpoints together.
# main.py calls app.include_router(router) to register all routes defined here.
# This keeps route definitions out of main.py and organized by feature.
router = APIRouter()

# The set of node names we care about in _stream_graph.
# LangGraph fires events for every internal operation — including framework internals.
# By filtering to only these node names, we ignore noise and only process
# events from our actual agent nodes.
AGENT_NODES = {"planner", "researcher_0", "researcher_1", "researcher_2", "critic", "synthesizer"}

# How long to wait for the client's auth handshake (its first message) before
# giving up on the connection — bounds a client that opens the socket and
# then never sends anything.
HANDSHAKE_TIMEOUT_SECONDS = 10.0

# Structured logger — logs are emitted as key=value pairs.
# Example log line: run_failed run_id=abc-123 exc_info=...
# Much easier to search and filter in production logging systems than plain text.
log = structlog.get_logger()


async def _refund_unfulfilled_run(user_id: str, amount: int, run_id: str) -> None:
    """
    Credits back a run that was paid for but never delivered a report (see
    SECURITY.md T13). Opens its own short-lived DB session — this endpoint
    doesn't hold one for the connection's lifetime, since it only needs the
    database at this one moment, not for the whole run.

    Best-effort: a failure here is logged, not raised — this runs from inside
    an except/failure path already, and refund plumbing breaking shouldn't
    turn into a second unhandled error on top of the original one.
    """
    try:
        async with SessionLocal() as db:
            await refund_credits(db, user_id, amount)
            await db.commit()
    except Exception:
        log.exception("refund_failed", run_id=run_id, user_id=user_id, amount=amount)


# ---------------------------------------------------------------------------
# WS /ws/{run_id}
# ---------------------------------------------------------------------------

@router.websocket("/ws/{run_id}")
async def websocket_run(websocket: WebSocket, run_id: str):
    """
    Opens the live channel that actually runs the pipeline.

    This endpoint:
      1. Validates the connection origin (defense in depth — see below)
      2. Accepts the WebSocket connection
      3. Reads the auth handshake — the first message the client must send —
         and validates the access token and that this run_id was authorized
         for its holder (the real access control — see services/run_registry.py)
      4. Builds the initial graph state
      5. Acquires a concurrency slot (semaphore)
      6. Runs the graph with a timeout
      7. Streams typed events to the frontend as each node completes

    Args:
        websocket: the WebSocket connection object (managed by FastAPI/Starlette)
        run_id:    session.id (original run) or the id POST /sessions/{id}/followup
                   minted (follow-up run) — used to tag events and to look up
                   this connection's authorization
    """

    # ------------------------------------------------------------------
    # Origin check — defense in depth, NOT the real access control.
    # ------------------------------------------------------------------
    # CORSMiddleware doesn't apply to WebSockets, so we check the Origin
    # header manually. This only stops a browser running someone else's
    # JavaScript from connecting on a victim's behalf — any non-browser
    # client (curl, a raw WebSocket library) can set this header to
    # whatever it wants. It is not authentication.
    origin = websocket.headers.get("origin")
    if origin not in settings.allowed_origins:
        await websocket.close(code=1008)  # 1008 = policy violation (RFC 6455)
        return

    # Accept the WebSocket upgrade — the connection is now open, but nothing
    # expensive has happened yet. The auth handshake below still has to pass
    # before the pipeline runs.
    await websocket.accept()

    # ------------------------------------------------------------------
    # Auth handshake — the first message, not URL query params.
    # ------------------------------------------------------------------
    # The client must send {"token": "...", "question": "..."} as its first
    # text frame within HANDSHAKE_TIMEOUT_SECONDS, or the connection closes.
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=HANDSHAKE_TIMEOUT_SECONDS)
        handshake = json.loads(raw)
        token = handshake.get("token", "")
        question = handshake.get("question", "")
        if not isinstance(token, str) or not isinstance(question, str):
            raise ValueError("Malformed handshake")
    except Exception:
        await websocket.close(code=1008)
        return

    # ------------------------------------------------------------------
    # SECURITY: real access control — valid token + paid-for run_id.
    # ------------------------------------------------------------------
    # Without this, anyone who can open a WebSocket (no browser, no account,
    # no origin spoofing tricks needed beyond setting one header) could run
    # the full pipeline — real Groq + Tavily calls — for free. Every REST
    # endpoint checks auth and credits; this is where that has to be
    # re-verified, because this is where the expensive work happens.
    user_id: str | None = None
    try:
        payload = decode_token(token)
        if payload.get("type") == "access":
            user_id = payload.get("sub")
    except Exception:
        user_id = None

    authorization = consume_run_authorization(run_id, user_id) if user_id else None
    if not authorization:
        await websocket.close(code=1008)
        return

    # Same cost-control cap the REST endpoints enforce via Pydantic
    # (Field(max_length=2000)) — the handshake isn't a Pydantic body, so it's
    # checked by hand here.
    if len(question) > 2000:
        await websocket.close(code=1008)
        return

    # ------------------------------------------------------------------
    # send() helper
    # ------------------------------------------------------------------
    # A small helper so we don't repeat json.dumps() everywhere.
    # Converts a Python dict to a JSON string and sends it over the socket.
    # Example: await send({"type": "run.started", "run_id": "abc"})
    #
    # Also tracks whether a report ever actually got delivered — the signal
    # used below to decide whether this run gets refunded on failure.
    report_delivered = False

    async def send(event: dict) -> None:
        nonlocal report_delivered
        if event.get("type") == "report.ready":
            report_delivered = True
        await websocket.send_text(json.dumps(event))

    # ------------------------------------------------------------------
    # Grab shared resources from app state
    # ------------------------------------------------------------------
    # Both of these were created once at server startup in main.py lifespan.
    # graph       — the compiled LangGraph pipeline (shared, stateless)
    # semaphore   — limits how many runs execute at the same time
    graph = websocket.app.state.graph
    semaphore: asyncio.Semaphore = websocket.app.state.run_semaphore

    try:
        # Notify the frontend immediately that the run has started.
        # This causes the frontend to redirect to /run/<id> and show the run page.
        await send({"type": "run.started", "run_id": run_id, "question": question})

        # ------------------------------------------------------------------
        # Build the initial GraphState
        # ------------------------------------------------------------------
        # This is the starting state passed into the graph.
        # Every field starts empty — nodes will populate them as they run.
        # LangGraph creates a fresh copy of this for each run, so there is
        # no data leakage between different users' runs.
        initial: GraphState = {
            "question": question,        # the research question
            "run_id": run_id,            # unique identifier for this run
            "angles": [],                # populated by planner_node
            "researcher_outputs": [],    # populated by researcher nodes (3 parallel writes)
            "critique": None,            # populated by critic_node
            "report": None,              # populated by synthesizer_node
        }

        # ------------------------------------------------------------------
        # Semaphore + timeout
        # ------------------------------------------------------------------
        # async with semaphore:
        #   Acquires one slot before running. If all 4 slots are taken,
        #   this line BLOCKS (waits) until another run finishes and releases
        #   its slot. The WebSocket stays open while waiting.
        #   When this run finishes, the slot is automatically released.
        #
        # asyncio.wait_for(..., timeout=settings.run_timeout_seconds):
        #   Cancels the run if it takes longer than the configured timeout.
        #   This prevents a hung network request or slow LLM call from
        #   holding a semaphore slot forever, which would eventually
        #   deadlock the whole server.
        async with semaphore:
            await asyncio.wait_for(
                _stream_graph(graph, initial, send),
                timeout=settings.run_timeout_seconds,
            )

    except asyncio.TimeoutError:
        # The run exceeded run_timeout_seconds — the system's fault, not the
        # user's. Refund before telling the client, so their balance is
        # already correct by the time they see the error (see SECURITY.md T13).
        if not report_delivered:
            await _refund_unfulfilled_run(authorization.user_id, authorization.amount, run_id)
        # Send a user-friendly error — the semaphore slot is released
        # automatically when we exit the `async with semaphore` block.
        await send({"type": "run.error", "message": "Run exceeded time limit."})

    except WebSocketDisconnect:
        # The user closed the browser tab, navigated away, or lost their
        # connection. Deliberately NOT refunded, unlike the other two failure
        # branches: by the time this fires, real Groq/Tavily calls have
        # likely already happened, and refunding here would let a client
        # repeatedly connect-then-disconnect to get research runs without
        # spending credits, bounded only by the preview rate limit (see
        # SECURITY.md T12) rather than the credit system itself. If the
        # connection genuinely just glitched, a real system failure on the
        # same run_id would still hit the TimeoutError or Exception branch
        # above/below and get refunded there. Nothing to send — the
        # connection is already gone.
        pass

    except Exception:
        # Something unexpected went wrong (LLM error, network failure, etc.)
        # — the system's fault, not the user's. Refund before telling the
        # client, same reasoning as the timeout branch.
        # Log the full exception server-side (with stack trace) for debugging,
        # but send a generic message to the client — never expose internal
        # error details to the frontend (see SECURITY.md T7).
        log.exception("run_failed", run_id=run_id)
        if not report_delivered:
            await _refund_unfulfilled_run(authorization.user_id, authorization.amount, run_id)
        await send({"type": "run.error", "message": "An internal error occurred."})


# ---------------------------------------------------------------------------
# _stream_graph()
# ---------------------------------------------------------------------------

async def _stream_graph(graph, initial: GraphState, send) -> None:
    """
    Drives the LangGraph pipeline using astream_events and translates
    every relevant internal event into a typed WebSocket event for the frontend.

    This function implements the Observer pattern:
      - LangGraph is the event EMITTER — it fires events as things happen inside nodes
      - This function is the LISTENER — it receives every event and decides what to forward
      - The WebSocket send() is the OUTPUT — it pushes translated events to the frontend

    Why astream_events instead of astream?
      graph.astream  — yields only when a node COMPLETES (too late for live token streaming)
      graph.astream_events — yields continuously as things happen INSIDE nodes, including
                             individual LLM tokens from researchers as they are generated

    LangGraph event types we care about:
      on_chain_start      — a node began executing
      on_chain_end        — a node finished and produced output
      on_chat_model_stream — one token arrived from the LLM (fired inside researcher nodes)

    Args:
        graph:   the compiled LangGraph graph (stateless, shared from app.state.graph)
        initial: the starting GraphState for this specific run
        send:    async helper that serializes a dict to JSON and sends it over WebSocket
    """

    # version="v2" is required — v1 is deprecated and has different event structure
    async for event in graph.astream_events(initial, version="v2"):

        # event["event"] — the LangGraph internal event name (e.g. "on_chain_start")
        kind = event["event"]

        # event["metadata"]["langgraph_node"] — which node fired this event.
        # Not all events have metadata, so we use .get() with a fallback of "".
        node = event.get("metadata", {}).get("langgraph_node", "")

        # ------------------------------------------------------------------
        # Node started → tell the frontend to animate the agent card in
        # ------------------------------------------------------------------
        # We filter to AGENT_NODES to ignore LangGraph's internal framework
        # operations that also fire on_chain_start but aren't our agent nodes.
        if kind == "on_chain_start" and node in AGENT_NODES:
            # Determine the role for the frontend badge color:
            # researcher_0 / researcher_1 / researcher_2 → "researcher"
            # planner / critic / synthesizer → use the node name directly as role
            role = "researcher" if node.startswith("researcher_") else node
            await send({"type": "agent.started", "agent_id": node, "role": role})

        # ------------------------------------------------------------------
        # LLM token arrived inside a researcher → stream it live to frontend
        # ------------------------------------------------------------------
        # on_chat_model_stream fires once per token as Groq generates them.
        # We only forward tokens from researcher nodes — planner, critic, and
        # synthesizer use ainvoke (no streaming) so they never fire this event.
        elif kind == "on_chat_model_stream" and node.startswith("researcher_"):
            token = event["data"]["chunk"].content
            # Skip empty chunks — Groq occasionally sends empty strings
            if token:
                await send({"type": "agent.token", "agent_id": node, "delta": token})

        # ------------------------------------------------------------------
        # Planner finished → send the decomposed angles to the frontend
        # ------------------------------------------------------------------
        # event["data"]["output"] contains what planner_node() returned:
        # {"angles": [AnglePlan(...), AnglePlan(...), AnglePlan(...)]}
        # model_dump() converts each Pydantic object to a JSON-serializable dict.
        elif kind == "on_chain_end" and node == "planner":
            output = event["data"].get("output", {})
            angles = [a.model_dump() for a in output.get("angles", [])]
            if angles:
                await send({"type": "plan.ready", "angles": angles})
            # Mark planner card as finished so the badge updates from "running" to "finished"
            await send({"type": "agent.finished", "agent_id": "planner", "output_ref": "planner"})

        # ------------------------------------------------------------------
        # Researcher finished → tell frontend the card is done
        # ------------------------------------------------------------------
        # We don't send the researcher's raw findings here — they flow into
        # GraphState for the Critic to read. The frontend only needs to know
        # the researcher finished so it can update the badge from "running" to "finished".
        elif kind == "on_chain_end" and node.startswith("researcher_"):
            await send({"type": "agent.finished", "agent_id": node, "output_ref": node})

        # ------------------------------------------------------------------
        # Critic finished → send the critique then mark the card done
        # ------------------------------------------------------------------
        # event["data"]["output"] contains what critic_node() returned:
        # {"critique": Critique(...)}
        elif kind == "on_chain_end" and node == "critic":
            output = event["data"].get("output", {})
            critique = output.get("critique")
            if critique:
                await send({"type": "critique.ready", "critique": critique.model_dump()})
            await send({"type": "agent.finished", "agent_id": "critic", "output_ref": "critique"})

        # ------------------------------------------------------------------
        # Synthesizer finished → send the final report then mark the card done
        # ------------------------------------------------------------------
        # event["data"]["output"] contains what synthesizer_node() returned:
        # {"report": Report(...)}
        # model_dump(mode="json") is used (not plain model_dump) because Report
        # contains a datetime field — mode="json" converts it to ISO 8601 string
        # automatically so json.dumps() doesn't fail on the datetime object.
        elif kind == "on_chain_end" and node == "synthesizer":
            output = event["data"].get("output", {})
            report = output.get("report")
            if report:
                await send({"type": "report.ready", "report": report.model_dump(mode="json")})
            await send({"type": "agent.finished", "agent_id": "synthesizer", "output_ref": "report"})