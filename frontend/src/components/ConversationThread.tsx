"use client"

import { useEffect, useRef } from "react"
import { AgentCard } from "@/components/AgentCard"
import { CritiqueView } from "@/components/CritiqueView"
import { ReportView } from "@/components/ReportView"
import { ReasoningResponse } from "@/components/ReasoningResponse"
import { PipelineFollowUp } from "@/components/PipelineFollowUp"
import { PipelineStatusStrip } from "@/components/PipelineStatusStrip"
import type { AgentState, ConversationMessage, Critique, Report } from "@/types/events"

interface ConversationThreadProps {
  question: string
  runStatus: "idle" | "running" | "complete" | "error"
  agents: Record<string, AgentState>
  critique: Critique | null
  report: Report | null
  errorMessage: string | null
  conversation: ConversationMessage[]
}

export function ConversationThread({
  question,
  runStatus,
  agents,
  critique,
  report,
  errorMessage,
  conversation,
}: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const agentList = Object.values(agents)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    // agentList/report/critique aren't part of `conversation` — the first run needs them too.
  }, [conversation.length, agentList.length, report, critique])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-12 px-8 py-8">
        {/* ── Original run ── */}
        <div className="space-y-8">
          {/* Question header */}
          <header>
            <p
              className="mb-1 font-mono text-xs tracking-widest uppercase"
              style={{ color: "var(--chorus-muted)" }}
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
              <PipelineStatusStrip agents={agents} critique={critique} report={report} />
              <p
                className="font-mono text-xs tracking-widest uppercase"
                style={{ color: "var(--chorus-muted)" }}
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

          {/* Critique — surfaced explicitly, not folded into the report's prose */}
          {critique && (
            <section
              className="pt-8"
              style={{ borderTop: "1px solid var(--chorus-border)" }}
            >
              <CritiqueView critique={critique} />
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
            <div className="rounded border border-destructive/30 bg-destructive/10 p-5 text-center text-sm text-destructive">
              {errorMessage ?? "Research failed. Please start a new session."}
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
            {msg.type === "error" && (
              <div className="rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {msg.text}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
