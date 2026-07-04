"use client"

import { ReportView } from "@/components/ReportView"
import { AgentCard } from "@/components/AgentCard"
import type { PipelineMessage } from "@/types/events"

export function PipelineFollowUp({ message }: { message: PipelineMessage }) {
  return (
    <div className="space-y-6">
      {/* Agent cards if present */}
      {Object.keys(message.agents).length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {Object.values(message.agents).map((agent) => (
            <AgentCard key={agent.agent_id} agent={agent} />
          ))}
        </div>
      )}

      {/* Error */}
      {message.status === "error" && (
        <div
          className="rounded p-4 text-sm text-red-400"
          style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          Research failed. Please try again.
        </div>
      )}

      {/* Nested report */}
      {message.report && (
        <div
          className="rounded p-6"
          style={{
            background: "var(--chorus-surface)",
            border: "1px solid var(--chorus-border)",
          }}
        >
          <p
            className="mb-6 font-mono text-[10px] tracking-widest uppercase"
            style={{ color: "var(--chorus-border)" }}
          >
            Follow-up research
          </p>
          <ReportView report={message.report} />
        </div>
      )}
    </div>
  )
}
