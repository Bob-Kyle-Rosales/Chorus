# routes.py
# Defines the two endpoints that connect the frontend to the backend pipeline:
#
#   POST /run        — creates a new run, returns a run_id
#   WS   /ws/{run_id} — opens a live WebSocket connection, runs the graph,
#                       and streams typed events to the frontend in real time
#
# Why two endpoints instead of one?
#   The frontend first calls POST /run to get a unique run_id, then uses
#   that run_id to open the WebSocket. This gives the frontend a stable ID
#   to display in the URL (/run/<id>) before the WebSocket even opens.
#
# How events flow:
#   graph.astream_events() drives the LangGraph pipeline internally and emits
#   granular events as things happen inside nodes — including individual LLM tokens.
#   _stream_graph() listens to these events (Observer pattern) and translates
#   them into typed WebSocket events the frontend understands.
#   The frontend's Zustand store receives each event and updates the UI.

import asyncio   # Python's built-in async library — used for Semaphore and wait_for
import json      # converts Python dicts to JSON strings for WebSocket transmission
import uuid      # generates universally unique IDs for each run

import structlog  # structured logging — logs key=value pairs instead of plain text strings
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from chorus.config import settings        # centralized config (allowed origins, timeouts, limits)
from chorus.graph.state import GraphState # the shared state structure passed through the pipeline
from chorus.schemas import RunRequest     # validated request body for POST /run


# APIRouter groups related endpoints together.
# main.py calls app.include_router(router) to register all routes defined here.
# This keeps route definitions out of main.py and organized by feature.
router = APIRouter()

# The set of node names we care about in _stream_graph.
# LangGraph fires events for every internal operation — including framework internals.
# By filtering to only these node names, we ignore noise and only process
# events from our actual agent nodes.
AGENT_NODES = {"planner", "researcher_0", "researcher_1", "researcher_2", "critic", "synthesizer"}

# Structured logger — logs are emitted as key=value pairs.
# Example log line: run_failed run_id=abc-123 exc_info=...
# Much easier to search and filter in production logging systems than plain text.
log = structlog.get_logger()


# ---------------------------------------------------------------------------
# POST /run
# ---------------------------------------------------------------------------

@router.post("/run")
async def create_run(body: RunRequest) -> dict:
    """
    Step 1 of starting a research run.

    The frontend calls this first to get a unique run_id, then immediately
    opens a WebSocket to /ws/{run_id} using that ID.

    Args:
        body: RunRequest — the validated question from the user.
              Pydantic rejects questions under 3 or over 2000 characters
              before this function even runs (see schemas.py RunRequest).

    Returns:
        {"run_id": "<uuid>", "question": "<the question>"}

    Why not start the graph here?
        POST /run returns immediately. If we started the graph here, we'd
        need to wait 30-60 seconds for it to finish before responding —
        which would time out the HTTP connection. The WebSocket handles
        the long-running work.
    """

    # Generate a UUID (universally unique identifier) for this run.
    # Format: "550e8400-e29b-41d4-a716-446655440000"
    # UUIDs are random enough that two runs will never share the same ID.
    run_id = str(uuid.uuid4())

    return {"run_id": run_id, "question": body.question}


# ---------------------------------------------------------------------------
# WS /ws/{run_id}
# ---------------------------------------------------------------------------

@router.websocket("/ws/{run_id}")
async def websocket_run(websocket: WebSocket, run_id: str, question: str = ""):
    """
    Step 2 of starting a research run — the live channel.

    This endpoint:
      1. Validates the connection origin (security)
      2. Accepts the WebSocket connection
      3. Builds the initial graph state
      4. Acquires a concurrency slot (semaphore)
      5. Runs the graph with a timeout
      6. Streams typed events to the frontend as each node completes

    Args:
        websocket: the WebSocket connection object (managed by FastAPI/Starlette)
        run_id:    the UUID from POST /run — used to tag events so the frontend
                   knows which run they belong to
        question:  the research question, passed as a URL query parameter
                   e.g. /ws/abc-123?question=What+is+quantum+computing
    """

    # ------------------------------------------------------------------
    # SECURITY: Origin check (CORS does NOT protect WebSockets)
    # ------------------------------------------------------------------
    # The browser automatically sends an Origin header with WebSocket
    # connections (e.g. "http://localhost:3000").
    # We check it manually here because FastAPI's CORSMiddleware only
    # applies to regular HTTP requests — it does nothing for WebSockets.
    # If the origin is not in our allowed list, we close with code 1008
    # (policy violation) before accepting, so no data is exchanged.
    origin = websocket.headers.get("origin")
    if origin not in settings.allowed_origins:
        await websocket.close(code=1008)  # 1008 = policy violation (RFC 6455)
        return

    # Accept the WebSocket upgrade — the connection is now open.
    # Nothing can be sent or received until this is called.
    await websocket.accept()

    # ------------------------------------------------------------------
    # send() helper
    # ------------------------------------------------------------------
    # A small helper so we don't repeat json.dumps() everywhere.
    # Converts a Python dict to a JSON string and sends it over the socket.
    # Example: await send({"type": "run.started", "run_id": "abc"})
    async def send(event: dict) -> None:
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
        # The run exceeded run_timeout_seconds.
        # Send a user-friendly error — the semaphore slot is released
        # automatically when we exit the `async with semaphore` block.
        await send({"type": "run.error", "message": "Run exceeded time limit."})

    except WebSocketDisconnect:
        # The user closed the browser tab or navigated away.
        # Nothing to do — the connection is already gone.
        pass

    except Exception:
        # Something unexpected went wrong (LLM error, network failure, etc.)
        # Log the full exception server-side (with stack trace) for debugging,
        # but send a generic message to the client — never expose internal
        # error details to the frontend (see SECURITY.md T7).
        log.exception("run_failed", run_id=run_id)
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