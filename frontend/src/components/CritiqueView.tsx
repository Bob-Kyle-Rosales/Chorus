"use client"

import { motion } from "framer-motion"
import type { Critique } from "@/types/events"

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--chorus-muted)" }}>
      {children}
    </p>
  )
}

// Surfaces the Critic agent's pass explicitly — contradictions, weak claims,
// and gaps — rather than leaving them folded invisibly into the Synthesizer's
// prose. Renders nothing if the Critic found nothing worth flagging.
export function CritiqueView({ critique }: { critique: Critique }) {
  const hasContent =
    critique.contradictions.length > 0 || critique.weak_claims.length > 0 || critique.gaps.length > 0

  if (!hasContent) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <span
          className="shrink-0 font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--chorus-muted)" }}
        >
          Critic
        </span>
        <div className="flex-1" style={{ borderTop: "1px solid var(--chorus-border)" }} />
      </div>

      {critique.contradictions.length > 0 && (
        <div className="space-y-3">
          <Eyebrow>Contradictions · {critique.contradictions.length}</Eyebrow>
          <div className="space-y-3">
            {critique.contradictions.map((c, i) => (
              <div
                key={i}
                className="space-y-3 rounded p-4"
                style={{
                  background: "var(--chorus-surface)",
                  border: "1px solid var(--chorus-border)",
                  borderLeft: "3px solid var(--chorus-pink)",
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="text-sm leading-relaxed" style={{ color: "var(--chorus-text)" }}>
                    {c.claim_a}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--chorus-text)" }}>
                    {c.claim_b}
                  </p>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--chorus-muted)", borderTop: "1px solid var(--chorus-border)", paddingTop: "0.75rem" }}
                >
                  {c.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {critique.weak_claims.length > 0 && (
        <div className="space-y-3">
          <Eyebrow>Weak claims · {critique.weak_claims.length}</Eyebrow>
          <div className="space-y-3">
            {critique.weak_claims.map((w, i) => (
              <div
                key={i}
                className="space-y-1.5 rounded p-4"
                style={{
                  background: "var(--chorus-surface)",
                  border: "1px solid var(--chorus-border)",
                  borderLeft: "3px solid var(--chorus-gold)",
                }}
              >
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--chorus-text)" }}>
                  {w.claim}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
                  {w.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {critique.gaps.length > 0 && (
        <div className="space-y-3">
          <Eyebrow>Gaps · {critique.gaps.length}</Eyebrow>
          <ul className="space-y-2">
            {critique.gaps.map((g, i) => (
              <li
                key={i}
                className="rounded px-4 py-2.5 text-sm leading-relaxed"
                style={{
                  background: "var(--chorus-surface)",
                  border: "1px solid var(--chorus-border)",
                  color: "var(--chorus-muted)",
                }}
              >
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
