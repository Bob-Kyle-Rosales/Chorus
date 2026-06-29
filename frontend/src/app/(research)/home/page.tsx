"use client"

// Research home — 3-step intake flow:
//   Step 1 (input)   → user types question → clicks "Plan Research"
//   Step 2 (preview) → Planner runs, 3 angle cards shown → user confirms
//   Step 3 (starting) → session created, redirect to /run/[id]
//
// The sidebar (from layout) shows past sessions. This page only owns the
// intake flow and the empty/non-empty state of the question area.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useSessionStore } from "@/lib/store"
import { api, ApiError } from "@/lib/api"
import { AnglePreview } from "@/components/AnglePreview"
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
  const { sessions, addSession } = useSessionStore()

  const [step, setStep] = useState<Step>("input")
  const [question, setQuestion] = useState("")
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [angles, setAngles] = useState<AnglePlan[]>([])
  const [error, setError] = useState<string | null>(null)

  // Step 1 → 2: run planner, show angle preview
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

  // Step 2 → 3: create session, redirect
  async function handleConfirm() {
    if (!previewId) return
    setStep("starting")

    try {
      const session = await api.post<Session>("/sessions", { preview_id: previewId })
      addSession(session)
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
    <main className="flex-1 flex flex-col items-center justify-center p-8 min-h-full">
      <div className="w-full max-w-2xl space-y-8">

        <AnimatePresence mode="wait">

          {/* ── Step 1 & planning: question input ──────────────────────── */}
          {!showPreview && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 text-center"
            >
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                  {sessions.length === 0 ? "What are you researching?" : "New research"}
                </h1>
                <p className="text-white/40 text-sm">
                  Chorus will plan your research before you commit to running it.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handlePlan() }} className="flex gap-3">
                <input
                  type="text"
                  autoFocus
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isPlanning}
                  placeholder="Ask anything..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isPlanning || !question.trim()}
                  className="bg-white text-zinc-950 font-semibold px-5 py-3 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors whitespace-nowrap text-sm"
                >
                  {isPlanning ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                      Planning...
                    </span>
                  ) : (
                    "Plan research"
                  )}
                </button>
              </form>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              {/* Example chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuestion(q)}
                    disabled={isPlanning}
                    className="text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-full px-3 py-1 transition-colors disabled:opacity-30"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Recent sessions (non-empty state) */}
              {sessions.length > 0 && (
                <div className="text-left border-t border-white/5 pt-6">
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-3">
                    Recent sessions
                  </p>
                  <div className="space-y-1.5">
                    {sessions.slice(0, 5).map((s) => (
                      <a
                        key={s.id}
                        href={`/run/${s.id}?q=${encodeURIComponent(s.question)}`}
                        className="block text-sm text-white/50 hover:text-white/80 py-1.5 px-3 rounded-lg hover:bg-white/5 transition-colors truncate"
                      >
                        {s.name ?? s.question}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 2: angle preview ──────────────────────────────────── */}
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
                onConfirm={handleConfirm}
                loading={isStarting}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  )
}
