"use client"

import { motion } from "framer-motion"
import type { Citation, Finding } from "@/types/events"

// Confidence badge styles — matches the design system used in AgentCard role badges
const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-red-500/15 text-red-400 border-red-500/30",
}

interface FindingCardProps {
  finding: Finding
  index: number
  // All report sources passed in so we can show [1] [2] source reference numbers
  // instead of raw URLs. We cross-reference by URL to find the correct index.
  allSources: Citation[]
}

export function FindingCard({ finding, index, allSources }: FindingCardProps) {
  // Map every source URL to its position number (1-based) in the master source list
  const sourceIndex = new Map(allSources.map((s, i) => [s.url, i + 1]))

  // Find which source numbers this finding's citations correspond to
  const refNumbers = finding.citations
    .map((c) => sourceIndex.get(c.url))
    .filter((n): n is number => n !== undefined)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="border border-white/8 rounded-xl p-5 bg-white/3 space-y-3"
    >
      {/* Row: index number + confidence badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-white/20">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CONFIDENCE_STYLES[finding.confidence]}`}
        >
          {finding.confidence}
        </span>
      </div>

      {/* Claim — the headline assertion */}
      <p className="text-sm font-medium text-white leading-relaxed">
        {finding.claim}
      </p>

      {/* Support — the evidence explanation */}
      <p className="text-xs text-white/50 leading-relaxed">
        {finding.support}
      </p>

      {/* Source reference tags — e.g. [1] [3] */}
      {refNumbers.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pt-1 border-t border-white/5">
          <span className="text-[10px] text-white/20">Sources:</span>
          {refNumbers.map((n) => (
            <span
              key={n}
              className="text-[10px] font-mono text-white/30 border border-white/10 rounded px-1.5 py-0.5"
            >
              [{n}]
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
