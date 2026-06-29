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
      <div className="shrink-0 mt-0.5 w-3.5 h-3.5 flex items-center justify-center">
        {isFinished ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <span className="block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        )}
      </div>

      {/* Agent name + live token preview when running */}
      <div className="flex-1 min-w-0">
        <p className={`font-mono ${isFinished ? "text-white/30" : "text-white/60"}`}>
          {agent.agent_id}
        </p>
        {!isFinished && agent.tokens && (
          <p className="text-[10px] text-white/20 truncate mt-0.5 leading-relaxed">
            {agent.tokens.slice(-140)}
          </p>
        )}
      </div>

      {/* Status label */}
      <span className={`shrink-0 text-[10px] font-mono ${isFinished ? "text-white/20" : "text-yellow-400"}`}>
        {isFinished ? "done" : "running"}
      </span>
    </div>
  )
}
