"use client"

import { motion } from "framer-motion"
import { AGENT_ACCENT, AGENT_GLOW_SHADOW } from "@/lib/agentDisplay"
import type { AgentState, Critique, Report } from "@/types/events"

type StageState = "complete" | "active" | "pending"

interface Stage {
  label: string
  state: StageState
  accentKey: string
}

interface PipelineStatusStripProps {
  agents: Record<string, AgentState>
  critique: Critique | null
  report: Report | null
}

// Planner always shows complete: planning happens on the home screen before
// this view ever renders, so there's no "running" state to observe for it here
// — it's shown for continuity with the pipeline the user already saw planned.
function deriveStages(
  agents: Record<string, AgentState>,
  critique: Critique | null,
  report: Report | null,
): Stage[] {
  const researchers = Object.values(agents).filter((a) => a.role === "researcher")
  const researchersComplete = researchers.length > 0 && researchers.every((a) => a.status === "finished")
  const researchersActive = researchers.some((a) => a.status === "running")

  const criticComplete = critique !== null
  const criticActive = researchersComplete && !criticComplete

  const synthComplete = report !== null
  const synthActive = criticComplete && !synthComplete

  return [
    { label: "Planner", state: "complete", accentKey: "planner" },
    {
      label: "Researchers",
      state: researchersComplete ? "complete" : researchersActive ? "active" : "pending",
      accentKey: "researcher_0",
    },
    {
      label: "Critic",
      state: criticComplete ? "complete" : criticActive ? "active" : "pending",
      accentKey: "critic",
    },
    {
      label: "Synthesizer",
      state: synthComplete ? "complete" : synthActive ? "active" : "pending",
      accentKey: "synthesizer",
    },
  ]
}

function StageBadge({ stage }: { stage: Stage }) {
  const accent = AGENT_ACCENT[stage.accentKey] ?? "var(--chorus-muted)"
  const [dimGlow, brightGlow] = AGENT_GLOW_SHADOW[stage.accentKey] ?? ["none", "none"]
  const isActive = stage.state === "active"
  const isPending = stage.state === "pending"

  return (
    <motion.span
      className="inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-xs"
      style={{
        color: isPending ? "var(--chorus-muted)" : accent,
        border: `1px solid ${isPending ? "var(--chorus-border)" : accent}`,
      }}
      animate={{ boxShadow: isActive ? [dimGlow, brightGlow, dimGlow] : "none" }}
      transition={isActive ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
    >
      {stage.label}
      {stage.state === "complete" && <span>✓</span>}
      {isActive && <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
    </motion.span>
  )
}

export function PipelineStatusStrip({ agents, critique, report }: PipelineStatusStripProps) {
  const stages = deriveStages(agents, critique, report)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stages.map((stage, i) => (
        <span key={stage.label} className="flex items-center gap-2">
          <StageBadge stage={stage} />
          {i < stages.length - 1 && <span style={{ color: "var(--chorus-muted)" }}>→</span>}
        </span>
      ))}
    </div>
  )
}
