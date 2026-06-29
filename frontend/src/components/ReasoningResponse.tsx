"use client"

import { motion } from "framer-motion"
import type { ReasoningMessage } from "@/types/events"

// Chorus answered a follow-up by reasoning over existing findings
// — no new pipeline run, no agent cards. Just a direct answer.

interface ReasoningResponseProps {
  message: ReasoningMessage
}

export function ReasoningResponse({ message }: ReasoningResponseProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      {/* Cost label */}
      <p className="text-[10px] font-mono text-white/20">· reasoning · 1 ◉</p>

      {/* Answer bubble */}
      <div className="border border-white/8 rounded-2xl rounded-tl-sm px-5 py-4 bg-white/3 max-w-2xl">
        <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
          {message.answer}
        </p>
      </div>
    </motion.div>
  )
}
