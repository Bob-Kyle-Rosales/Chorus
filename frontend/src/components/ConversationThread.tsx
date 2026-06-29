"use client"

import { useEffect, useRef } from "react"
import { AgentCard } from "@/components/AgentCard"
import { ReportView } from "@/components/ReportView"
import { ReasoningResponse } from "@/components/ReasoningResponse"
import { PipelineFollowUp } from "@/components/PipelineFollowUp"
import type { AgentState, ConversationMessage, Report } from "@/types/events"

// Scrollable conversation thread.
// Shows the original pipeline run (agents + report) at the top, then each
// follow-up exchange below it — user bubble, then Chorus response.
// Auto-scrolls to the bottom whenever new messages are added.

interface ConversationThreadProps {
  question: string
  runStatus: "idle" | "running" | "complete" | "error"
  agents: Record<string, AgentState>
  report: Report | null
  conversation: ConversationMessage[]
}

export function ConversationThread({
  question,
  runStatus,
  agents,
  report,
  conversation,
}: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever a new message is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.length])

  const agentList = Object.values(agents)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-12">

        {/* ── Original run ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Question header */}
          <header>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Chorus</p>
            <h1 className="text-2xl font-semibold leading-snug">{question}</h1>
          </header>

          {/* Agent cards grid */}
          {agentList.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs text-white/30 uppercase tracking-widest">Agents</p>
              <div className="grid gap-3 md:grid-cols-2">
                {agentList.map((agent) => (
                  <AgentCard key={agent.agent_id} agent={agent} />
                ))}
              </div>
            </section>
          )}

          {/* Original report */}
          {report && (
            <section className="border-t border-white/8 pt-8">
              <ReportView report={report} />
            </section>
          )}

          {/* Error state for original run */}
          {runStatus === "error" && (
            <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-5 text-center">
              <p className="text-sm text-red-400">Research failed. Please start a new session.</p>
            </div>
          )}
        </div>

        {/* ── Follow-up conversation ────────────────────────────────── */}
        {conversation.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {msg.type === "user" && (
              /* User bubble — right-aligned */
              <div className="flex justify-end">
                <div className="max-w-lg bg-white/8 border border-white/10 rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-sm text-white/80 leading-relaxed">{msg.text}</p>
                </div>
              </div>
            )}

            {msg.type === "reasoning" && <ReasoningResponse message={msg} />}
            {msg.type === "pipeline" && <PipelineFollowUp message={msg} />}
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
