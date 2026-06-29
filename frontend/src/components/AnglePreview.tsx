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
  loading: boolean  // true while POST /sessions is in flight
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
        <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Your question</p>
        <p className="text-white/70 text-sm leading-relaxed italic">{question}</p>
      </div>

      {/* Angle cards */}
      <div className="space-y-3">
        <p className="text-xs text-white/30 uppercase tracking-widest">Research plan</p>
        {angles.map((angle, i) => (
          <motion.div
            key={angle.angle_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.07 }}
            className={`border rounded-xl px-5 py-4 flex gap-4 items-start ${ANGLE_COLORS[i] ?? "text-white/50 border-white/10 bg-white/3"}`}
          >
            {/* Index number */}
            <span className="font-mono text-xs opacity-40 pt-0.5 shrink-0 w-5">
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="space-y-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {angle.angle_id.replace(/_/g, " ")}
              </p>
              <p className="text-sm opacity-80 leading-relaxed">{angle.brief}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-xl px-4 py-2.5 transition-colors disabled:opacity-30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Different question
        </button>

        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-2 bg-white text-zinc-950 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors ml-auto"
        >
          {loading ? "Starting..." : (
            <>
              Start research
              <span className="text-zinc-500 font-normal">5 ◉</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
