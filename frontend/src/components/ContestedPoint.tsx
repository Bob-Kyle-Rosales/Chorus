"use client"

import { motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"

// A contested point is a topic where researchers disagreed.
// Both sides are shown explicitly — Chorus never silently picks a winner.
// Amber styling signals "review required" without being alarming.

interface ContestedPointProps {
  point: {
    topic: string
    positions: string[]
  }
  index: number
}

export function ContestedPoint({ point, index }: ContestedPointProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5"
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <p className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
          {point.topic}
        </p>
      </div>

      {/* Positions — lettered A, B, C... */}
      <div className="space-y-2 pl-5">
        {point.positions.map((pos, i) => (
          <div key={i} className="flex gap-2">
            <span className="mt-0.5 w-4 shrink-0 font-mono text-[10px] text-amber-400/40">
              {String.fromCharCode(65 + i)}.
            </span>
            <p className="text-xs leading-relaxed text-white/60">{pos}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
