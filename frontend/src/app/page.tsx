import Link from "next/link"
import { ArrowRight, Zap, Shield, BarChart3, Users, GitBranch } from "lucide-react"

// Static marketing page — no auth, no client state.
// Shown to everyone, including unauthenticated visitors.

const AGENT_STEPS = [
  { id: "planner", label: "Planner", color: "text-white", bg: "bg-white/10", desc: "Decomposes your question into 3 independent research angles" },
  { id: "researcher", label: "Researcher ×3", color: "text-blue-400", bg: "bg-blue-500/10", desc: "Three agents research in parallel — no cross-contamination" },
  { id: "critic", label: "Critic", color: "text-amber-400", bg: "bg-amber-500/10", desc: "Stress-tests findings for contradictions and weak claims" },
  { id: "synthesizer", label: "Synthesizer", color: "text-emerald-400", bg: "bg-emerald-500/10", desc: "Assembles a structured report with confidence ratings" },
]

const PAIN_POINTS = [
  {
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    title: "One query, multiple angles",
    body: "Every Chorus run launches 3 independent researchers so you get breadth, not just depth.",
  },
  {
    icon: <Shield className="w-5 h-5 text-amber-400" />,
    title: "Built-in adversarial review",
    body: "A dedicated Critic agent challenges every finding before it reaches the report — contradictions and weak claims are surfaced explicitly.",
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-emerald-400" />,
    title: "Structured, not a wall of text",
    body: "Reports show key findings with confidence levels, contested points with both sides, and clickable sources — not a pile of paragraphs.",
  },
  {
    icon: <Users className="w-5 h-5 text-purple-400" />,
    title: "Follow up, don't start over",
    body: "Ask follow-up questions inside the same session. Chorus routes reasoning questions instantly and only spins up a new pipeline when the topic truly branches.",
  },
]

const STACK = [
  "LangGraph", "Groq / Llama 3", "Tavily", "FastAPI", "Next.js 16", "Tailwind v4",
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ------------------------------------------------------------------ */}
      {/* Nav                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <span className="text-lg font-bold tracking-tight">Chorus</span>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="text-sm bg-white text-zinc-950 font-semibold px-4 py-1.5 rounded-lg hover:bg-white/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="pt-32 pb-24 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-block text-xs font-mono text-white/40 border border-white/10 rounded-full px-3 py-1 mb-2">
            Multi-agent AI research
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Multiple minds,<br />
            <span className="text-white/50">one answer.</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            Chorus sends parallel AI researchers to investigate your question from different
            angles, pits them against a Critic, and synthesizes a structured report with
            confidence ratings and cited sources.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 bg-white text-zinc-950 font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
            >
              Start researching <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/signin"
              className="text-sm text-white/50 hover:text-white border border-white/10 px-6 py-3 rounded-xl transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Agent pipeline preview */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="flex flex-col gap-2">
            {AGENT_STEPS.map((step, i) => (
              <div
                key={step.id}
                className="flex items-center gap-4 border border-white/8 rounded-xl px-5 py-4 bg-white/3 text-left"
              >
                <div className={`text-xs font-mono font-semibold px-2 py-1 rounded ${step.bg} ${step.color} shrink-0 w-32 text-center`}>
                  {step.label}
                </div>
                <p className="text-sm text-white/50">{step.desc}</p>
                {i < AGENT_STEPS.length - 1 && (
                  <div className="ml-auto text-white/20 text-lg shrink-0">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* For knowledge workers                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">For knowledge workers</p>
            <h2 className="text-3xl font-bold">Research that challenges itself</h2>
            <p className="text-white/40 mt-3 max-w-xl mx-auto">
              Most AI tools give you one opinion. Chorus gives you three independent investigations,
              then stress-tests them before you see a word.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="border border-white/8 rounded-2xl p-6 bg-white/3 space-y-3">
                <div className="flex items-center gap-2">
                  {p.icon}
                  <h3 className="font-semibold text-sm">{p.title}</h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* For developers                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">For developers</p>
            <h2 className="text-3xl font-bold">Open architecture</h2>
            <p className="text-white/40 mt-3 max-w-xl mx-auto">
              LangGraph fan-out, live token streaming over WebSocket, typed Pydantic contracts
              end-to-end — built to be understood, extended, and forked.
            </p>
          </div>

          {/* Pipeline diagram */}
          <div className="font-mono text-xs text-white/40 border border-white/8 rounded-2xl p-6 bg-black/30 mb-8 overflow-x-auto">
            <pre className="whitespace-pre">{`question
   │
   ▼
planner ─────────────────────────── (fast_llm: Llama 3.1 8B)
   │
   ├─── researcher_0 ───┐
   ├─── researcher_1 ───┤ parallel  (smart_llm: Llama 3.3 70B + Tavily)
   └─── researcher_2 ───┘
              │
              ▼
           critic ──────────────────── (smart_llm: Llama 3.3 70B)
              │
              ▼
        synthesizer ────────────────── (smart_llm: Llama 3.3 70B)
              │
              ▼
           report`}</pre>
          </div>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {STACK.map((tech) => (
              <span
                key={tech}
                className="text-xs font-mono border border-white/10 rounded-full px-3 py-1 text-white/50"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="flex justify-center">
            <a
              href="https://github.com"
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-xl px-5 py-2.5 transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Final CTA                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-xl mx-auto space-y-5">
          <h2 className="text-3xl font-bold">Ready to research?</h2>
          <p className="text-white/40">
            Free tier includes 20 research credits per day. No credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-white text-zinc-950 font-semibold px-8 py-3 rounded-xl hover:bg-white/90 transition-colors"
          >
            Create free account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-white/5 px-6 py-8 text-center">
        <p className="text-xs text-white/20">
          Chorus · Multi-agent AI research platform · Built with LangGraph, Groq, and Next.js
        </p>
      </footer>
    </div>
  )
}
