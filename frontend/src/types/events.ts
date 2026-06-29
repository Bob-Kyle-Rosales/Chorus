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

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export interface Session {
  id: string
  name: string | null
  question: string
  created_at: string // ISO 8601 string from backend
  last_active: string
}

export interface AnglePreviewResult {
  preview_id: string
  angles: AnglePlan[]
}

// One persisted conversation message from GET /sessions/{id} (Milestone 7)
export interface PersistedMessage {
  id: string
  role: "user" | "chorus"
  type: "user" | "reasoning" | "pipeline"
  content: string | null
  report: Report | null
  created_at: string
}

// Full session detail used to rehydrate a session after a page refresh
export interface SessionDetail extends Session {
  report: Report | null
  messages: PersistedMessage[]
}

// ---------------------------------------------------------------------------
// Conversation thread — follow-up message types
// ---------------------------------------------------------------------------

// A message the user typed as a follow-up question
export interface UserMessage {
  type: "user"
  id: string
  text: string
  timestamp: string
}

// Chorus answered from existing findings — fast, no new pipeline
export interface ReasoningMessage {
  type: "reasoning"
  id: string
  question: string
  answer: string
  timestamp: string
}

// Chorus ran a new full pipeline for the follow-up
export interface PipelineMessage {
  type: "pipeline"
  id: string
  question: string
  runId: string
  agents: Record<string, AgentState>
  report: Report | null
  status: "running" | "complete" | "error"
  timestamp: string
}

export type ConversationMessage = UserMessage | ReasoningMessage | PipelineMessage

// ---------------------------------------------------------------------------
// WebSocket events
// ---------------------------------------------------------------------------

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
