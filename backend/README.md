# Chorus — Backend

FastAPI + LangGraph backend for Chorus, a multi-agent AI research platform. A user submits a question; a LangGraph pipeline dispatches parallel Researcher agents, runs a Critic across their findings, and a Synthesizer produces a structured report. Every agent streams tokens live over WebSocket.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | FastAPI |
| Agent orchestration | LangGraph |
| LLM inference | Groq (Llama 3.1 8B + Llama 3.3 70B) via `langchain-groq` |
| Web search | Tavily |
| Page fetching | httpx + trafilatura (clean text extraction) |
| Database | SQLAlchemy 2.0 (async) — SQLite locally, Postgres-compatible in production |
| Auth | PyJWT (access + refresh tokens) + passlib/bcrypt (password hashing) |
| Validation | Pydantic v2 |
| Logging | structlog |
| Package manager | uv |
| Testing | pytest + pytest-asyncio |
| Linting / types | ruff + mypy (strict) |

---

## Quick Setup

### 1. Install dependencies

```bash
cd backend
uv sync
```

### 2. Configure environment

Create `backend/.env`:

```bash
GROQ_API_KEY=your_groq_key
TAVILY_API_KEY=your_tavily_key
JWT_SECRET=dev-secret-change-in-production
ALLOWED_ORIGINS=["http://localhost:3000"]

# Set to true once this is served over HTTPS — the server logs a warning on
# every boot until both this and JWT_SECRET are set to real values.
COOKIE_SECURE=false

# Optional — defaults to a local SQLite file if omitted
DATABASE_URL=sqlite+aiosqlite:///./chorus.db
```

### 3. Run the dev server

```bash
uv run uvicorn chorus.main:app --reload --port 8000
```

Database tables (`users`, `sessions`, `messages`, `credits_ledger`) are created automatically on startup — no migration step needed for local dev.

### Other commands

```bash
uv run pytest                 # run tests
uv run pytest tests/test_schemas.py -v   # run a single test file
uv run ruff check src/        # lint
uv run mypy src/              # type check
```

---

## Architecture

### Request flow — starting a research run

```
Frontend                          Backend
   │                                 │
   ├── POST /sessions/preview ──────▶│  planner_node runs in isolation
   │                                 │  (no researchers, no credits spent)
   │◀──── { preview_id, angles } ────┤
   │                                 │
   │   (user reviews 3 angle cards)  │
   │                                 │
   ├── POST /sessions ──────────────▶│  creates session record, deducts 5 credits
   │                                 │  session_id doubles as the WebSocket run_id
   │◀──────── { session } ───────────┤
   │                                 │
   ├── WS /ws/{session_id} ─────────▶│  origin check → accept → run the graph
   │                                 │
   │◀── agent.started / agent.token ─┤  events streamed live as the graph executes
   │◀── agent.finished / report.ready┤
   │                                 │
   ├── PATCH /sessions/{id}/report ─▶│  stores the report (follow-up routing context)
   ├── PATCH /sessions/{id}/name ───▶│  fast_llm generates a short session name
```

### The LangGraph pipeline

```
                    ┌─────────────┐
                    │   Planner   │  fast_llm — decomposes question into 3 angles
                    └──────┬──────┘
                           │ fan-out
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │researcher_0 │  │researcher_1 │  │researcher_2 │  smart_llm + Tavily search
   │             │  │             │  │             │  + httpx/trafilatura fetch
   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  (genuinely parallel, no
          │                │                │           cross-researcher visibility)
          └────────────────┼────────────────┘
                           │ fan-in (waits for all 3)
                           ▼
                    ┌─────────────┐
                    │    Critic   │  smart_llm — finds contradictions, weak
                    └──────┬──────┘  claims, gaps across all 3 researchers
                           ▼
                    ┌─────────────┐
                    │ Synthesizer │  smart_llm — produces the final structured
                    └──────┬──────┘  Report (key findings, contested points, sources)
                           ▼
                        Report
```

Critique-before-synthesis is enforced at the graph level — the Synthesizer is never wired as a direct child of the Researchers. Researchers cannot read each other's output; each receives only its own angle brief and the original question.

### Follow-up routing (after the report is ready)

```
User asks a follow-up question
            │
            ▼
   route_followup(question, findings_text)   ← deterministic, no LLM
            │
   ┌────────┴────────┐
   ▼                  ▼
"reasoning"        "pipeline"
   │                  │
   ▼                  ▼
smart_llm answers   New run_id returned →
from existing        frontend opens a new
findings (1 credit)  WebSocket, full graph
                      runs again (5 credits)
```

Routing uses two signals: explicit references ("finding 2", "tell me more") and keyword overlap with the stored findings text (≥30% overlap → reasoning). No LLM call is needed just to route — keeps follow-ups fast and predictable.

### Module layout

```
src/chorus/
├── main.py                  FastAPI app, CORS, lifespan (DB init, graph compile, semaphore)
├── config.py                Centralized settings (pydantic-settings, reads .env)
├── llm.py                   Shared Groq clients (fast_llm, smart_llm) with retry config
├── auth.py                  JWT creation/verification, password hashing, user DB queries
├── schemas.py                Pydantic models — every data shape that crosses a boundary
│
├── api/
│   ├── routes.py             POST /run, WS /ws/{run_id} — the core pipeline endpoint
│   ├── auth.py                /auth/register, /login, /refresh, /me, /logout
│   ├── sessions.py            /sessions/* — preview, create, list, follow-up, naming
│   └── credits.py             /credits — balance + deduction
│
├── graph/
│   ├── graph.py               LangGraph StateGraph wiring (fan-out/fan-in edges)
│   ├── state.py                Shared GraphState TypedDict
│   └── nodes/
│       ├── planner.py          Decomposes question into 3 angles (fast_llm)
│       ├── researcher.py       Search + fetch + analyze one angle (smart_llm)
│       ├── critic.py           Cross-reads all researcher outputs (smart_llm)
│       └── synthesizer.py      Produces the final Report (smart_llm)
│
├── services/
│   └── followup_router.py     Deterministic reasoning-vs-pipeline classifier
│
├── security/
│   ├── fetch_guard.py          SSRF protection — blocks private/internal IPs
│   └── untrusted.py            Wraps fetched web content as untrusted data
│
└── db/
    ├── database.py              Async engine, session factory, init_db()
    └── models.py                User, ResearchSession, Message, CreditLedger
```

---

## API Reference

### Pipeline

| Method | Path | Description |
|---|---|---|
| POST | `/run` | Create a run_id (legacy single-shot entry point) |
| WS | `/ws/{run_id}` | Live event stream — runs the graph, streams agent tokens |

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account (first/last name, email, password) → access token + refresh cookie |
| POST | `/auth/login` | Sign in → access token + refresh cookie |
| POST | `/auth/refresh` | Exchange refresh cookie for a new access token |
| GET | `/auth/me` | Current user's profile |
| POST | `/auth/logout` | Clear the refresh cookie |

### Sessions

| Method | Path | Description |
|---|---|---|
| POST | `/sessions/preview` | Run the planner only, return 3 angles (0 credits) |
| POST | `/sessions` | Confirm a preview, create the session, deduct 5 credits |
| GET | `/sessions` | List the current user's sessions, newest first |
| GET | `/sessions/{id}` | Full session detail — report + conversation (for rehydration) |
| PATCH | `/sessions/{id}/name` | Generate a short session name via fast_llm |
| PATCH | `/sessions/{id}/report` | Store the finished report (follow-up routing context) |
| POST | `/sessions/{id}/messages` | Persist one conversation message |
| POST | `/sessions/{id}/followup` | Route + answer a follow-up question |

### Credits

| Method | Path | Description |
|---|---|---|
| GET | `/credits` | Current balance, daily limit, next reset time |
| POST | `/credits/deduct` | Deduct credits for a confirmed action |

---

## Included Features

- **Parallel multi-agent research** — 3 researchers investigate independently and simultaneously via LangGraph fan-out
- **Live token streaming** — every agent's reasoning streams to the frontend in real time over WebSocket
- **Angle preview** — see what Chorus plans to research before committing credits
- **Adversarial review** — a dedicated Critic agent stress-tests findings before synthesis; this is structurally enforced, not a prompt instruction
- **Structured reports** — key findings with confidence ratings, explicitly surfaced contested points, numbered sources
- **Follow-up conversations** — deterministic routing between cheap reasoning answers and full new research runs
- **JWT authentication** — short-lived access tokens (in-memory) + long-lived refresh tokens (httpOnly cookie)
- **Session persistence** — full conversation threads and reports survive server restarts and page refreshes
- **Credit system** — daily allowance with per-action deduction (5 credits/pipeline run, 1 credit/reasoning follow-up)
- **Background execution support** — runs continue independent of any single request lifecycle
- **Concurrency control** — semaphore-limited simultaneous pipeline runs to stay within LLM provider rate limits
- **Resilient researcher nodes** — automatic retry on transient rate limits; a single researcher's failure degrades gracefully instead of crashing the whole run
- **SSRF protection** — every fetched URL is validated against private/internal/reserved IP ranges before the request is made
- **Prompt injection containment** — all fetched web content is wrapped and explicitly tagged as untrusted data before reaching the LLM
- **WebSocket origin validation** — manual origin checking since CORS middleware doesn't cover WebSocket upgrades
