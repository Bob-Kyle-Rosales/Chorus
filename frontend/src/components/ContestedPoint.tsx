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
      className="border border-amber-500/20 rounded-xl p-5 bg-amber-500/5 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          {point.topic}
        </p>
      </div>

      {/* Positions — lettered A, B, C... */}
      <div className="space-y-2 pl-5">
        {point.positions.map((pos, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-[10px] font-mono text-amber-400/40 shrink-0 mt-0.5 w-4">
              {String.fromCharCode(65 + i)}.
            </span>
            <p className="text-xs text-white/60 leading-relaxed">{pos}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
