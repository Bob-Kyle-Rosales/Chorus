# Chorus — Frontend

Next.js frontend for Chorus, a multi-agent AI research platform. Users ask a question, watch parallel AI researchers investigate it live over WebSocket, and continue the conversation with follow-up questions once the report is ready.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI library | React 19 |
| Styling | Tailwind CSS v4 (CSS-based config, no `tailwind.config.ts`) |
| Components | shadcn/ui |
| State management | Zustand |
| Animation | Framer Motion |
| Icons | Lucide React |
| Markdown rendering | react-markdown + rehype-highlight |
| Package manager | pnpm |
| Formatting | Prettier + `prettier-plugin-tailwindcss` |
| Linting | ESLint (eslint-config-next) |

---

## Quick Setup

### 1. Install dependencies

```bash
cd frontend
pnpm install
```

### 2. Configure environment

Create `frontend/.env.local` (optional — defaults point at `localhost:8000`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 3. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other commands

```bash
pnpm build           # production build (also runs the TypeScript check)
pnpm lint            # ESLint
pnpm format          # Prettier — format all src/**/*.{ts,tsx}
pnpm format:check    # Prettier — check formatting without writing (CI-friendly)
```

---

## Architecture

### Route map

```
/                          marketing landing page (public, static)
/auth/signin               sign in
/auth/signup               sign up (first name, last name, email, password)

/home                      research home — protected, behind (research) route group
/run/[id]                  conversation thread for one session — protected

(research)/layout.tsx wraps /home and /run/[id]:
  - checks for a valid access token, silently refreshes via httpOnly cookie if missing
  - redirects to /auth/signin on failure
  - renders the persistent SessionSidebar alongside the page content
```

### Research intake flow

```
/home
  │
  ├── type a question → "Plan research"
  │       │
  │       ▼
  │   POST /sessions/preview          (planner runs, 0 credits — shows 3 angle cards)
  │
  ├── review angles → "Start research"
  │       │
  │       ▼
  │   POST /sessions                  (session created, 5 credits deducted)
  │       │
  │       ▼
  │   WebSocket opened HERE, before navigation — stored in Zustand
  │       │
  │       ▼
  │   router.push("/run/{session_id}")
  │
  ▼
/run/[id]   ← pure VIEW of the session's state in the store; does not own the
              WebSocket connection, so research continues if the user navigates away
```

### State management — Zustand stores

```
useAuthStore            user, accessToken (in-memory only — never localStorage)

useSessionStore
  ├── sessions[]                     session list for the sidebar
  ├── currentSessionId               which session's run page is mounted (sidebar highlight)
  ├── credits                        current balance
  ├── runStates: Record<id, ...>     PER-SESSION pipeline state — agents, report,
  │                                   conversation thread, follow-up status
  └── activeConnections: Record<id, WebSocket>
                                      live WebSocket handles, keyed by session ID —
                                      kept alive across navigation for background runs
```

Each session has fully isolated run state. Two pipeline runs (e.g. one original run finishing in the background while a second session is being viewed) never mix agent data, because every event handler is parameterized by `sessionId`.

### WebSocket lifecycle (background execution)

```
home/page.tsx                          run/[id]/page.tsx
     │                                       │
     ├── ws = createRunSocket(...)           │
     ├── addConnection(sessionId, ws) ───────┤  (stored in Zustand, not useRef)
     ├── router.push("/run/{id}") ──────────▶│
     │                                       │  mounts — reads runStates[id] from
     │                                       │  the store, does NOT open a new WS
     │                                       │
     │         user navigates away           │
     │◀──────────────────────────────────────┤  unmounts — WebSocket is NOT closed
     │                                       │
     │   events keep flowing into the        │
     │   store while no run page is mounted  │
     │                                       │
     │         user navigates back           │
     │                                       │
     │                                       ▼
     │                              remounts — reads current (possibly
     │                              now-complete) state from the store
```

A WebSocket is only removed from `activeConnections` when the run completes, errors, or the server closes it — never on component unmount. This is what lets the session sidebar show a pulsing indicator for runs still in progress elsewhere.

### Conversation thread — message types

```
ConversationMessage =
  | UserMessage        plain follow-up question, right-aligned bubble
  | ReasoningMessage    Chorus answers from existing findings — "· reasoning · 1 ◉"
  | PipelineMessage     Chorus runs a new full pipeline — "· new research · 5 ◉"
                        (collapsible live agent panel + ReportView once done)
```

Follow-up routing is decided entirely by the backend (`route_followup`) — the frontend just submits the question and renders whichever response type comes back.

### Source layout

```
src/
├── app/
│   ├── page.tsx                    marketing landing page
│   ├── layout.tsx                  root layout, metadata
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   └── (research)/                 route group — protected by layout.tsx
│       ├── layout.tsx               auth guard + SessionSidebar shell
│       ├── home/page.tsx            3-step research intake flow
│       └── run/[id]/page.tsx        conversation thread (pure view of store state)
│
├── components/
│   ├── AgentCard.tsx                 full agent card — original run
│   ├── MiniAgentCard.tsx              compact agent row — follow-up pipeline
│   ├── AnglePreview.tsx               3 angle cards before committing to a run
│   ├── SessionSidebar.tsx             session list, credits, active-run indicator
│   ├── ConversationThread.tsx         scrollable thread, auto-scrolls on new messages
│   ├── FollowUpInput.tsx              always-visible input, 4 disabled states
│   ├── ReasoningResponse.tsx          reasoning-type Chorus reply
│   ├── PipelineFollowUp.tsx           pipeline-type Chorus reply + collapsible agents
│   ├── ReportView.tsx                 structured report container
│   ├── FindingCard.tsx                 single finding + confidence badge
│   ├── ContestedPoint.tsx              disagreement between researchers
│   ├── SourcesList.tsx                 numbered, clickable sources
│   ├── CreditCounter.tsx / CreditWarning.tsx / ConcurrentRunWarning.tsx
│   └── ui/                            shadcn/ui primitives (badge, button, card, input)
│
├── lib/
│   ├── store.ts                      useAuthStore, useSessionStore (Zustand)
│   ├── api.ts                         typed fetch wrapper — auto-attaches access token,
│   │                                   retries once on 401 via silent refresh
│   ├── websocket.ts                   createRunSocket() — opens a typed WS connection
│   └── utils.ts                       shared helpers (e.g. shadcn's `cn()`)
│
└── types/
    └── events.ts                      ServerEvent union, Report, Session, ConversationMessage
```

---

## Included Features

- **3-step research intake** — question → angle preview (review before spending credits) → confirmed run
- **Live agent streaming** — token-by-token reasoning rendered in real time as each researcher works
- **Structured report view** — confidence-rated findings, explicitly surfaced contested points, numbered clickable sources
- **Follow-up conversations** — ask questions about a finished report; routed automatically to a fast reasoning answer or a full new research run
- **Background research** — navigate away from a running session and come back to see live progress; the WebSocket connection isn't tied to the page component
- **Concurrent sessions** — run up to 2 research sessions at once, with sidebar indicators showing which are still active
- **Session sidebar** — auto-named sessions (generated after the report completes), most-recent-first, click to resume any conversation
- **Authentication** — sign up / sign in with JWT; access token kept in memory only (not localStorage) to limit XSS exposure, refresh token in an httpOnly cookie
- **Session persistence** — refreshing the page or returning later rehydrates the full report and conversation thread from the backend
- **Credit system UI** — live balance display, pre-spend warnings before costly actions, blocked actions when balance is insufficient
- **Responsive dark UI** — built with Tailwind v4 and shadcn/ui, animated transitions via Framer Motion
