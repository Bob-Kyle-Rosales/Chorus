import { create } from "zustand"
import type { AgentState, AnglePlan, Critique, Report, ServerEvent } from "@/types/events"

interface RunStore {
  runId: string | null
  question: string
  status: "idle" | "running" | "complete" | "error"
  angles: AnglePlan[]
  agents: Record<string, AgentState>
  critique: Critique | null
  report: Report | null
  errorMessage: string | null
  handleEvent: (event: ServerEvent) => void
  reset: () => void
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
}

export const useRunStore = create<RunStore>((set) => ({
  ...initialState,

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
            [event.agent_id]: {
              agent_id: event.agent_id,
              role: event.role,
              tokens: "",
              status: "running",
            },
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
            [event.agent_id]: {
              ...s.agents[event.agent_id],
              status: "finished",
            },
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
}))
