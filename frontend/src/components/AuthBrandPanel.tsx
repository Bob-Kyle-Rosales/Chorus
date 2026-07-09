"use client"

import { PipelineViz } from "@/components/PipelineViz"

interface AuthBrandPanelProps {
  variant: "signin" | "signup"
}

export function AuthBrandPanel({ variant }: AuthBrandPanelProps) {
  return (
    <div
      className="hidden flex-1 flex-col justify-center gap-8 border-r px-16 py-16 md:flex"
      style={{ borderColor: "var(--chorus-border)" }}
    >
      <p
        className="font-mono text-sm uppercase tracking-[0.15em]"
        style={{ color: "var(--chorus-muted)" }}
      >
        Multi-agent AI research
      </p>

      <PipelineViz maxWidth={680} />

      {variant === "signup" ? (
        <div className="flex flex-col gap-3">
          <span
            className="self-start rounded px-3.5 py-2 font-mono text-base"
            style={{
              color: "var(--chorus-gold)",
              background: "rgba(201,162,74,0.1)",
              border: "1px solid rgba(201,162,74,0.3)",
            }}
          >
            Free tier · 20 ◉ credits / day
          </span>
          <h2
            className="text-5xl leading-tight"
            style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
          >
            Multiple voices,
            <br />
            <em style={{ color: "var(--chorus-gold)" }}>one truth.</em>
          </h2>
          <div className="flex flex-col gap-2">
            <p className="text-lg leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
              ✓ Parallel researchers investigate independently
            </p>
            <p className="text-lg leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
              ✓ A Critic challenges every finding before synthesis
            </p>
            <p className="text-lg leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
              ✓ Cited, structured reports — not just prose
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2
            className="text-4xl"
            style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
          >
            Built to be understood.
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
            Critique-before-synthesis is enforced at the graph level, not a prompt
            instruction — every report you read has already been challenged before
            it reached you.
          </p>
        </div>
      )}
    </div>
  )
}
