"use client"

import { motion } from "framer-motion"
import type { Citation, Finding } from "@/types/events"

// Fixed: separate border field with raw rgba values to avoid CSS-var opacity-suffix bug
const CONFIDENCE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  high: { bg: "rgba(143,203,170,0.12)", color: "var(--chorus-green)", border: "rgba(143,203,170,0.4)" },
  medium: { bg: "rgba(201,162,74,0.12)", color: "var(--chorus-gold)", border: "rgba(201,162,74,0.4)" },
  low: { bg: "rgba(239,68,68,0.10)", color: "#ef4444", border: "rgba(239,68,68,0.4)" },
}

interface FindingCardProps {
  finding: Finding
  index: number
  allSources: Citation[]
}

export function FindingCard({ finding, index, allSources }: FindingCardProps) {
  const sourceIndex = new Map(allSources.map((s, i) => [s.url, i + 1]))
  const refNumbers = finding.citations
    .map((c) => sourceIndex.get(c.url))
    .filter((n): n is number => n !== undefined)

  const badge = CONFIDENCE_STYLE[finding.confidence] ?? CONFIDENCE_STYLE.medium

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="space-y-3 rounded p-5"
      style={{
        background: "var(--chorus-surface)",
        border: "1px solid var(--chorus-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs" style={{ color: "var(--chorus-border)" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className="rounded px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase"
          style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
        >
          {finding.confidence}
        </span>
      </div>

      <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--chorus-text)" }}>
        {finding.claim}
      </p>

      <p className="text-xs leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
        {finding.support}
      </p>

      {refNumbers.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 pt-1"
          style={{ borderTop: "1px solid var(--chorus-border)" }}
        >
          <span className="font-mono text-[10px]" style={{ color: "var(--chorus-border)" }}>
            Sources:
          </span>
          {refNumbers.map((n) => (
            <span
              key={n}
              className="rounded border px-1.5 py-0.5 font-mono text-[10px]"
              style={{ borderColor: "var(--chorus-border)", color: "var(--chorus-muted)" }}
            >
              [{n}]
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
