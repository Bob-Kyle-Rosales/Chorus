"use client"

// Research home — 3-step intake flow:
//   Step 1 (input)   → user types question → clicks "Plan Research"
//   Step 2 (preview) → Planner runs, 3 angle cards shown → user confirms
//   Step 3 (starting) → session created, WebSocket opened, then navigate
//
// M5 change: the WebSocket is opened HERE (before router.push) so it lives in
// the Zustand store from the start. When the run page mounts, it finds the
// connection already open and subscribes to the existing run state — it does
// NOT create a new connection and does NOT close the connection on unmount.
//
// Concurrent run check:
//   0 active → proceed immediately
//   1 active → show ConcurrentRunWarning (costs 5 more ◉)
//   2 active → show ConcurrentRunWarning in blocked state (hard cap)

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useSessionStore, EMPTY_RUN_STATE } from "@/lib/store"
import { api, ApiError } from "@/lib/api"
import { createRunSocket } from "@/lib/websocket"
import { AuroraBackground } from "@/components/AuroraBackground"
import { AnglePreview } from "@/components/AnglePreview"
import { ConcurrentRunWarning } from "@/components/ConcurrentRunWarning"
import type { AnglePlan, Session } from "@/types/events"

const EXAMPLES = [
  "What are the real trade-offs of nuclear energy today?",
  "How did the 2008 financial crisis actually start?",
  "What makes a programming language succeed or fail?",
  "Why do social media algorithms amplify outrage?",
]

type Step = "input" | "planning" | "preview" | "starting"

export default function HomePage() {
  const router = useRouter()
  const {
    sessions,
    addSession,
    initRunState,
    handleSessionEvent,
    addConnection,
    removeConnection,
    activeConnections,
    setCredits,
  } = useSessionStore()

  const [step, setStep] = useState<Step>("input")
  const [question, setQuestion] = useState("")
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [angles, setAngles] = useState<AnglePlan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showConcurrentWarning, setShowConcurrentWarning] = useState(false)

  const activeCount = Object.keys(activeConnections).length

  // Step 1 → 2: run planner only, show angle preview
  async function handlePlan() {
    if (!question.trim()) return
    setError(null)
    setStep("planning")

    try {
      const data = await api.post<{ preview_id: string; angles: AnglePlan[] }>(
        "/sessions/preview",
        { question: question.trim() },
      )
      setPreviewId(data.preview_id)
      setAngles(data.angles)
      setStep("preview")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Planning failed. Try again.")
      setStep("input")
    }
  }

  // Step 2 → 3: confirm plan, create session, open WebSocket, navigate
  // ignoreConcurrent=true means the user already acknowledged the warning
  async function handleConfirm(ignoreConcurrent = false) {
    if (!previewId) return

    // Concurrent run gate
    if (activeCount >= 2) {
      setShowConcurrentWarning(true)
      return
    }
    if (activeCount >= 1 && !ignoreConcurrent) {
      setShowConcurrentWarning(true)
      return
    }

    setShowConcurrentWarning(false)
    setStep("starting")

    try {
      const session = await api.post<Session>("/sessions", { preview_id: previewId })
      addSession(session)

      // POST /sessions deducted 5 credits server-side — sync balance
      api
        .get<{ balance: number }>("/credits")
        .then(({ balance }) => setCredits(balance))
        .catch(() => {})

      // Initialise a clean run state for this session BEFORE the WebSocket opens
      initRunState(session.id)

      // Open the WebSocket and store it in the Zustand module-level store.
      // This keeps the TCP connection alive even after the run page unmounts.
      // Events flow into runStates[session.id] regardless of which page is rendered.
      const ws = createRunSocket(
        session.id,
        session.question,
        (event) => {
          handleSessionEvent(session.id, event)
          // Remove the connection handle once the run finishes or errors —
          // the underlying socket will close naturally on its own.
          if (event.type === "report.ready" || event.type === "run.error") {
            removeConnection(session.id)
          }
          // A run.error from the server means the backend may have just
          // refunded these credits (timeout / internal error — see
          // SECURITY.md T13) — resync so the balance shown is current.
          if (event.type === "run.error") {
            api.get<{ balance: number }>("/credits").then(({ balance }) => setCredits(balance)).catch(() => {})
          }
        },
        () => {
          // onclose: server-side close / timeout / dropped network. If the
          // run hadn't already reached a terminal state, the socket died
          // before telling us why — surface that instead of leaving agent
          // cards pulsing "running" forever.
          removeConnection(session.id)
          const cur = useSessionStore.getState().runStates[session.id]
          if (cur && cur.status !== "complete" && cur.status !== "error") {
            handleSessionEvent(session.id, {
              type: "run.error",
              message: "Connection lost before the run finished. Please start a new session.",
            })
          }
        },
      )
      addConnection(session.id, ws)

      router.push(`/run/${session.id}?q=${encodeURIComponent(session.question)}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start session.")
      setStep("input")
    }
  }

  function handleBack() {
    setStep("input")
    setPreviewId(null)
    setAngles([])
    setError(null)
  }

  const isPlanning = step === "planning"
  const isStarting = step === "starting"
  const showPreview = step === "preview" || step === "starting"

  return (
    <main
      className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden p-8"
      style={{ background: "var(--chorus-bg)" }}
    >
      <AuroraBackground intensity="faint" />

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        <AnimatePresence mode="wait">
          {/* ── Input / planning ── */}
          {!showPreview && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 text-center"
            >
              <div>
                <h1
                  className="mb-2 text-4xl font-light"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--chorus-text)" }}
                >
                  {sessions.length === 0 ? "What are you researching?" : "New research"}
                </h1>
                <p className="text-sm" style={{ color: "var(--chorus-muted)" }}>
                  Chorus will plan your research before you commit to running it.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handlePlan()
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  autoFocus
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isPlanning}
                  placeholder="Ask anything…"
                  className="flex-1 rounded px-5 py-3 text-sm outline-none transition-colors disabled:opacity-50"
                  style={{
                    background: "var(--chorus-surface)",
                    border: "1px solid var(--chorus-border)",
                    color: "var(--chorus-text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--chorus-gold)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--chorus-border)")}
                />
                <button
                  type="submit"
                  disabled={isPlanning || !question.trim()}
                  className="rounded px-5 py-3 text-sm font-medium whitespace-nowrap transition-opacity disabled:opacity-40"
                  style={{ background: "var(--chorus-gold)", color: "var(--chorus-bg)" }}
                >
                  {isPlanning ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 animate-spin rounded-full border-2"
                        style={{ borderColor: "rgba(13,20,32,0.3)", borderTopColor: "var(--chorus-bg)" }}
                      />
                      Planning…
                    </span>
                  ) : (
                    "Plan research"
                  )}
                </button>
              </form>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Example prompts */}
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuestion(q)}
                    disabled={isPlanning}
                    className="rounded-full border px-3 py-1 text-xs transition-colors hover:opacity-80 disabled:opacity-30"
                    style={{
                      borderColor: "var(--chorus-border)",
                      color: "var(--chorus-muted)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {sessions.length > 0 && (
                <div
                  className="pt-6 text-left"
                  style={{ borderTop: "1px solid var(--chorus-border)" }}
                >
                  <p
                    className="mb-3 font-mono text-xs tracking-widest uppercase"
                    style={{ color: "var(--chorus-muted)" }}
                  >
                    Recent sessions
                  </p>
                  <div className="space-y-1">
                    {sessions.slice(0, 5).map((s) => (
                      <a
                        key={s.id}
                        href={`/run/${s.id}?q=${encodeURIComponent(s.question)}`}
                        className="block truncate rounded px-3 py-1.5 text-sm transition-colors hover:opacity-80"
                        style={{ color: "var(--chorus-muted)" }}
                      >
                        {s.name ?? s.question}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Preview ── */}
          {showPreview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <AnglePreview
                question={question}
                angles={angles}
                onBack={handleBack}
                onConfirm={() => handleConfirm()}
                loading={isStarting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showConcurrentWarning && (
        <ConcurrentRunWarning
          activeCount={activeCount}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => setShowConcurrentWarning(false)}
        />
      )}
    </main>
  )
}
