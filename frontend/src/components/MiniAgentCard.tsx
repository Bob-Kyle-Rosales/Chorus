"use client"

import { Check } from "lucide-react"
import type { AgentState } from "@/types/events"

// Compact single-row agent status — used inside PipelineFollowUp's
// collapsible agent activity panel. Does not replace AgentCard (the large
// card used for the original run). MiniAgentCard is dense: one line per agent.

interface MiniAgentCardProps {
  agent: AgentState
}

export function MiniAgentCard({ agent }: MiniAgentCardProps) {
  const isFinished = agent.status === "finished"

  return (
    <div className="flex items-start gap-3 py-2 text-xs">
      {/* Status indicator */}
      <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {isFinished ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <span className="block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
        )}
      </div>

      {/* Agent name + live token preview when running */}
      <div className="min-w-0 flex-1">
        <p className={`font-mono ${isFinished ? "text-white/30" : "text-white/60"}`}>
          {agent.agent_id}
        </p>
        {!isFinished && agent.tokens && (
          <p className="mt-0.5 truncate text-[10px] leading-relaxed text-white/20">
            {agent.tokens.slice(-140)}
          </p>
        )}
      </div>

      {/* Status label */}
      <span
        className={`shrink-0 font-mono text-[10px] ${isFinished ? "text-white/20" : "text-yellow-400"}`}
      >
        {isFinished ? "done" : "running"}
      </span>
    </div>
  )
}
