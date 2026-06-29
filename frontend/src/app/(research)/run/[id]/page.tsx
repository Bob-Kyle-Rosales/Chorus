"use client"

// Run page — Layout A conversation thread.
//
// Structure (top → bottom):
//   ConversationThread  — scrollable, grows as follow-ups are added
//   FollowUpInput       — fixed at bottom, always visible
//   CreditWarning       — modal overlay shown before pipeline follow-ups
//
// Original pipeline run:
//   WebSocket opens on mount, events dispatched to useRunStore.
//   When status === "complete", the report is stored in the session (for
//   follow-up routing context) and the session is auto-named.
//
// Follow-up flow:
//   1. User submits question via FollowUpInput
//   2. POST /sessions/{id}/followup → routing decision
//   3a. "reasoning" → addReasoningMessage, done
//   3b. "pipeline"  → show CreditWarning → on confirm: open new WebSocket,
//       events dispatched to handleFollowUpEvent(messageId, event)

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ConversationThread } from "@/components/ConversationThread"
import { FollowUpInput } from "@/components/FollowUpInput"
import { CreditWarning } from "@/components/CreditWarning"
import { useRunStore, useSessionStore } from "@/lib/store"
import { createRunSocket } from "@/lib/websocket"
import { api } from "@/lib/api"

// Pending pipeline follow-up waiting for the user to confirm in CreditWarning
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
    status, agents, report, conversation,
    followUpStatus, handleEvent, reset,
    addUserMessage, addReasoningMessage,
    addPipelineFollowUp, handleFollowUpEvent,
    setFollowUpStatus,
  } = useRunStore()

  const { updateSessionName, setCurrentSessionId, credits } = useSessionStore()

  const wsRef = useRef<WebSocket | null>(null)
  const [pendingPipeline, setPendingPipeline] = useState<PendingPipeline | null>(null)

  // ── Open WebSocket for the original pipeline run ────────────────────
  useEffect(() => {
    reset()
    setCurrentSessionId(id)
    wsRef.current = createRunSocket(id, question, handleEvent)
    return () => {
      wsRef.current?.close()
      setCurrentSessionId(null)
    }
  }, [id, question]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── When original run completes: store report + auto-name session ───
  useEffect(() => {
    if (status !== "complete" || !report) return

    // Store report for follow-up routing context (non-blocking)
    api.patch(`/sessions/${id}/report`, { report }).catch(() => {})

    // Generate a short session name
    api.patch<{ name: string }>(`/sessions/${id}/name`)
      .then(({ name }) => updateSessionName(id, name))
      .catch(() => {})
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle follow-up submission ─────────────────────────────────────
  async function handleFollowUp(q: string) {
    const msgId = Date.now().toString()
    addUserMessage(msgId, q)
    setFollowUpStatus("submitting")

    try {
      const result = await api.post<
        { type: "reasoning"; answer: string } | { type: "pipeline"; run_id: string }
      >(`/sessions/${id}/followup`, { question: q })

      if (result.type === "reasoning") {
        addReasoningMessage(`${msgId}-r`, q, result.answer)
        setFollowUpStatus("idle")
      } else {
        // Pipeline follow-up — show credit warning before starting
        setPendingPipeline({ msgId: `${msgId}-p`, runId: result.run_id, question: q })
        setFollowUpStatus("idle")
      }
    } catch {
      setFollowUpStatus("idle")
    }
  }

  // ── Confirm pipeline follow-up (user approved in CreditWarning) ─────
  function confirmPipeline() {
    if (!pendingPipeline) return
    const { msgId, runId, question: q } = pendingPipeline
    setPendingPipeline(null)

    addPipelineFollowUp(msgId, q, runId)
    setFollowUpStatus("active")

    const ws = createRunSocket(runId, q, (event) => handleFollowUpEvent(msgId, event))
    ws.onclose = () => setFollowUpStatus("idle")
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable conversation */}
      <ConversationThread
        question={question}
        runStatus={status}
        agents={agents}
        report={report}
        conversation={conversation}
      />

      {/* Credit warning modal */}
      {pendingPipeline && (
        <CreditWarning
          creditsRemaining={credits}
          onConfirm={confirmPipeline}
          onCancel={() => setPendingPipeline(null)}
        />
      )}

      {/* Fixed follow-up input — only shown after the original run starts */}
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
