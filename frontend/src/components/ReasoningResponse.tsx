"use client"

import { motion } from "framer-motion"
import type { ReasoningMessage } from "@/types/events"

// ReasoningMessage has `answer` (not `text`) — using the correct field name
export function ReasoningResponse({ message }: { message: ReasoningMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      <p
        className="font-mono text-[10px] tracking-widest uppercase"
        style={{ color: "var(--chorus-border)" }}
      >
        Chorus
      </p>
      <div
        className="rounded px-5 py-4"
        style={{
          background: "var(--chorus-surface)",
          border: "1px solid var(--chorus-border)",
          borderLeft: "3px solid var(--chorus-gold)",
        }}
      >
        <p
          className="leading-relaxed"
          style={{ color: "var(--chorus-text)", fontFamily: "var(--font-sans)" }}
        >
          {message.answer}
        </p>
      </div>
    </motion.div>
  )
}
