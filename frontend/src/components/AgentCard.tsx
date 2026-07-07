"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { AGENT_ACCENT, AGENT_LABEL } from "@/lib/agentDisplay"
import type { AgentState } from "@/types/events"

export function AgentCard({ agent }: { agent: AgentState }) {
  const accent = AGENT_ACCENT[agent.agent_id] ?? "var(--chorus-muted)"
  const label = AGENT_LABEL[agent.agent_id] ?? agent.agent_id
  const streamRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [agent.tokens])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col rounded"
      style={{
        background: "var(--chorus-surface)",
        border: "1px solid var(--chorus-border)",
        borderTop: `2px solid ${accent}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--chorus-border)" }}
      >
        <span
          className="font-mono text-xs font-medium"
          style={{ color: accent }}
        >
          {label}
        </span>
        {agent.status === "running" ? (
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{ background: accent }}
          />
        ) : (
          <span className="font-mono text-xs" style={{ color: "var(--chorus-muted)" }}>
            ✓
          </span>
        )}
      </div>

      {/* Token stream */}
      <div className="flex-1 px-4 py-3">
        <pre
          ref={streamRef}
          className="max-h-36 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: "var(--chorus-muted)" }}
        >
          {agent.tokens || (agent.status === "finished" ? "Done." : "Waiting…")}
        </pre>
      </div>
    </motion.div>
  )
}
