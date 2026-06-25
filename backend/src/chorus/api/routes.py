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
#   graph.astream() drives the LangGraph pipeline internally.
#   As each node finishes, _stream_graph() translates its output into a
#   typed JSON event and sends it over the WebSocket to the frontend.
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
    Drives the LangGraph pipeline and translates each completed node's
    output into a typed WebSocket event for the frontend.

    This function has two responsibilities:
      1. DRIVES execution — graph.astream() is a generator. Without this
         loop running, LangGraph never executes the next node. The `async for`
         is what actually triggers the pipeline to run step by step.
      2. TRANSLATES outputs — each completed node's output is converted
         into a typed JSON event and sent to the frontend via send().

    Args:
        graph:   the compiled LangGraph graph (from app.state.graph)
        initial: the starting GraphState for this run
        send:    the async helper function that sends events over WebSocket

    Event mapping (node → WebSocket event):
        planner     → plan.ready         (angles for the researchers)
        researcher  → agent.started, agent.token (×N), agent.finished
        critic      → agent.started, critique.ready, agent.finished
        synthesizer → agent.started, report.ready, agent.finished
    """

    # graph.astream(initial) starts the graph and yields one chunk each
    # time a node finishes. The loop processes nodes in completion order.
    # Researchers may complete in any order since they run in parallel.
    async for step in graph.astream(initial):

        # Each step is a dict with one key: the node that just completed.
        # Example: {"planner": {"angles": [AnglePlan(...), ...]}}
        # next(iter(...)) extracts that single key-value pair.
        node_name, node_output = next(iter(step.items()))

        # ------------------------------------------------------------------
        # Planner completed
        # ------------------------------------------------------------------
        if node_name == "planner":
            # node_output = {"angles": [AnglePlan(...), AnglePlan(...), AnglePlan(...)]}
            # Convert each AnglePlan Pydantic object to a plain dict for JSON serialization.
            angles = [a.model_dump() for a in node_output.get("angles", [])]

            # Tell the frontend the plan is ready so it can show the angles
            # the researchers are about to investigate.
            await send({"type": "plan.ready", "angles": angles})

        # ------------------------------------------------------------------
        # A researcher completed (researcher_0, researcher_1, or researcher_2)
        # ------------------------------------------------------------------
        elif node_name.startswith("researcher_"):
            # Tell the frontend this researcher has started so it can
            # animate the agent card onto the screen.
            await send({"type": "agent.started", "agent_id": node_name, "role": "researcher"})

            # Stub: simulate token streaming by sending one character at a time
            # with a small delay between each. In Phase 1, real token deltas
            # will come from the LLM's streaming API instead of this loop.
            # The 20ms delay gives the streaming a natural, readable pace.
            for token in f"[{node_name}] Researching...":
                await send({"type": "agent.token", "agent_id": node_name, "delta": token})
                await asyncio.sleep(0.02)  # 20ms between tokens — feels natural, not instant

            # Tell the frontend this researcher is done.
            # output_ref is a reference string the frontend can use to identify
            # which output this agent produced (used in Phase 2 for linking).
            await send({"type": "agent.finished", "agent_id": node_name, "output_ref": node_name})

            # Note: we intentionally do NOT send the researcher's findings here.
            # The raw ResearcherOutput goes into GraphState for the Critic to read.
            # The frontend only needs to see the agent activity — not the raw data.

        # ------------------------------------------------------------------
        # Critic completed
        # ------------------------------------------------------------------
        elif node_name == "critic":
            await send({"type": "agent.started", "agent_id": "critic", "role": "critic"})

            # node_output = {"critique": Critique(...)}
            # Extract the Critique object and send it to the frontend.
            # The frontend renders this as a collapsible "Critic found X gaps" section.
            critique = node_output.get("critique")
            if critique:
                # model_dump() converts the Pydantic Critique object to a plain dict.
                # No mode="json" needed here since Critique has no datetime fields.
                await send({"type": "critique.ready", "critique": critique.model_dump()})

            await send({"type": "agent.finished", "agent_id": "critic", "output_ref": "critique"})

        # ------------------------------------------------------------------
        # Synthesizer completed — final output
        # ------------------------------------------------------------------
        elif node_name == "synthesizer":
            await send({"type": "agent.started", "agent_id": "synthesizer", "role": "synthesizer"})

            # node_output = {"report": Report(...)}
            # Extract the final Report and send it to the frontend.
            # This is the main output the user came for.
            report = node_output.get("report")
            if report:
                # model_dump(mode="json") is used here (not plain model_dump())
                # because Report contains a `generated_at` datetime field.
                # mode="json" automatically converts datetime → ISO 8601 string,
                # so it's safe to pass directly to json.dumps() without errors.
                await send({"type": "report.ready", "report": report.model_dump(mode="json")})

            await send({"type": "agent.finished", "agent_id": "synthesizer", "output_ref": "report"})
