"use client"

import { motion } from "framer-motion"

// positions: string[] per the Report type in @/types/events
// (no exported ContestedPoint type exists; using inline interface)
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
      className="rounded p-5 space-y-4"
      style={{
        background: "var(--chorus-surface)",
        border: "1px solid var(--chorus-border)",
        borderLeft: "3px solid var(--chorus-gold)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
          style={{
            background: "rgba(201,162,74,0.1)",
            color: "var(--chorus-gold)",
            border: "1px solid rgba(201,162,74,0.3)",
          }}
        >
          Contested
        </span>
        <p className="text-sm font-medium" style={{ color: "var(--chorus-text)" }}>
          {point.topic}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {point.positions.map((pos, i) => (
          <div
            key={i}
            className="rounded p-3 space-y-2"
            style={{ background: "var(--chorus-bg)", border: "1px solid var(--chorus-border)" }}
          >
            <p className="text-xs leading-relaxed" style={{ color: "var(--chorus-muted)" }}>
              {pos}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
