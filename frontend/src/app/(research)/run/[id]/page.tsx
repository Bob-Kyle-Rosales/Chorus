"use client"

// Run page — Layout A conversation thread.
//
// M5 architecture: this page is a PURE VIEW of the session state in Zustand.
// It does NOT own the WebSocket connection. The connection was opened in
// home/page.tsx (before navigation) and lives in useSessionStore.activeConnections.
// Navigating away does NOT close the connection — research continues in the
// background. Navigating back shows the current state from the store.
//
// The page's useEffect only sets/clears currentSessionId for the sidebar highlight.
// Nothing else runs on mount/unmount that could disrupt the live pipeline.

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ConversationThread } from "@/components/ConversationThread"
import { FollowUpInput } from "@/components/FollowUpInput"
import { CreditWarning } from "@/components/CreditWarning"
import { useSessionStore, EMPTY_RUN_STATE } from "@/lib/store"
import { createRunSocket } from "@/lib/websocket"
import { api } from "@/lib/api"

interface PendingPipeline {
  msgId: string
  runId: string
  question: string
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const question = searchParams.get("q") ?? ""

  const {
    runStates, activeConnections, credits,
    setCurrentSessionId, updateSessionName,
    handleSessionEvent, handleFollowUpEvent,
    addUserMessage, addReasoningMessage,
    addPipelineFollowUp, setFollowUpStatus,
    addConnection, removeConnection,
    initRunState,
  } = useSessionStore()

  // Read this session's run state from the store — never local component state
  const runState = runStates[id] ?? EMPTY_RUN_STATE
  const { status, agents, report, conversation, followUpStatus } = runState

  const [pendingPipeline, setPendingPipeline] = useState<PendingPipeline | null>(null)

  // ── Sidebar highlight only — no WebSocket side-effects ─────────────
  useEffect(() => {
    setCurrentSessionId(id)
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
    setFollowUpStatus(id, "submitting")

    try {
      const result = await api.post<
        { type: "reasoning"; answer: string } | { type: "pipeline"; run_id: string }
      >(`/sessions/${id}/followup`, { question: q })

      if (result.type === "reasoning") {
        addReasoningMessage(id, `${msgId}-r`, q, result.answer)
        setFollowUpStatus(id, "idle")
      } else {
        setPendingPipeline({ msgId: `${msgId}-p`, runId: result.run_id, question: q })
        setFollowUpStatus(id, "idle")
      }
    } catch {
      setFollowUpStatus(id, "idle")
    }
  }

  // ── Confirm follow-up pipeline run (after credit warning) ───────────
  function confirmPipeline() {
    if (!pendingPipeline) return
    const { msgId, runId, question: q } = pendingPipeline
    setPendingPipeline(null)

    addPipelineFollowUp(id, msgId, q, runId)
    setFollowUpStatus(id, "active")

    const ws = createRunSocket(
      runId,
      q,
      (event) => handleFollowUpEvent(id, msgId, event),
    )
    ws.onclose = () => setFollowUpStatus(id, "idle")
  }

  // ── Empty state: direct URL access with no stored run state ─────────
  const hasNoState = status === "idle" && !activeConnections[id]
  if (hasNoState && Object.keys(agents).length === 0) {
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
