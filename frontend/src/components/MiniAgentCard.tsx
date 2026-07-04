"use client"

import type { AgentState } from "@/types/events"

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
