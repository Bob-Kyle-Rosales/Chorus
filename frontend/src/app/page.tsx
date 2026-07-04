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
                <p className="text-base leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
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

          <ArchitectureDiagram />
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

// ── Architecture flow diagram ───────────────────────────────────────────────
function ArchitectureDiagram() {
  const W = 640
  const H = 420
  const border = "#2a3644"
  const surface = "#141e2e"
  const gold = "#c9a24a"
  const muted = "#c3b795"
  const faint = "#c3b79540"

  // Box dimensions
  const plannerW = 180; const plannerH = 40
  const plannerX = (W - plannerW) / 2; const plannerY = 40

  const resW = 150; const resH = 40
  const resY = 160
  const resX = [40, (W - resW) / 2, W - 40 - resW]

  const criticW = 180; const criticH = 40
  const criticX = (W - criticW) / 2; const criticY = 280

  const synthW = 180; const synthH = 40
  const synthX = (W - synthW) / 2; const synthY = 360

  // Connection y helpers
  const plannerBottom = plannerY + plannerH
  const resTop = resY
  const resBottom = resY + resH
  const criticTop = criticY
  const criticBottom = criticY + criticH
  const synthTop = synthY

  // Fan-out y and fan-in y
  const fanOutY = plannerBottom + (resTop - plannerBottom) / 2
  const fanInY = resBottom + (criticTop - resBottom) / 2

  // Center-x of each researcher
  const resCX = resX.map((x) => x + resW / 2)
  const plannerCX = plannerX + plannerW / 2
  const criticCX = criticX + criticW / 2
  const synthCX = synthX + synthW / 2

  const lineProps = { stroke: border, strokeWidth: 1 }
  const arrowHead = (x: number, y: number) => (
    <polygon points={`${x},${y} ${x - 4},${y - 7} ${x + 4},${y - 7}`} fill={border} />
  )

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, display: "block", margin: "0 auto" }}
        aria-label="Chorus agent pipeline architecture"
      >
        {/* ── Input label ── */}
        <text x={plannerCX} y={24} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={muted}>
          question
        </text>
        {/* Question → Planner */}
        <line x1={plannerCX} y1={28} x2={plannerCX} y2={plannerY} {...lineProps} />
        {arrowHead(plannerCX, plannerY)}

        {/* ── Planner box ── */}
        <rect x={plannerX} y={plannerY} width={plannerW} height={plannerH} rx={3} fill={surface} stroke={gold} strokeWidth={1.5} />
        <text x={plannerCX} y={plannerY + 15} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={muted} letterSpacing={1}>PLANNER</text>
        <text x={plannerCX} y={plannerY + 29} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={border}>Llama 3.1 8B</text>

        {/* Planner → fan-out horizontal */}
        <line x1={plannerCX} y1={plannerBottom} x2={plannerCX} y2={fanOutY} {...lineProps} />
        <line x1={resCX[0]} y1={fanOutY} x2={resCX[2]} y2={fanOutY} {...lineProps} />
        {/* Down to each researcher */}
        {resCX.map((cx) => (
          <g key={cx}>
            <line x1={cx} y1={fanOutY} x2={cx} y2={resTop} {...lineProps} />
            {arrowHead(cx, resTop)}
          </g>
        ))}

        {/* ── Researcher boxes ── */}
        {resX.map((x, i) => {
          const cx = resCX[i]
          const colors = [
            { stroke: "#7fb8d8", label: "RESEARCHER I" },
            { stroke: "#8fcbaa", label: "RESEARCHER II" },
            { stroke: "#c98aa8", label: "RESEARCHER III" },
          ]
          return (
            <g key={i}>
              <rect x={x} y={resY} width={resW} height={resH} rx={3} fill={surface} stroke={colors[i].stroke} strokeWidth={1} />
              <text x={cx} y={resY + 15} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={colors[i].stroke} letterSpacing={0.5}>
                {colors[i].label}
              </text>
              <text x={cx} y={resY + 29} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={border}>
                70B · Tavily
              </text>
            </g>
          )
        })}

        {/* Parallel brace label */}
        <text x={plannerCX} y={fanOutY + 12} textAnchor="middle" fontSize={8} fontFamily="monospace" fill={faint}>
          parallel
        </text>

        {/* Fan-in from researchers → Critic */}
        {resCX.map((cx) => (
          <line key={cx} x1={cx} y1={resBottom} x2={cx} y2={fanInY} {...lineProps} />
        ))}
        <line x1={resCX[0]} y1={fanInY} x2={resCX[2]} y2={fanInY} {...lineProps} />
        <line x1={criticCX} y1={fanInY} x2={criticCX} y2={criticTop} {...lineProps} />
        {arrowHead(criticCX, criticTop)}

        {/* ── Critic box ── */}
        <rect x={criticX} y={criticY} width={criticW} height={criticH} rx={3} fill={surface} stroke={gold} strokeWidth={1.5} />
        <text x={criticCX} y={criticY + 15} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={muted} letterSpacing={1}>CRITIC</text>
        <text x={criticCX} y={criticY + 29} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={border}>Llama 3.3 70B</text>

        {/* Critic → Synthesizer */}
        <line x1={criticCX} y1={criticBottom} x2={synthCX} y2={synthTop} {...lineProps} />
        {arrowHead(synthCX, synthTop)}

        {/* ── Synthesizer box ── */}
        <rect x={synthX} y={synthY} width={synthW} height={synthH} rx={3} fill={surface} stroke={gold} strokeWidth={1.5} />
        <text x={synthCX} y={synthY + 15} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={muted} letterSpacing={1}>SYNTHESIZER</text>
        <text x={synthCX} y={synthY + 29} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={border}>Llama 3.3 70B</text>

        {/* Synthesizer → Report */}
        <line x1={synthCX} y1={synthY + synthH} x2={synthCX} y2={H - 24} {...lineProps} />
        {arrowHead(synthCX, H - 24)}
        <text x={synthCX} y={H - 8} textAnchor="middle" fontSize={11} fontFamily="monospace" fill={gold}>
          report
        </text>
      </svg>
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
