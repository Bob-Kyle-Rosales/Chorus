import Link from "next/link"
import { ArrowRight, Zap, Shield, BarChart3, Users, GitBranch } from "lucide-react"

// Static marketing page — no auth, no client state.
// Shown to everyone, including unauthenticated visitors.

const AGENT_STEPS = [
  {
    id: "planner",
    label: "Planner",
    color: "text-white",
    bg: "bg-white/10",
    desc: "Decomposes your question into 3 independent research angles",
  },
  {
    id: "researcher",
    label: "Researcher ×3",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    desc: "Three agents research in parallel — no cross-contamination",
  },
  {
    id: "critic",
    label: "Critic",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    desc: "Stress-tests findings for contradictions and weak claims",
  },
  {
    id: "synthesizer",
    label: "Synthesizer",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    desc: "Assembles a structured report with confidence ratings",
  },
]

const PAIN_POINTS = [
  {
    icon: <Zap className="h-5 w-5 text-blue-400" />,
    title: "One query, multiple angles",
    body: "Every Chorus run launches 3 independent researchers so you get breadth, not just depth.",
  },
  {
    icon: <Shield className="h-5 w-5 text-amber-400" />,
    title: "Built-in adversarial review",
    body: "A dedicated Critic agent challenges every finding before it reaches the report — contradictions and weak claims are surfaced explicitly.",
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-emerald-400" />,
    title: "Structured, not a wall of text",
    body: "Reports show key findings with confidence levels, contested points with both sides, and clickable sources — not a pile of paragraphs.",
  },
  {
    icon: <Users className="h-5 w-5 text-purple-400" />,
    title: "Follow up, don't start over",
    body: "Ask follow-up questions inside the same session. Chorus routes reasoning questions instantly and only spins up a new pipeline when the topic truly branches.",
  },
]

const STACK = ["LangGraph", "Groq / Llama 3", "Tavily", "FastAPI", "Next.js 16", "Tailwind v4"]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ------------------------------------------------------------------ */}
      {/* Nav                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <nav className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between border-b border-white/5 bg-zinc-950/80 px-6 py-4 backdrop-blur-md">
        <span className="text-lg font-bold tracking-tight">Chorus</span>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="px-3 py-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/90"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-6 pt-32 pb-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="mb-2 inline-block rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-white/40">
            Multi-agent AI research
          </div>
          <h1 className="text-5xl leading-tight font-bold tracking-tight sm:text-6xl">
            Multiple minds,
            <br />
            <span className="text-white/50">one answer.</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-white/50">
            Chorus sends parallel AI researchers to investigate your question from different angles,
            pits them against a Critic, and synthesizes a structured report with confidence ratings
            and cited sources.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-zinc-950 transition-colors hover:bg-white/90"
            >
              Start researching <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/signin"
              className="rounded-xl border border-white/10 px-6 py-3 text-sm text-white/50 transition-colors hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Agent pipeline preview */}
        <div className="mx-auto mt-16 max-w-2xl">
          <div className="flex flex-col gap-2">
            {AGENT_STEPS.map((step, i) => (
              <div
                key={step.id}
                className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/3 px-5 py-4 text-left"
              >
                <div
                  className={`rounded px-2 py-1 font-mono text-xs font-semibold ${step.bg} ${step.color} w-32 shrink-0 text-center`}
                >
                  {step.label}
                </div>
                <p className="text-sm text-white/50">{step.desc}</p>
                {i < AGENT_STEPS.length - 1 && (
                  <div className="ml-auto shrink-0 text-lg text-white/20">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* For knowledge workers                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="mb-3 font-mono text-xs tracking-widest text-white/30 uppercase">
              For knowledge workers
            </p>
            <h2 className="text-3xl font-bold">Research that challenges itself</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/40">
              Most AI tools give you one opinion. Chorus gives you three independent investigations,
              then stress-tests them before you see a word.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {PAIN_POINTS.map((p) => (
              <div
                key={p.title}
                className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-6"
              >
                <div className="flex items-center gap-2">
                  {p.icon}
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-white/50">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* For developers                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="mb-3 font-mono text-xs tracking-widest text-white/30 uppercase">
              For developers
            </p>
            <h2 className="text-3xl font-bold">Open architecture</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/40">
              LangGraph fan-out, live token streaming over WebSocket, typed Pydantic contracts
              end-to-end — built to be understood, extended, and forked.
            </p>
          </div>

          {/* Pipeline diagram */}
          <div className="mb-8 overflow-x-auto rounded-2xl border border-white/8 bg-black/30 p-6 font-mono text-xs text-white/40">
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
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-white/50"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="flex justify-center">
            <a
              href="https://github.com"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/40 transition-colors hover:text-white/70"
            >
              <GitBranch className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Final CTA                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-white/5 px-6 py-24 text-center">
        <div className="mx-auto max-w-xl space-y-5">
          <h2 className="text-3xl font-bold">Ready to research?</h2>
          <p className="text-white/40">
            Free tier includes 20 research credits per day. No credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-semibold text-zinc-950 transition-colors hover:bg-white/90"
          >
            Create free account <ArrowRight className="h-4 w-4" />
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
