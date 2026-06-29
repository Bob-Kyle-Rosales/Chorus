import { create } from "zustand"
import type {
  AgentState,
  AnglePlan,
  ConversationMessage,
  Critique,
  PipelineMessage,
  Report,
  ServerEvent,
  Session,
} from "@/types/events"

// ---------------------------------------------------------------------------
// Session store — sidebar list, current session, credit balance
// ---------------------------------------------------------------------------

interface SessionStore {
  sessions: Session[]
  currentSessionId: string | null
  credits: number
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSessionName: (id: string, name: string) => void
  setCurrentSessionId: (id: string | null) => void
  setCredits: (n: number) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  currentSessionId: null,
  credits: 20, // static placeholder — real tracking is Milestone 6

  setSessions(sessions) {
    set({ sessions })
  },
  addSession(session) {
    set((s) => ({ sessions: [session, ...s.sessions] }))
  },
  updateSessionName(id, name) {
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, name } : sess)),
    }))
  },
  setCurrentSessionId(id) {
    set({ currentSessionId: id })
  },
  setCredits(n) {
    set({ credits: n })
  },
}))

// ---------------------------------------------------------------------------
// Run store — original pipeline state + follow-up conversation thread
// ---------------------------------------------------------------------------

type FollowUpStatus = "idle" | "submitting" | "active"

interface RunStore {
  // Original pipeline run state
  runId: string | null
  question: string
  status: "idle" | "running" | "complete" | "error"
  angles: AnglePlan[]
  agents: Record<string, AgentState>
  critique: Critique | null
  report: Report | null
  errorMessage: string | null

  // Follow-up conversation thread
  conversation: ConversationMessage[]
  followUpStatus: FollowUpStatus

  // Original run handlers
  handleEvent: (event: ServerEvent) => void
  reset: () => void

  // Conversation mutation
  addUserMessage: (id: string, text: string) => void
  addReasoningMessage: (id: string, question: string, answer: string) => void
  addPipelineFollowUp: (id: string, question: string, runId: string) => void
  handleFollowUpEvent: (messageId: string, event: ServerEvent) => void
  setFollowUpStatus: (s: FollowUpStatus) => void
}

const initialState = {
  runId: null,
  question: "",
  status: "idle" as const,
  angles: [],
  agents: {},
  critique: null,
  report: null,
  errorMessage: null,
  conversation: [],
  followUpStatus: "idle" as FollowUpStatus,
}

export const useRunStore = create<RunStore>((set) => ({
  ...initialState,

  // ------------------------------------------------------------------
  // Original pipeline WebSocket event handler
  // ------------------------------------------------------------------
  handleEvent(event: ServerEvent) {
    switch (event.type) {
      case "run.started":
        set({ runId: event.run_id, question: event.question, status: "running" })
        break
      case "plan.ready":
        set({ angles: event.angles })
        break
      case "agent.started":
        set((s) => ({
          agents: {
            ...s.agents,
            [event.agent_id]: { agent_id: event.agent_id, role: event.role, tokens: "", status: "running" },
          },
        }))
        break
      case "agent.token":
        set((s) => ({
          agents: {
            ...s.agents,
            [event.agent_id]: {
              ...s.agents[event.agent_id],
              tokens: (s.agents[event.agent_id]?.tokens ?? "") + event.delta,
            },
          },
        }))
        break
      case "agent.finished":
        set((s) => ({
          agents: {
            ...s.agents,
            [event.agent_id]: { ...s.agents[event.agent_id], status: "finished" },
          },
        }))
        break
      case "critique.ready":
        set({ critique: event.critique })
        break
      case "report.ready":
        set({ report: event.report, status: "complete" })
        break
      case "run.error":
        set({ status: "error", errorMessage: event.message })
        break
    }
  },

  reset() {
    set(initialState)
  },

  // ------------------------------------------------------------------
  // Conversation mutation helpers
  // ------------------------------------------------------------------

  addUserMessage(id, text) {
    set((s) => ({
      conversation: [
        ...s.conversation,
        { type: "user", id, text, timestamp: new Date().toISOString() },
      ],
    }))
  },

  addReasoningMessage(id, question, answer) {
    set((s) => ({
      conversation: [
        ...s.conversation,
        { type: "reasoning", id, question, answer, timestamp: new Date().toISOString() },
      ],
    }))
  },

  addPipelineFollowUp(id, question, runId) {
    const msg: PipelineMessage = {
      type: "pipeline",
      id,
      question,
      runId,
      agents: {},
      report: null,
      status: "running",
      timestamp: new Date().toISOString(),
    }
    set((s) => ({ conversation: [...s.conversation, msg] }))
  },

  // Routes WebSocket events from a follow-up pipeline run into the correct
  // PipelineMessage in the conversation array, identified by messageId.
  handleFollowUpEvent(messageId, event) {
    set((s) => {
      const idx = s.conversation.findIndex((m) => m.id === messageId)
      if (idx === -1) return s

      const msg = s.conversation[idx]
      if (msg.type !== "pipeline") return s

      const updated: PipelineMessage = { ...msg, agents: { ...msg.agents } }

      switch (event.type) {
        case "agent.started":
          updated.agents[event.agent_id] = {
            agent_id: event.agent_id,
            role: event.role,
            tokens: "",
            status: "running",
          }
          break
        case "agent.token":
          updated.agents[event.agent_id] = {
            ...updated.agents[event.agent_id],
            tokens: (updated.agents[event.agent_id]?.tokens ?? "") + event.delta,
          }
          break
        case "agent.finished":
          updated.agents[event.agent_id] = {
            ...updated.agents[event.agent_id],
            status: "finished",
          }
          break
        case "report.ready":
          updated.report = event.report
          updated.status = "complete"
          break
        case "run.error":
          updated.status = "error"
          break
      }

      const conversation = [...s.conversation]
      conversation[idx] = updated
      return { conversation }
    })
  },

  setFollowUpStatus(s) {
    set({ followUpStatus: s })
  },
}))
