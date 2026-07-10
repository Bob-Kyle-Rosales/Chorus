"use client"

import { ReportView } from "@/components/ReportView"
import { AgentCard } from "@/components/AgentCard"
import { CritiqueView } from "@/components/CritiqueView"
import { PipelineStatusStrip } from "@/components/PipelineStatusStrip"
import type { PipelineMessage } from "@/types/events"

export function PipelineFollowUp({ message }: { message: PipelineMessage }) {
  return (
    <div className="space-y-6">
      {/* Agent cards if present */}
      {Object.keys(message.agents).length > 0 && (
        <>
          <PipelineStatusStrip agents={message.agents} critique={message.critique} report={message.report} />
          <div className="grid gap-3 md:grid-cols-2">
            {Object.values(message.agents).map((agent) => (
              <AgentCard key={agent.agent_id} agent={agent} />
            ))}
          </div>
        </>
      )}

      {/* Critique — surfaced explicitly, not folded into the report's prose */}
      {message.critique && <CritiqueView critique={message.critique} />}

      {/* Error */}
      {message.status === "error" && (
        <div className="rounded border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {message.errorMessage ?? "Research failed. Please try again."}
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
            style={{ color: "var(--chorus-muted)" }}
          >
            Follow-up research
          </p>
          <ReportView report={message.report} />
        </div>
      )}
    </div>
  )
}
