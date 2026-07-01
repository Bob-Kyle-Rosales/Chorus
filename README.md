# Chorus

> *From the Greek theatrical concept — multiple distinct voices working in harmony to tell a truth no single voice could tell alone.*

Chorus is a multi-agent AI research platform. You ask a question; a team of AI agents investigates it in parallel from different angles, challenges its own findings through a dedicated Critic, and synthesizes everything into a structured, source-backed report — all streamed live to your screen.

---

## The Problem It Solves

Most AI tools give you one answer from one perspective. That answer blends facts, inferences, and hallucinations with no distinction between them, and it never pushes back on itself.

Chorus is built around the conviction that real intellectual rigor requires three things:

1. **Multiple independent perspectives** — separate agents investigate different angles simultaneously, without seeing each other's work.
2. **Adversarial challenge** — a dedicated Critic agent stress-tests every finding before synthesis. This is enforced at the architecture level, not a prompt instruction.
3. **Structured synthesis** — findings, contested points, confidence levels, and source links are surfaced as first-class output, not mashed into prose.

---

## Who It's For

| User | Why Chorus |
|---|---|
| **Consultants, analysts, PMs** | Unfamiliar topics under time pressure — needs breadth, citations, and a built-in challenge pass fast. |
| **Graduate students & researchers** | Quick topic survey with traceable sources before going deep. |
| **Journalists & content creators** | Multiple perspectives and explicit contradictions in one pass. |
| **Developers exploring agentic AI** | A working, inspectable example of genuine parallel agents, shared state, an enforced critique gate, and live streaming reasoning. |

---

## How It Works

```
User submits a question
         │
         ▼
    ┌──────────┐
    │  Planner │   decomposes the question into 3 investigative angles
    └────┬─────┘
         │ fan-out (genuinely parallel — LangGraph)
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
Researcher  Researcher  Researcher    each independently:
   (0)        (1)         (2)           · searches the web (Tavily)
                                        · fetches & reads source pages
                                        · streams reasoning live
                                        · extracts structured findings
    └────┬────┴──────────┘
         │ fan-in (waits for all 3)
         ▼
    ┌──────────┐
    │  Critic  │   surfaces contradictions, weak claims, missing angles
    └────┬─────┘
         ▼
    ┌─────────────┐
    │ Synthesizer │   assembles the final report:
    └─────────────┘     · key findings + confidence ratings
                        · contested points (both sides sourced)
                        · numbered clickable source list
                        · overall confidence rating
```

Every agent's tokens stream to the frontend in real time via WebSocket. The user watches the reasoning unfold, not just the result.

---

## Architecture

Two independent services communicate over HTTP and WebSocket:

```
Browser
  │
  ├── HTTP (REST)   ──▶  FastAPI  ──▶  SQLite / Postgres
  │                         │
  └── WebSocket     ──▶  FastAPI  ──▶  LangGraph graph
                                              │
                                    ┌─────────┴──────────┐
                                    │  Groq (inference)  │
                                    │  Tavily (search)   │
                                    └────────────────────┘
```

| Layer | Service | Technology |
|---|---|---|
| Frontend | `web` (port 3000) | Next.js 16, React 19, Tailwind v4, Zustand, Framer Motion |
| Backend | `api` (port 8000) | FastAPI, LangGraph, Python 3.11 |
| Database | `db` (port 5432) | Postgres 17 (Docker) / SQLite (local dev) |
| LLM inference | — | Groq — Llama 3.1 8B (fast) + Llama 3.3 70B (smart) |
| Web search | — | Tavily |

### WebSocket event protocol

The backend multiplexes per-agent token streams over a single WebSocket connection. Each message is a JSON object with a `type` discriminant:

```
agent.started     { agent_id, angle_brief }
agent.token       { agent_id, token }           ← streaming reasoning
agent.finished    { agent_id }
report.ready      { report }                    ← structured final report
run.error         { message }
```

The frontend's Zustand store dispatches on `type`, routing each event to the correct per-session run state. Sessions are fully isolated — two concurrent runs never mix agent data.

### Auth flow

```
Sign up / sign in
       │
       ▼
POST /auth/login ──▶ { access_token }  +  Set-Cookie: refresh_token (httpOnly)
       │
       ▼
Access token stored in Zustand (never localStorage — minimises XSS exposure)
       │
       ▼
Every API request: Authorization: Bearer <access_token>
       │
   401 received ──▶ POST /auth/refresh (sends httpOnly cookie)
                         │
                         ▼
                    New access_token → retry original request
```

---

## Project Structure

```
chorus/
├── backend/          FastAPI + LangGraph — see backend/README.md
├── frontend/         Next.js — see frontend/README.md
├── docker-compose.yml
└── .env              API keys (not committed — see setup below)
```

---

## Setup

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- A [Groq](https://console.groq.com/) API key (free tier works)
- A [Tavily](https://app.tavily.com/) API key (free tier works)

### 1. Clone the repo

```bash
git clone <repo-url>
cd chorus
```

### 2. Create the environment file

Create a `.env` file at the repo root:

```bash
GROQ_API_KEY=your_groq_key_here
TAVILY_API_KEY=your_tavily_key_here
JWT_SECRET=change-this-to-a-long-random-string
ALLOWED_ORIGINS=["http://localhost:3000"]
```

> `JWT_SECRET` signs auth tokens — use any long random string for local dev. Change it before any public deployment.

### 3. Start everything

```bash
docker compose up --build
```

This starts three services:

| Service | URL | What it is |
|---|---|---|
| `web` | http://localhost:3000 | Next.js frontend |
| `api` | http://localhost:8000 | FastAPI backend + docs at `/docs` |
| `db` | localhost:5432 | Postgres (internal only) |

Database tables are created automatically on first startup — no migration step needed.

### 4. Stop

```bash
docker compose down          # stop containers, keep database data
docker compose down -v       # stop containers and delete database data
```

---

## Local Development (without Docker)

Run each service directly for faster iteration with hot reload.

### Backend

```bash
cd backend
cp .env.example .env        # then fill in your API keys
uv sync
uv run uvicorn chorus.main:app --reload --port 8000
```

See [backend/README.md](backend/README.md) for the full local dev guide, test commands, and API reference.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:3000. See [frontend/README.md](frontend/README.md) for the full local dev guide and source layout.

> Without Docker, the backend defaults to a local SQLite file (`chorus.db`) — no Postgres needed.

---

## Key Features

- **Parallel multi-agent research** — 3 researchers investigate independently via LangGraph fan-out
- **Live token streaming** — every agent's reasoning streams token-by-token to the frontend over WebSocket
- **Angle preview** — see what Chorus plans to research before spending credits
- **Adversarial Critic** — structurally required before synthesis; surfaces contradictions and weak claims
- **Structured reports** — confidence-rated findings, contested points, numbered clickable sources
- **Follow-up conversations** — ask questions about a finished report; routed to fast reasoning or a full new research run
- **Background execution** — navigate away from a running session and come back; the WebSocket connection isn't tied to the page component
- **Concurrent sessions** — up to 2 research runs active simultaneously, with sidebar indicators
- **Session persistence** — reports and conversation threads survive page refreshes and server restarts
- **JWT authentication** — access token in memory only; refresh token in httpOnly cookie
- **Credit system** — 5 credits per pipeline run, 1 credit per reasoning follow-up
- **SSRF protection** — every fetched URL is validated against private/internal IP ranges
- **Prompt injection containment** — all fetched web content is explicitly tagged as untrusted before reaching the LLM
