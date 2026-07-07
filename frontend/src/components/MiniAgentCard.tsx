"use client"

import { AGENT_ACCENT, AGENT_LABEL } from "@/lib/agentDisplay"
import type { AgentState } from "@/types/events"

export function MiniAgentCard({ agent }: { agent: AgentState }) {
  const accent = AGENT_ACCENT[agent.agent_id] ?? "var(--chorus-muted)"
  const label = AGENT_LABEL[agent.agent_id] ?? agent.agent_id

  return (
    <div
      className="flex items-center gap-2 rounded px-3 py-2"
      style={{
        background: "var(--chorus-surface)",
        border: "1px solid var(--chorus-border)",
        borderLeft: `2px solid ${accent}`,
      }}
    >
      <span className="font-mono text-xs" style={{ color: accent }}>
        {label}
      </span>
      {agent.status === "running" && (
        <span
          className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ background: accent }}
        />
      )}
    </div>
  )
}
