"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const EXAMPLES = [
  "What are the real trade-offs of nuclear energy today?",
  "How did the 2008 financial crisis actually start?",
  "What makes a programming language succeed or fail?",
]

export default function Home() {
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)

    const res = await fetch("http://localhost:8000/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    })
    const { run_id } = await res.json()
    router.push(`/run/${run_id}?q=${encodeURIComponent(question)}`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-5xl font-bold tracking-tight mb-3">Chorus</h1>
          <p className="text-white/50 text-lg">
            Multiple AI agents investigate your question in parallel,
            <br />
            challenge each other, and synthesize a structured report.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            autoFocus
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            aria-label={loading ? "Starting research run" : "Start research"}
            className="bg-white text-zinc-950 font-semibold px-6 py-3 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors"
          >
            {loading ? "Starting..." : "Research"}
          </button>
        </form>

        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLES.map((q) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-full px-3 py-1 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        <p className="text-white/20 text-sm">Watch the agents think in real time.</p>
      </div>
    </main>
  )
}
