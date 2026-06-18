"use client"

import { useEffect, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { AgentCard } from "@/components/AgentCard"
import { useRunStore } from "@/lib/store"
import { createRunSocket } from "@/lib/websocket"

const STATUS_LABEL: Record<string, string> = {
  idle: "Waiting",
  running: "Researching...",
  complete: "Complete",
  error: "Failed",
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const question = searchParams.get("q") ?? ""
  const wsRef = useRef<WebSocket | null>(null)

  const { status, agents, report, errorMessage, handleEvent, reset } = useRunStore()

  useEffect(() => {
    reset()
    wsRef.current = createRunSocket(id, question, handleEvent)
    return () => wsRef.current?.close()
  }, [id, question]) // eslint-disable-line react-hooks/exhaustive-deps

  const agentList = Object.values(agents)

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <p className="text-sm text-white/40 uppercase tracking-widest mb-1">Chorus</p>
          <h1 className="text-2xl font-semibold">{question}</h1>
          <p className="text-sm text-white/40 mt-1">
            Run {id} · {STATUS_LABEL[status] ?? status}
          </p>
        </header>

        {agentList.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-widest text-white/40">Agents</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {agentList.map((agent) => (
                <AgentCard key={agent.agent_id} agent={agent} />
              ))}
            </div>
          </section>
        )}

        {report && (
          <section className="border-t border-emerald-500/30 pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Report</h2>
            <p className="text-white/60 text-sm italic">{report.tl_dr}</p>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>
                {report.key_findings
                  .map((f, i) => `**Finding ${i + 1}:** ${f.claim}\n\n${f.support}`)
                  .join("\n\n---\n\n")}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {status === "error" && (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-6 text-center space-y-4">
            <p className="text-red-400">{errorMessage}</p>
            <a
              href={`/?q=${encodeURIComponent(question)}`}
              className="text-sm text-white/50 hover:text-white underline"
            >
              Try again
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
