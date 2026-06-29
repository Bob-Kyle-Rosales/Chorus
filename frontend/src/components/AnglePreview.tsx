"use client"

import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { AnglePlan } from "@/types/events"

// Color accent per angle slot — consistent visual identity across the app
const ANGLE_COLORS = [
  "text-blue-400 border-blue-500/20 bg-blue-500/5",
  "text-purple-400 border-purple-500/20 bg-purple-500/5",
  "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
]

interface AnglePreviewProps {
  question: string
  angles: AnglePlan[]
  onBack: () => void
  onConfirm: () => void
  loading: boolean // true while POST /sessions is in flight
}

export function AnglePreview({ question, angles, onBack, onConfirm, loading }: AnglePreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-2xl space-y-6"
    >
      {/* Question echo */}
      <div>
        <p className="mb-2 text-xs tracking-widest text-white/30 uppercase">Your question</p>
        <p className="text-sm leading-relaxed text-white/70 italic">{question}</p>
      </div>

      {/* Angle cards */}
      <div className="space-y-3">
        <p className="text-xs tracking-widest text-white/30 uppercase">Research plan</p>
        {angles.map((angle, i) => (
          <motion.div
            key={angle.angle_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.07 }}
            className={`flex items-start gap-4 rounded-xl border px-5 py-4 ${ANGLE_COLORS[i] ?? "border-white/10 bg-white/3 text-white/50"}`}
          >
            {/* Index number */}
            <span className="w-5 shrink-0 pt-0.5 font-mono text-xs opacity-40">
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold tracking-wide uppercase opacity-70">
                {angle.angle_id.replace(/_/g, " ")}
              </p>
              <p className="text-sm leading-relaxed opacity-80">{angle.brief}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/40 transition-colors hover:text-white/70 disabled:opacity-30"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Different question
        </button>

        <button
          onClick={onConfirm}
          disabled={loading}
          className="ml-auto flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-white/90 disabled:opacity-40"
        >
          {loading ? (
            "Starting..."
          ) : (
            <>
              Start research
              <span className="font-normal text-zinc-500">5 ◉</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
