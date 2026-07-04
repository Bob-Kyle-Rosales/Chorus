"use client"

import { motion } from "framer-motion"
import type { AnglePlan } from "@/types/events"

// Per-researcher color accent — blue / green / pink
const ANGLE_ACCENTS = [
  { var: "var(--chorus-blue)",  hex: "#7fb8d8" },
  { var: "var(--chorus-green)", hex: "#8fcbaa" },
  { var: "var(--chorus-pink)",  hex: "#c98aa8" },
]

const RESEARCHER_LABELS = ["Researcher I", "Researcher II", "Researcher III"]

interface AnglePreviewProps {
  question: string
  angles: AnglePlan[]
  onBack: () => void
  onConfirm: () => void
  loading: boolean
}

export function AnglePreview({ question, angles, onBack, onConfirm, loading }: AnglePreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-2xl space-y-6"
    >
      {/* Question echo */}
      <div>
        <p
          className="mb-1 font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--chorus-border)" }}
        >
          Your question
        </p>
        <p
          className="text-sm leading-relaxed italic"
          style={{ color: "var(--chorus-muted)", fontFamily: "var(--font-sans)" }}
        >
          {question}
        </p>
      </div>

      {/* Angle cards */}
      <div className="space-y-3">
        <p
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--chorus-border)" }}
        >
          Research plan
        </p>
        {angles.map((angle, i) => {
          const accent = ANGLE_ACCENTS[i] ?? { var: "var(--chorus-muted)", hex: "#c3b795" }
          return (
            <motion.div
              key={angle.angle_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.07 }}
              className="flex items-start gap-4 rounded px-5 py-4"
              style={{
                background: "var(--chorus-surface)",
                border: "1px solid var(--chorus-border)",
                borderLeft: `3px solid ${accent.var}`,
              }}
            >
              {/* Researcher label badge */}
              <span
                className="mt-0.5 shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-medium"
                style={{
                  color: accent.var,
                  background: `${accent.hex}18`,
                  border: `1px solid ${accent.hex}40`,
                }}
              >
                {RESEARCHER_LABELS[i] ?? `Researcher ${i + 1}`}
              </span>

              <div className="min-w-0 space-y-1">
                <p
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--chorus-muted)" }}
                >
                  {angle.angle_id.replace(/_/g, " ")}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--chorus-text)" }}
                >
                  {angle.brief}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={loading}
          className="rounded border px-4 py-2.5 text-sm transition-opacity hover:opacity-80 disabled:opacity-30"
          style={{
            borderColor: "var(--chorus-border)",
            color: "var(--chorus-muted)",
          }}
        >
          ← Back
        </button>

        <button
          onClick={onConfirm}
          disabled={loading}
          className="ml-auto rounded px-5 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ background: "var(--chorus-gold)", color: "var(--chorus-bg)" }}
        >
          {loading ? (
            "Starting…"
          ) : (
            <>Begin research · 5 ◉</>
          )}
        </button>
      </div>
    </motion.div>
  )
}
