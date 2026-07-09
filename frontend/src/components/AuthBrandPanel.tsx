"use client"

import { AGENT_ACCENT, AGENT_LABEL } from "@/lib/agentDisplay"

// Matches the pipeline's actual execution order (see backend/src/chorus/graph/graph.py):
// planner fans out to the three researchers, which fan in to critic, then synthesizer.
const PIPELINE_ORDER = [
  "planner",
  "researcher_0",
  "researcher_1",
  "researcher_2",
  "critic",
  "synthesizer",
]

function PipelineBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PIPELINE_ORDER.map((agentId, i) => (
        <span key={agentId} className="flex items-center gap-2">
          <span
            className="rounded px-2.5 py-1 font-mono text-xs"
            style={{ color: AGENT_ACCENT[agentId], border: `1px solid ${AGENT_ACCENT[agentId]}` }}
          >
            {AGENT_LABEL[agentId]}
          </span>
          {i < PIPELINE_ORDER.length - 1 && (
            <span style={{ color: "var(--chorus-muted)" }}>→</span>
          )}
        </span>
      ))}
    </div>
  )
}

interface AuthBrandPanelProps {
  variant: "signin" | "signup"
}

export function AuthBrandPanel({ variant }: AuthBrandPanelProps) {
  return (
    <div
      className="hidden flex-1 flex-col justify-center gap-6 border-r px-16 py-16 md:flex"
      style={{ borderColor: "var(--chorus-border)" }}
    >
      <p
        className="font-mono text-xs uppercase tracking-[0.15em]"
        style={{ color: "var(--chorus-muted)" }}
      >
        Multi-agent AI research
      </p>

      <PipelineBadges />

      {variant === "signup" ? (
        <>
          <span
            className="mt-2 self-start rounded px-3 py-1.5 font-mono text-sm"
            style={{
              color: "var(--chorus-gold)",
              background: "rgba(201,162,74,0.1)",
              border: "1px solid rgba(201,162,74,0.3)",
            }}
          >
            Free tier · 20 ◉ credits / day
          </span>
          <h2
            className="text-4xl leading-tight"
            style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
          >
            Multiple voices,
            <br />
            <em style={{ color: "var(--chorus-gold)" }}>one truth.</em>
          </h2>
          <div className="mt-2 flex flex-col gap-4">
            <p className="text-base leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
              ✓ Parallel researchers investigate independently
            </p>
            <p className="text-base leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
              ✓ A Critic challenges every finding before synthesis
            </p>
            <p className="text-base leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
              ✓ Cited, structured reports — not just prose
            </p>
          </div>
        </>
      ) : (
        <>
          <h2
            className="mt-2 text-3xl"
            style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
          >
            Built to be understood.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
            Critique-before-synthesis is enforced at the graph level, not a prompt
            instruction — every report you read has already been challenged before
            it reached you.
          </p>
        </>
      )}
    </div>
  )
}
