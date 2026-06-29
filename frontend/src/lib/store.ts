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
// Per-session run state
// One instance per session — survives navigation, never tied to a component.
// ---------------------------------------------------------------------------

export type FollowUpStatus = "idle" | "submitting" | "active"

export interface SessionRunState {
  runId: string | null
  status: "idle" | "running" | "complete" | "error"
  agents: Record<string, AgentState>
  critique: Critique | null
  report: Report | null
  errorMessage: string | null
  conversation: ConversationMessage[]
  followUpStatus: FollowUpStatus
}

export const EMPTY_RUN_STATE: SessionRunState = {
  runId: null,
  status: "idle",
  agents: {},
  critique: null,
  report: null,
  errorMessage: null,
  conversation: [],
  followUpStatus: "idle",
}

// ---------------------------------------------------------------------------
// Session store — session list, WebSocket connections, per-session run state
// ---------------------------------------------------------------------------

interface SessionStore {
  // Session list (from GET /sessions)
  sessions: Session[]
  currentSessionId: string | null
  credits: number

  // Per-session pipeline state — persists across navigation so the user can
  // leave a running session and come back to see current progress.
  runStates: Record<string, SessionRunState>

  // Active WebSocket handles — keyed by session ID.
  // Storing WebSocket objects at module level (Zustand singleton) keeps the
  // underlying TCP connection alive even when the run page unmounts.
  // A connection is removed only when the run completes or the server closes it.
  activeConnections: Record<string, WebSocket>

  // ── Session list ──────────────────────────────────────────────────────
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSessionName: (id: string, name: string) => void
  setCurrentSessionId: (id: string | null) => void
  setCredits: (n: number) => void

  // ── Run state (all parameterized by sessionId) ────────────────────────
  initRunState: (sessionId: string) => void
  handleSessionEvent: (sessionId: string, event: ServerEvent) => void
  handleFollowUpEvent: (sessionId: string, messageId: string, event: ServerEvent) => void
  addUserMessage: (sessionId: string, id: string, text: string) => void
  addReasoningMessage: (sessionId: string, id: string, question: string, answer: string) => void
  addPipelineFollowUp: (sessionId: string, id: string, question: string, runId: string) => void
  setFollowUpStatus: (sessionId: string, s: FollowUpStatus) => void

  // ── Connection management ─────────────────────────────────────────────
  addConnection: (sessionId: string, ws: WebSocket) => void
  removeConnection: (sessionId: string) => void
}

// Immutable helper — returns a new runStates map with one session updated
function patchRunState(
  states: Record<string, SessionRunState>,
  sessionId: string,
  patch: (cur: SessionRunState) => Partial<SessionRunState>,
): Record<string, SessionRunState> {
  const cur = states[sessionId] ?? { ...EMPTY_RUN_STATE }
  return { ...states, [sessionId]: { ...cur, ...patch(cur) } }
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  currentSessionId: null,
  credits: 20, // placeholder — real tracking is Milestone 6
  runStates: {},
  activeConnections: {},

  // ── Session list ──────────────────────────────────────────────────────

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((s) => ({ sessions: [session, ...s.sessions] })),

  updateSessionName: (id, name) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, name } : sess)),
    })),

  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  setCredits: (n) => set({ credits: n }),

  // ── Run state ─────────────────────────────────────────────────────────

  // Called in home/page.tsx just before opening the WebSocket.
  // Resets this session's state so a fresh run always starts clean.
  initRunState: (sessionId) =>
    set((s) => ({
      runStates: { ...s.runStates, [sessionId]: { ...EMPTY_RUN_STATE } },
    })),

  // Dispatches original-pipeline WebSocket events into the correct session.
  handleSessionEvent: (sessionId, event) =>
    set((s) => ({
      runStates: patchRunState(s.runStates, sessionId, (cur) => {
        switch (event.type) {
          case "run.started":
            return { runId: event.run_id, status: "running" }
          case "agent.started":
            return {
              agents: {
                ...cur.agents,
                [event.agent_id]: {
                  agent_id: event.agent_id,
                  role: event.role,
                  tokens: "",
                  status: "running",
                },
              },
            }
          case "agent.token":
            return {
              agents: {
                ...cur.agents,
                [event.agent_id]: {
                  ...cur.agents[event.agent_id],
                  tokens: (cur.agents[event.agent_id]?.tokens ?? "") + event.delta,
                },
              },
            }
          case "agent.finished":
            return {
              agents: {
                ...cur.agents,
                [event.agent_id]: { ...cur.agents[event.agent_id], status: "finished" },
              },
            }
          case "critique.ready":
            return { critique: event.critique }
          case "report.ready":
            return { report: event.report, status: "complete" }
          case "run.error":
            return { status: "error", errorMessage: event.message }
          default:
            return {}
        }
      }),
    })),

  // Dispatches follow-up pipeline WebSocket events into the matching
  // PipelineMessage inside the session's conversation array.
  handleFollowUpEvent: (sessionId, messageId, event) =>
    set((s) => {
      const cur = s.runStates[sessionId]
      if (!cur) return s

      const idx = cur.conversation.findIndex((m) => m.id === messageId)
      if (idx === -1) return s
      const msg = cur.conversation[idx]
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

      const conversation = [...cur.conversation]
      conversation[idx] = updated
      return { runStates: { ...s.runStates, [sessionId]: { ...cur, conversation } } }
    }),

  addUserMessage: (sessionId, id, text) =>
    set((s) => ({
      runStates: patchRunState(s.runStates, sessionId, (cur) => ({
        conversation: [
          ...cur.conversation,
          { type: "user", id, text, timestamp: new Date().toISOString() },
        ],
      })),
    })),

  addReasoningMessage: (sessionId, id, question, answer) =>
    set((s) => ({
      runStates: patchRunState(s.runStates, sessionId, (cur) => ({
        conversation: [
          ...cur.conversation,
          { type: "reasoning", id, question, answer, timestamp: new Date().toISOString() },
        ],
      })),
    })),

  addPipelineFollowUp: (sessionId, id, question, runId) => {
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
    set((s) => ({
      runStates: patchRunState(s.runStates, sessionId, (cur) => ({
        conversation: [...cur.conversation, msg],
      })),
    }))
  },

  setFollowUpStatus: (sessionId, followUpStatus) =>
    set((s) => ({
      runStates: patchRunState(s.runStates, sessionId, () => ({ followUpStatus })),
    })),

  // ── Connection management ─────────────────────────────────────────────

  addConnection: (sessionId, ws) =>
    set((s) => ({
      activeConnections: { ...s.activeConnections, [sessionId]: ws },
    })),

  removeConnection: (sessionId) =>
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [sessionId]: _removed, ...rest } = s.activeConnections
      return { activeConnections: rest }
    }),
}))
