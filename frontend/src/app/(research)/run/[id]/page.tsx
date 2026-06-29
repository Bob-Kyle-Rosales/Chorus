"use client"

// Run page — Layout A conversation thread.
//
// M5 architecture: this page is a PURE VIEW of the session state in Zustand.
// It does NOT own the WebSocket connection. The connection was opened in
// home/page.tsx (before navigation) and lives in useSessionStore.activeConnections.
// Navigating away does NOT close the connection — research continues in the
// background. Navigating back shows the current state from the store.
//
// M7 addition: if there is no live state for this session (e.g. after a page
// refresh — Zustand is in-memory), the page rehydrates from the database via
// GET /sessions/{id}, restoring the report and the full conversation thread.
// Every conversation message is persisted to the DB as it is created.

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ConversationThread } from "@/components/ConversationThread"
import { FollowUpInput } from "@/components/FollowUpInput"
import { CreditWarning } from "@/components/CreditWarning"
import { useSessionStore, EMPTY_RUN_STATE } from "@/lib/store"
import { createRunSocket } from "@/lib/websocket"
import { api } from "@/lib/api"
import type { SessionDetail } from "@/types/events"

interface PendingPipeline {
  msgId: string
  runId: string
  question: string
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const urlQuestion = searchParams.get("q") ?? ""

  const {
    runStates, activeConnections, credits,
    setCurrentSessionId, updateSessionName, setCredits,
    handleFollowUpEvent,
    addUserMessage, addReasoningMessage,
    addPipelineFollowUp, setFollowUpStatus,
    rehydrateSession,
  } = useSessionStore()

  // Read this session's run state from the store — never local component state
  const runState = runStates[id] ?? EMPTY_RUN_STATE
  const { status, agents, report, conversation, followUpStatus } = runState

  const [pendingPipeline, setPendingPipeline] = useState<PendingPipeline | null>(null)
  const [rehydrating, setRehydrating] = useState(false)
  // Question shown in the header — from the URL, or from the DB after rehydration
  const [fetchedQuestion, setFetchedQuestion] = useState("")
  const question = urlQuestion || fetchedQuestion

  // Fire-and-forget message persistence (Milestone 7).
  // Frontend-driven so persisted message ids match the live ids in the store.
  function persistMessage(msg: {
    id: string
    role: "user" | "chorus"
    type: "user" | "reasoning" | "pipeline"
    content?: string
    report?: unknown
  }) {
    api.post(`/sessions/${id}/messages`, msg).catch(() => {})
  }

  // ── Sidebar highlight + rehydrate-on-mount ─────────────────────────
  useEffect(() => {
    setCurrentSessionId(id)

    // If there is no live state for this session and no active connection,
    // we likely arrived via refresh or a sidebar link — restore from the DB.
    const cur = useSessionStore.getState().runStates[id]
    const hasLiveState =
      Boolean(useSessionStore.getState().activeConnections[id]) ||
      Boolean(cur && (cur.status !== "idle" || cur.conversation.length > 0))

    if (!hasLiveState) {
      setRehydrating(true)
      api.get<SessionDetail>(`/sessions/${id}`)
        .then((detail) => {
          setFetchedQuestion(detail.question)
          rehydrateSession(id, detail)
        })
        .catch(() => {})
        .finally(() => setRehydrating(false))
    }

    return () => {
      setCurrentSessionId(null)
      // INTENTIONALLY do not close the WebSocket here.
      // Background execution: the connection in activeConnections survives unmount.
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Store report + auto-name session when original run completes ────
  useEffect(() => {
    if (status !== "complete" || !report) return
    api.patch(`/sessions/${id}/report`, { report }).catch(() => {})
    api.patch<{ name: string }>(`/sessions/${id}/name`)
      .then(({ name }) => updateSessionName(id, name))
      .catch(() => {})
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Follow-up submission ────────────────────────────────────────────
  async function handleFollowUp(q: string) {
    const msgId = Date.now().toString()
    addUserMessage(id, msgId, q)
    persistMessage({ id: msgId, role: "user", type: "user", content: q })
    setFollowUpStatus(id, "submitting")

    try {
      const result = await api.post<
        { type: "reasoning"; answer: string } | { type: "pipeline"; run_id: string }
      >(`/sessions/${id}/followup`, { question: q })

      if (result.type === "reasoning") {
        addReasoningMessage(id, `${msgId}-r`, q, result.answer)
        persistMessage({ id: `${msgId}-r`, role: "chorus", type: "reasoning", content: result.answer })
        setFollowUpStatus(id, "idle")
        // Backend deducted 1 credit for reasoning — sync balance
        api.get<{ balance: number }>("/credits")
          .then(({ balance }) => setCredits(balance))
          .catch(() => {})
      } else {
        setPendingPipeline({ msgId: `${msgId}-p`, runId: result.run_id, question: q })
        setFollowUpStatus(id, "idle")
      }
    } catch {
      setFollowUpStatus(id, "idle")
    }
  }

  // ── Confirm follow-up pipeline run (after CreditWarning) ───────────
  async function confirmPipeline() {
    if (!pendingPipeline) return
    const { msgId, runId, question: q } = pendingPipeline
    setPendingPipeline(null)

    // Deduct 5 credits explicitly — the routing call did not deduct them.
    // This is the user's confirmation that they accept the cost.
    try {
      const { balance } = await api.post<{ balance: number }>("/credits/deduct", { amount: 5 })
      setCredits(balance)
    } catch {
      // 402: insufficient credits — CreditWarning already shows the balance,
      // the user shouldn't be able to confirm. Guard here just in case.
      return
    }

    // (the user question was already persisted in handleFollowUp)
    addPipelineFollowUp(id, msgId, q, runId)
    setFollowUpStatus(id, "active")

    const ws = createRunSocket(runId, q, (event) => {
      handleFollowUpEvent(id, msgId, event)
      // Persist the pipeline follow-up report once it arrives over the WebSocket.
      if (event.type === "report.ready") {
        persistMessage({ id: msgId, role: "chorus", type: "pipeline", report: event.report })
      }
    })
    ws.onclose = () => setFollowUpStatus(id, "idle")
  }

  // ── Loading state while rehydrating from the database ──────────────
  if (rehydrating) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-white/20 text-sm font-mono animate-pulse">Loading session...</p>
      </div>
    )
  }

  // ── Empty state: session has no report, no conversation, no live run ───
  const hasNoState = status === "idle" && !activeConnections[id]
  if (hasNoState && !report && conversation.length === 0 && Object.keys(agents).length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-white/30 text-sm mb-4">
          No active research for this session.
        </p>
        <a
          href="/home"
          className="text-xs text-white/40 hover:text-white/70 border border-white/10 rounded-xl px-4 py-2 transition-colors"
        >
          Start new research
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConversationThread
        question={question}
        runStatus={status}
        agents={agents}
        report={report}
        conversation={conversation}
      />

      {pendingPipeline && (
        <CreditWarning
          creditsRemaining={credits}
          onConfirm={confirmPipeline}
          onCancel={() => setPendingPipeline(null)}
        />
      )}

      {status !== "idle" && (
        <FollowUpInput
          onSubmit={handleFollowUp}
          runStatus={status}
          followUpStatus={followUpStatus}
          credits={credits}
        />
      )}
    </div>
  )
}
