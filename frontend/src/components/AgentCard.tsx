"use client"

import { motion } from "framer-motion"
import type { AgentState } from "@/types/events"

// Per-agent color identity matches the angle preview colors
const AGENT_ACCENT: Record<string, string> = {
  researcher_0: "var(--chorus-blue)",
  researcher_1: "var(--chorus-green)",
  researcher_2: "var(--chorus-pink)",
  critic: "var(--chorus-gold)",
  synthesizer: "var(--chorus-gold)",
  planner: "var(--chorus-muted)",
}

const AGENT_LABEL: Record<string, string> = {
  researcher_0: "Researcher I",
  researcher_1: "Researcher II",
  researcher_2: "Researcher III",
  critic: "Critic",
  synthesizer: "Synthesizer",
  planner: "Planner",
}

export function AgentCard({ agent }: { agent: AgentState }) {
  const accent = AGENT_ACCENT[agent.agent_id] ?? "var(--chorus-muted)"
  const label = AGENT_LABEL[agent.agent_id] ?? agent.agent_id

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
          <span className="font-mono text-[10px]" style={{ color: "var(--chorus-border)" }}>
            ✓
          </span>
        )}
      </div>

      {/* Token stream */}
      <div className="flex-1 px-4 py-3">
        <pre
          className="max-h-36 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap"
          style={{ color: "var(--chorus-muted)" }}
        >
          {agent.tokens || (agent.status === "finished" ? "Done." : "Waiting…")}
        </pre>
      </div>
    </motion.div>
  )
}
