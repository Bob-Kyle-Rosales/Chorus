import Link from "next/link"

// Static marketing page — no auth, no client state.

const FEATURES = [
  {
    title: "Parallel investigation",
    body: "Three independent researchers investigate your question simultaneously from different angles — no cross-contamination between agents.",
  },
  {
    title: "Adversarial critique",
    body: "A dedicated Critic agent stress-tests every finding before synthesis. Contradictions and weak claims surface explicitly, not buried in prose.",
  },
  {
    title: "Structured reports",
    body: "Findings come with confidence ratings (high / medium / low), contested points with both sides sourced, and numbered clickable citations.",
  },
  {
    title: "Follow-up without starting over",
    body: "Ask questions inside a finished session. Chorus routes instant reasoning or spins a full new pipeline — you choose based on the question.",
  },
  {
    title: "Live token streaming",
    body: "Every agent's reasoning streams token-by-token to your screen over WebSocket. Watch the thinking, not just the result.",
  },
  {
    title: "Background execution",
    body: "Navigate away from a running session and come back. The WebSocket connection persists — research continues behind the scenes.",
  },
]

const STACK = [
  "LangGraph",
  "Groq · Llama 3",
  "Tavily",
  "FastAPI",
  "Next.js 16",
  "Tailwind v4",
]

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--chorus-bg)", color: "var(--chorus-text)" }}
    >
      {/* ── Nav ── */}
      <nav
        className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          borderBottom: "1px solid var(--chorus-border)",
          background: "rgba(13,20,32,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          className="text-xl tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
        >
          Chorus
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/signin"
            className="text-sm transition-colors"
            style={{ color: "var(--chorus-muted)" }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: "var(--chorus-gold)",
              color: "var(--chorus-bg)",
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="px-8 pt-40 pb-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <p
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: "var(--chorus-muted)" }}
          >
            Multi-agent AI research
          </p>
          <h1
            className="text-6xl leading-tight font-light"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Multiple voices,
            <br />
            <em style={{ color: "var(--chorus-gold)" }}>one truth.</em>
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
            Chorus dispatches parallel AI researchers to investigate your question from independent
            angles, pits them against a dedicated Critic, and synthesizes a structured report with
            confidence ratings and cited sources.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/auth/signup"
              className="rounded px-7 py-3 text-sm font-medium transition-colors"
              style={{ background: "var(--chorus-gold)", color: "var(--chorus-bg)" }}
            >
              Start researching
            </Link>
            <Link
              href="/auth/signin"
              className="rounded border px-7 py-3 text-sm transition-colors"
              style={{ borderColor: "var(--chorus-border)", color: "var(--chorus-muted)" }}
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Staff-line pipeline visualization */}
        <div className="mx-auto mt-20 max-w-2xl">
          <PipelineViz />
        </div>
      </section>

      {/* ── Features grid ── */}
      <section
        className="px-8 py-24"
        style={{ borderTop: "1px solid var(--chorus-border)" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p
              className="mb-3 font-mono text-xs tracking-widest uppercase"
              style={{ color: "var(--chorus-muted)" }}
            >
              Capabilities
            </p>
            <h2
              className="text-4xl font-light"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Research that challenges itself
            </h2>
          </div>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ border: "1px solid var(--chorus-border)", background: "var(--chorus-border)" }}>
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="space-y-3 p-7"
                style={{ background: "var(--chorus-surface)" }}
              >
                <h3
                  className="text-base font-medium"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Developer section ── */}
      <section
        className="px-8 py-24"
        style={{ borderTop: "1px solid var(--chorus-border)" }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p
              className="mb-3 font-mono text-xs tracking-widest uppercase"
              style={{ color: "var(--chorus-muted)" }}
            >
              Open architecture
            </p>
            <h2
              className="text-4xl font-light"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Built to be understood
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
              LangGraph fan-out, live token streaming over WebSocket, typed Pydantic contracts
              end-to-end.
            </p>
          </div>

          <pre
            className="mb-8 overflow-x-auto rounded p-6 font-mono text-xs leading-relaxed"
            style={{
              background: "var(--chorus-surface)",
              border: "1px solid var(--chorus-border)",
              color: "var(--chorus-muted)",
            }}
          >{`question
   │
   ▼
planner ─────────────────────────── Llama 3.1 8B
   │
   ├─── researcher_0 ───┐
   ├─── researcher_1 ───┤  parallel   Llama 3.3 70B + Tavily
   └─── researcher_2 ───┘
              │
              ▼
           critic ──────────────────── Llama 3.3 70B
              │
              ▼
        synthesizer ────────────────── Llama 3.3 70B
              │
              ▼
           report`}</pre>

          <div className="flex flex-wrap justify-center gap-2">
            {STACK.map((tech) => (
              <span
                key={tech}
                className="rounded border px-3 py-1 font-mono text-xs"
                style={{
                  borderColor: "var(--chorus-border)",
                  color: "var(--chorus-muted)",
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="px-8 py-24 text-center"
        style={{ borderTop: "1px solid var(--chorus-border)" }}
      >
        <div className="mx-auto max-w-xl space-y-6">
          <h2
            className="text-4xl font-light"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ready to research?
          </h2>
          <p className="text-sm" style={{ color: "var(--chorus-muted)" }}>
            Free tier includes 20 research credits per day. No credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block rounded px-8 py-3 text-sm font-medium"
            style={{ background: "var(--chorus-gold)", color: "var(--chorus-bg)" }}
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-8 py-8 text-center"
        style={{ borderTop: "1px solid var(--chorus-border)" }}
      >
        <p className="font-mono text-xs" style={{ color: "var(--chorus-border)" }}>
          Chorus · Multi-agent AI research · LangGraph · Groq · Next.js
        </p>
      </footer>
    </div>
  )
}

// ── Staff-line pipeline visualization ──────────────────────────────────────
// Five horizontal SVG lines (like a music staff) with agent nodes
// at their respective horizontal positions.
function PipelineViz() {
  const width = 560
  const height = 160
  const lineColor = "#2a3644"
  const nodeColor = "#c9a24a"
  const textColor = "#c3b795"

  // 5 staff lines at equal vertical spacing
  const lines = [20, 48, 76, 104, 132]

  // Agent nodes: [label, x, y-line-index]
  const nodes: [string, number, number][] = [
    ["Planner", 70, 2],
    ["Researcher I", 210, 1],
    ["Researcher II", 210, 2],
    ["Researcher III", 210, 3],
    ["Critic", 360, 2],
    ["Synthesizer", 490, 2],
  ]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      aria-label="Chorus agent pipeline visualization"
      style={{ maxWidth: width }}
    >
      {/* Staff lines */}
      {lines.map((y) => (
        <line key={y} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={1} />
      ))}

      {/* Connector lines between agent groups */}
      {/* Planner → Researchers */}
      <line x1={110} y1={lines[2]} x2={175} y2={lines[1]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={110} y1={lines[2]} x2={175} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={110} y1={lines[2]} x2={175} y2={lines[3]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      {/* Researchers → Critic */}
      <line x1={265} y1={lines[1]} x2={320} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={265} y1={lines[2]} x2={320} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      <line x1={265} y1={lines[3]} x2={320} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
      {/* Critic → Synthesizer */}
      <line x1={400} y1={lines[2]} x2={450} y2={lines[2]} stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />

      {/* Agent nodes */}
      {nodes.map(([label, x, lineIdx]) => {
        const y = lines[lineIdx]
        return (
          <g key={label} transform={`translate(${x},${y})`}>
            <circle r={5} fill={nodeColor} />
            <text
              y={-10}
              textAnchor="middle"
              fontSize={9}
              fill={textColor}
              fontFamily="monospace"
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
