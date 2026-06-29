"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronRight, ChevronDown } from "lucide-react"
import { MiniAgentCard } from "@/components/MiniAgentCard"
import { ReportView } from "@/components/ReportView"
import type { PipelineMessage } from "@/types/events"

// Total nodes in a Chorus pipeline — used for the "X of 6 done" counter.
// planner + researcher_0 + researcher_1 + researcher_2 + critic + synthesizer
const TOTAL_AGENTS = 6

interface PipelineFollowUpProps {
  message: PipelineMessage
}

export function PipelineFollowUp({ message }: PipelineFollowUpProps) {
  const [expanded, setExpanded] = useState(false)

  const agentList = Object.values(message.agents)
  const doneCount = agentList.filter((a) => a.status === "finished").length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Cost label */}
      <p className="font-mono text-[10px] text-white/20">· new research · 5 ◉</p>

      {/* Collapsible agent activity panel */}
      {agentList.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/8">
          {/* Always-visible header row */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between px-4 py-3 text-xs text-white/40 transition-colors hover:text-white/60"
          >
            <span className="flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Agent activity
            </span>
            <span className="font-mono text-[10px]">
              {doneCount} of {TOTAL_AGENTS} done
            </span>
          </button>

          {/* Expanded row list */}
          {expanded && (
            <div className="divide-y divide-white/5 border-t border-white/5 px-4 pb-2">
              {agentList.map((agent) => (
                <MiniAgentCard key={agent.agent_id} agent={agent} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Waiting to start (WebSocket not yet connected) */}
      {message.status === "running" && agentList.length === 0 && (
        <p className="animate-pulse text-xs text-white/25">Starting research pipeline...</p>
      )}

      {/* Error */}
      {message.status === "error" && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
          Research failed. Please try again.
        </p>
      )}

      {/* Report — rendered once the pipeline completes */}
      {message.report && (
        <div className="border-t border-white/8 pt-6">
          <ReportView report={message.report} />
        </div>
      )}
    </motion.div>
  )
}
