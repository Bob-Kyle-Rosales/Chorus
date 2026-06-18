export interface AnglePlan {
  angle_id: string
  brief: string
  search_seeds: string[]
}

export interface Citation {
  url: string
  title: string
  snippet: string
  retrieved_at: string
}

export interface Finding {
  claim: string
  support: string
  citations: Citation[]
  confidence: "low" | "medium" | "high"
}

export interface Critique {
  contradictions: Array<{ claim_a: string; claim_b: string; explanation: string }>
  weak_claims: Array<{ claim: string; reason: string }>
  gaps: string[]
  needs_followup: Array<{ angle_id: string; instruction: string }>
}

export interface Report {
  question: string
  tl_dr: string
  key_findings: Finding[]
  contested_points: Array<{ topic: string; positions: string[]; sources: Citation[] }>
  sources: Citation[]
  confidence_overall: "low" | "medium" | "high"
  generated_at: string
}

export type AgentRole = "researcher" | "critic" | "synthesizer"

export interface AgentState {
  agent_id: string
  role: AgentRole
  tokens: string
  status: "running" | "finished"
}

export type ServerEvent =
  | { type: "run.started"; run_id: string; question: string }
  | { type: "plan.ready"; angles: AnglePlan[] }
  | { type: "agent.started"; agent_id: string; role: AgentRole }
  | { type: "agent.token"; agent_id: string; delta: string }
  | { type: "agent.tool_call"; agent_id: string; tool: string; args: unknown }
  | { type: "agent.finished"; agent_id: string; output_ref: string }
  | { type: "critique.ready"; critique: Critique }
  | { type: "report.ready"; report: Report }
  | { type: "run.error"; message: string }
