"use client"

import { useEffect, useRef } from "react"
import { AgentCard } from "@/components/AgentCard"
import { ReportView } from "@/components/ReportView"
import { ReasoningResponse } from "@/components/ReasoningResponse"
import { PipelineFollowUp } from "@/components/PipelineFollowUp"
import type { AgentState, ConversationMessage, Report } from "@/types/events"

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.length])

  const agentList = Object.values(agents)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-12 px-8 py-8">
        {/* ── Original run ── */}
        <div className="space-y-8">
          {/* Question header */}
          <header>
            <p
              className="mb-1 font-mono text-xs tracking-widest uppercase"
              style={{ color: "var(--chorus-border)" }}
            >
              Chorus
            </p>
            <h1
              className="text-3xl font-light leading-snug"
              style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
            >
              {question}
            </h1>
          </header>

          {/* Agent cards */}
          {agentList.length > 0 && (
            <section className="space-y-3">
              <p
                className="font-mono text-xs tracking-widest uppercase"
                style={{ color: "var(--chorus-border)" }}
              >
                Agents
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {agentList.map((agent) => (
                  <AgentCard key={agent.agent_id} agent={agent} />
                ))}
              </div>
            </section>
          )}

          {/* Report */}
          {report && (
            <section
              className="pt-8"
              style={{ borderTop: "1px solid var(--chorus-border)" }}
            >
              <ReportView report={report} />
            </section>
          )}

          {/* Error */}
          {runStatus === "error" && (
            <div
              className="rounded p-5 text-center text-sm text-red-400"
              style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              Research failed. Please start a new session.
            </div>
          )}
        </div>

        {/* ── Follow-up conversation ── */}
        {conversation.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {msg.type === "user" && (
              <div className="flex justify-end">
                <div
                  className="max-w-lg rounded px-4 py-3"
                  style={{
                    background: "var(--chorus-surface)",
                    border: "1px solid var(--chorus-border)",
                  }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: "var(--chorus-text)" }}>
                    {msg.text}
                  </p>
                </div>
              </div>
            )}
            {msg.type === "reasoning" && <ReasoningResponse message={msg} />}
            {msg.type === "pipeline" && <PipelineFollowUp message={msg} />}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
